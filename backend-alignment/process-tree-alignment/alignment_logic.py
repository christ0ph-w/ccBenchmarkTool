"""
Core alignment logic and orchestration.

Contains the main alignment loop, reference selection, and fitness computation.
"""

import time
from typing import Dict, List, Tuple, Optional

from models import (
    AlignmentConfig, AlignmentMethod, AlignmentSolution,
    AlignmentResultData, AlignmentStats, BoundsProgressionEntry,
    VariantData, GlobalBoundsSnapshot
)
from bounds import (
    compute_bounds, should_skip_alignment, get_estimated_cost,
    compute_global_bounds_snapshot
)
from edit_operations import transform_alignment_solution
from distance_matrix import get_variant_matrix_index
from process_tree_graph import ProcessTreeGraph
from process_tree_alignment_opt import align


def compute_fitness(cost: float, trace_length: int) -> float:
    """Compute fitness score from alignment cost."""
    if trace_length == 0:
        return 1.0

    denominator = trace_length + cost
    if denominator == 0:
        return 1.0

    return 1.0 - (cost / denominator)


def select_reference_traces(
    variants: List[VariantData],
    num_references: int = 1
) -> List[int]:
    """
    Select reference traces to align first (without warm start).
    
    Selects traces distributed across different lengths to provide
    good coverage for bounds computation.
    
    Args:
        variants: List of all variants
        num_references: Number of references to select
    
    Returns:
        List of variant indices to use as references
    """
    if len(variants) == 0:
        return []

    if num_references >= len(variants):
        return list(range(len(variants)))

    # Sort by trace length
    sorted_by_length = sorted(
        range(len(variants)),
        key=lambda i: len(variants[i].activities)
    )

    if num_references == 1:
        # Select median length trace
        return [sorted_by_length[len(sorted_by_length) // 2]]

    # Select traces distributed across lengths
    selected = []
    step = len(variants) // num_references
    for i in range(num_references):
        idx = min(i * step + step // 2, len(variants) - 1)
        selected.append(sorted_by_length[idx])

    return selected


def find_best_reference(
    variant: VariantData,
    known_solutions: Dict[int, AlignmentSolution]
) -> Optional[Tuple[int, float]]:
    """
    Find the best reference trace for warm starting.
    
    Args:
        variant: The target variant
        known_solutions: Dict mapping matrix_idx -> AlignmentSolution
    
    Returns:
        (matrix_idx, distance) of best reference, or None if no valid reference
    """
    from distance_matrix import get_distance
    
    if not known_solutions or variant.matrix_idx is None:
        return None

    best_ref_idx = None
    best_distance = float('inf')

    for ref_matrix_idx in known_solutions.keys():
        dist = get_distance(variant.matrix_idx, ref_matrix_idx)
        if dist < best_distance:
            best_distance = dist
            best_ref_idx = ref_matrix_idx

    if best_ref_idx is None or best_distance == float('inf'):
        return None

    return best_ref_idx, best_distance


def align_trace_full(
    trace,
    activities: List[str],
    process_tree_graph: ProcessTreeGraph
) -> Tuple[float, List, List[Dict], List[Dict]]:
    """
    Perform full alignment without warm start.
    
    Returns:
        (cost, sync_arcs, log_arcs, model_arcs)
    """
    cost, sync_arcs, log_arcs, model_arcs = align(trace, process_tree_graph)
    return cost, sync_arcs, log_arcs, model_arcs


def align_trace_warm_start(
    trace,
    activities: List[str],
    reference_solution: AlignmentSolution,
    process_tree_graph: ProcessTreeGraph
) -> Tuple[float, List, List[Dict], List[Dict]]:
    """
    Perform alignment with warm start from reference solution.
    
    Returns:
        (cost, sync_arcs, log_arcs, model_arcs)
    """
    # Transform reference alignment to fit target trace
    sync_arcs_init, log_arcs_init, model_arcs_init = transform_alignment_solution(
        process_tree_graph,
        reference_solution,
        activities
    )

    # Run alignment with warm start
    cost, sync_arcs, log_arcs, model_arcs = align(
        trace,
        process_tree_graph,
        sync_arcs=sync_arcs_init,
        log_arcs=log_arcs_init,
        model_arcs=model_arcs_init
    )

    return cost, sync_arcs, log_arcs, model_arcs


def align_variants(
    variants: List[VariantData],
    config: AlignmentConfig,
    process_tree_graph: ProcessTreeGraph,
    prior_costs: Optional[Dict[str, float]] = None,
    collect_global_snapshots: bool = False
) -> Tuple[List[AlignmentResultData], AlignmentStats, Dict[str, float], 
           List[BoundsProgressionEntry], List[GlobalBoundsSnapshot]]:
    """
    Align all variants with optimizations.
    
    Args:
        variants: List of variants to align
        config: Alignment configuration
        process_tree_graph: The process tree graph
        prior_costs: Costs from prior clusters (for cross-cluster optimization)
        collect_global_snapshots: If True, collect global bounds snapshots for visualization
    
    Returns:
        (results, stats, variant_costs, bounds_progression, global_snapshots)
    """
    stats = AlignmentStats(total_variants=len(variants))
    results: List[AlignmentResultData] = []
    bounds_progression: List[BoundsProgressionEntry] = []
    global_snapshots: List[GlobalBoundsSnapshot] = []

    # Known alignment costs (matrix_idx -> cost)
    known_costs: Dict[int, float] = {}

    # Known alignment solutions (matrix_idx -> AlignmentSolution)
    known_solutions: Dict[int, AlignmentSolution] = {}

    # Output: variant signature -> cost
    variant_costs: Dict[str, float] = {}

    if prior_costs is None:
        prior_costs = {}

    processed: set = set()

    # Resolve matrix indices for all variants
    valid_matrix_count = 0
    for variant in variants:
        variant.matrix_idx = get_variant_matrix_index(variant.signature)
        if variant.matrix_idx is not None:
            valid_matrix_count += 1

    print(f"Variants with valid matrix indices: {valid_matrix_count}/{len(variants)}")

    # Handle cached costs from prior clusters
    cached_count = 0
    for idx, variant in enumerate(variants):
        if variant.signature in prior_costs:
            cost = prior_costs[variant.signature]

            if variant.matrix_idx is not None:
                known_costs[variant.matrix_idx] = cost

            variant_costs[variant.signature] = cost
            fitness = compute_fitness(cost, len(variant.activities))

            results.append(AlignmentResultData(
                variant_index=idx,
                signature=variant.signature,
                cost=cost,
                fitness=fitness,
                trace_length=len(variant.activities),
                trace_count=variant.trace_count,
                method=AlignmentMethod.CACHED,
                alignment_time_ms=0.0,
                lower_bound=cost,
                upper_bound=cost
            ))

            bounds_progression.append(BoundsProgressionEntry(
                variant_index=idx,
                num_references=len(known_costs),
                lower_bound=cost,
                upper_bound=cost,
                gap=0.0,
                estimated_cost=None,
                actual_cost=cost,
                method=AlignmentMethod.CACHED
            ))

            stats.cached_alignments += 1
            processed.add(idx)
            cached_count += 1

    if cached_count > 0:
        print(f"Used {cached_count} cached costs from prior clusters")

    # Select and align reference traces first (no warm start)
    remaining_indices = [i for i in range(len(variants)) if i not in processed]

    if remaining_indices:
        remaining_variants = [variants[i] for i in remaining_indices]
        local_ref_indices = select_reference_traces(remaining_variants, num_references=1)
        reference_indices = [remaining_indices[i] for i in local_ref_indices]

        for ref_idx in reference_indices:
            variant = variants[ref_idx]

            align_start = time.time()
            cost, sync_arcs, log_arcs, model_arcs = align_trace_full(
                variant.trace,
                variant.activities,
                process_tree_graph
            )
            align_time = (time.time() - align_start) * 1000

            # Store solution for warm starting
            if variant.matrix_idx is not None:
                known_costs[variant.matrix_idx] = cost
                known_solutions[variant.matrix_idx] = AlignmentSolution(
                    cost=cost,
                    sync_arcs=sync_arcs,
                    log_arcs=log_arcs,
                    model_arcs=model_arcs,
                    activities=variant.activities
                )

            variant_costs[variant.signature] = cost
            fitness = compute_fitness(cost, len(variant.activities))

            results.append(AlignmentResultData(
                variant_index=ref_idx,
                signature=variant.signature,
                cost=cost,
                fitness=fitness,
                trace_length=len(variant.activities),
                trace_count=variant.trace_count,
                method=AlignmentMethod.FULL,
                alignment_time_ms=align_time,
                lower_bound=cost,
                upper_bound=cost
            ))

            bounds_progression.append(BoundsProgressionEntry(
                variant_index=ref_idx,
                num_references=0,
                lower_bound=0.0,
                upper_bound=None,
                gap=None,
                estimated_cost=None,
                actual_cost=cost,
                method=AlignmentMethod.FULL
            ))

            stats.full_alignments += 1
            stats.alignment_time_ms += align_time
            processed.add(ref_idx)

            # Collect global snapshot after reference alignment
            if collect_global_snapshots:
                remaining_matrix_indices = [
                    variants[i].matrix_idx for i in range(len(variants))
                    if i not in processed and variants[i].matrix_idx is not None
                ]
                snapshot = compute_global_bounds_snapshot(
                    known_costs, remaining_matrix_indices, config.bound_threshold
                )
                if snapshot:
                    global_snapshots.append(snapshot)

    # Process remaining variants
    remaining = [i for i in range(len(variants)) if i not in processed]

    for idx in remaining:
        variant = variants[idx]
        var_start = time.time()

        # Compute bounds
        lower, upper = 0.0, float('inf')
        if variant.matrix_idx is not None and known_costs:
            lower, upper = compute_bounds(known_costs, variant.matrix_idx)

        gap = (upper - lower) if upper != float('inf') else None

        # Check if we can skip alignment
        if should_skip_alignment(lower, upper, config):
            estimated_cost = get_estimated_cost(lower, upper, config.bounded_skip_strategy)

            if variant.matrix_idx is not None:
                known_costs[variant.matrix_idx] = estimated_cost

            variant_costs[variant.signature] = estimated_cost
            fitness = compute_fitness(estimated_cost, len(variant.activities))
            align_time = (time.time() - var_start) * 1000

            results.append(AlignmentResultData(
                variant_index=idx,
                signature=variant.signature,
                cost=estimated_cost,
                fitness=fitness,
                trace_length=len(variant.activities),
                trace_count=variant.trace_count,
                method=AlignmentMethod.BOUNDED_SKIP,
                alignment_time_ms=align_time,
                lower_bound=lower,
                upper_bound=upper
            ))

            bounds_progression.append(BoundsProgressionEntry(
                variant_index=idx,
                num_references=len(known_costs) - 1,
                lower_bound=lower,
                upper_bound=upper,
                gap=gap,
                estimated_cost=estimated_cost,
                actual_cost=None,
                method=AlignmentMethod.BOUNDED_SKIP
            ))

            stats.bounded_skips += 1
            continue

        # Check for warm start opportunity
        best_ref = find_best_reference(variant, known_solutions)

        if config.use_warm_start and best_ref is not None:
            ref_matrix_idx, ref_distance = best_ref
            reference_solution = known_solutions[ref_matrix_idx]

            try:
                cost, sync_arcs, log_arcs, model_arcs = align_trace_warm_start(
                    variant.trace,
                    variant.activities,
                    reference_solution,
                    process_tree_graph
                )
                method = AlignmentMethod.WARM_START
                stats.warm_start_alignments += 1
            except Exception as e:
                print(f"Warm start failed for variant {idx}, falling back to full: {e}")
                cost, sync_arcs, log_arcs, model_arcs = align_trace_full(
                    variant.trace,
                    variant.activities,
                    process_tree_graph
                )
                method = AlignmentMethod.FULL
                stats.full_alignments += 1
        else:
            # Full alignment
            cost, sync_arcs, log_arcs, model_arcs = align_trace_full(
                variant.trace,
                variant.activities,
                process_tree_graph
            )
            method = AlignmentMethod.FULL
            stats.full_alignments += 1

        align_time = (time.time() - var_start) * 1000

        # Store solution for future warm starts
        if variant.matrix_idx is not None:
            known_costs[variant.matrix_idx] = cost
            known_solutions[variant.matrix_idx] = AlignmentSolution(
                cost=cost,
                sync_arcs=sync_arcs,
                log_arcs=log_arcs,
                model_arcs=model_arcs,
                activities=variant.activities
            )

        variant_costs[variant.signature] = cost
        fitness = compute_fitness(cost, len(variant.activities))

        results.append(AlignmentResultData(
            variant_index=idx,
            signature=variant.signature,
            cost=cost,
            fitness=fitness,
            trace_length=len(variant.activities),
            trace_count=variant.trace_count,
            method=method,
            alignment_time_ms=align_time,
            lower_bound=lower if lower > 0 else cost,
            upper_bound=upper if upper != float('inf') else cost
        ))

        bounds_progression.append(BoundsProgressionEntry(
            variant_index=idx,
            num_references=len(known_costs) - 1,
            lower_bound=lower,
            upper_bound=upper if upper != float('inf') else None,
            gap=gap,
            estimated_cost=None,
            actual_cost=cost,
            method=method
        ))

        stats.alignment_time_ms += align_time

        # Collect global snapshot after this alignment
        if collect_global_snapshots:
            remaining_matrix_indices = [
                variants[i].matrix_idx for i in range(len(variants))
                if i not in processed and variants[i].matrix_idx is not None
                and i != idx  # Exclude the one we just processed
            ]
            snapshot = compute_global_bounds_snapshot(
                known_costs, remaining_matrix_indices, config.bound_threshold
            )
            if snapshot:
                global_snapshots.append(snapshot)

        processed.add(idx)

    return results, stats, variant_costs, bounds_progression, global_snapshots