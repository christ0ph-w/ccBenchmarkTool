"""
Bounds computation for alignment cost estimation.

Based on Theorems 4.5.1 and 4.5.2:
- Lower: max over all refs of max(0, c(ref) - d(ref, target))
- Upper: min over all refs of (c(ref) + d(ref, target))
"""

from typing import Dict, List, Tuple, Optional
from models import AlignmentConfig, BoundedSkipStrategy, GlobalBoundsSnapshot
from distance_matrix import get_distance


def compute_bounds(
    known_costs: Dict[int, float],
    matrix_idx: int
) -> Tuple[float, float]:
    """
    Compute lower and upper bounds for alignment cost.
    
    Args:
        known_costs: Dict mapping matrix_idx -> known alignment cost
        matrix_idx: Matrix index of target variant
    
    Returns:
        (lower_bound, upper_bound)
    """
    if not known_costs or matrix_idx is None:
        return 0.0, float('inf')

    lower_bound = 0.0
    upper_bound = float('inf')

    for known_matrix_idx, known_cost in known_costs.items():
        dist = get_distance(matrix_idx, known_matrix_idx)

        if dist == float('inf'):
            continue

        # Lower bound: max(0, c(ref) - d(ref, target))
        lb = max(0.0, known_cost - dist)
        lower_bound = max(lower_bound, lb)

        # Upper bound: c(ref) + d(ref, target)
        ub = known_cost + dist
        upper_bound = min(upper_bound, ub)

    return lower_bound, upper_bound


def should_skip_alignment(
    lower: float,
    upper: float,
    config: AlignmentConfig
) -> bool:
    """Determine if alignment can be skipped based on bounds."""
    if not config.use_bounds:
        return False

    if upper == float('inf'):
        return False

    gap = upper - lower
    return gap <= config.bound_threshold


def get_estimated_cost(
    lower: float,
    upper: float,
    strategy: BoundedSkipStrategy
) -> float:
    """Get estimated cost based on skip strategy."""
    if strategy == BoundedSkipStrategy.LOWER:
        return lower
    elif strategy == BoundedSkipStrategy.UPPER:
        return upper
    else:  # MIDPOINT
        return (lower + upper) / 2.0


def compute_global_bounds_snapshot(
    known_costs: Dict[int, float],
    remaining_matrix_indices: List[int],
    threshold: float
) -> Optional[GlobalBoundsSnapshot]:
    """
    Compute bounds for all remaining traces and summarize.
    
    Used for generating convergence visualization data.
    
    Args:
        known_costs: Dict mapping matrix_idx -> known alignment cost
        remaining_matrix_indices: Matrix indices of unprocessed variants
        threshold: Current skip threshold
    
    Returns:
        GlobalBoundsSnapshot or None if no valid bounds
    """
    if not remaining_matrix_indices or not known_costs:
        return None

    lower_bounds = []
    upper_bounds = []
    gaps = []
    skippable = 0

    for matrix_idx in remaining_matrix_indices:
        if matrix_idx is None:
            continue
            
        lb, ub = compute_bounds(known_costs, matrix_idx)
        
        if ub != float('inf'):
            lower_bounds.append(lb)
            upper_bounds.append(ub)
            gap = ub - lb
            gaps.append(gap)
            if gap <= threshold:
                skippable += 1

    if not gaps:
        return None

    return GlobalBoundsSnapshot(
        num_references=len(known_costs),
        num_remaining=len(remaining_matrix_indices),
        mean_lower_bound=sum(lower_bounds) / len(lower_bounds),
        mean_upper_bound=sum(upper_bounds) / len(upper_bounds),
        mean_gap=sum(gaps) / len(gaps),
        min_gap=min(gaps),
        max_gap=max(gaps),
        num_skippable=skippable
    )