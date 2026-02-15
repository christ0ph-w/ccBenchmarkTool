"""
Process Tree Alignment Server - Flask HTTP API

This is the main entry point for the alignment service.
All heavy logic is delegated to alignment_logic.py and supporting modules.
"""

from flask import Flask, request, jsonify
import argparse
import time
import os
from pathlib import Path
from typing import Optional

import pm4py
from pm4py.objects.log.importer.xes import importer as xes_importer
from pm4py.statistics.variants.log import get as get_variants

# Local imports
from process_tree_graph import ProcessTreeGraph
from models import AlignmentConfig, BoundedSkipStrategy, VariantData
from distance_matrix import load_distance_matrix
from alignment_logic import align_variants, compute_fitness

# Suppress Flask warnings
os.environ['FLASK_ENV'] = 'production'
os.environ['GRB_LOGFILE'] = ''
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)


# ============================================
# GLOBAL STATE
# ============================================

process_tree = None
process_tree_graph: Optional[ProcessTreeGraph] = None


# ============================================
# FLASK ENDPOINTS
# ============================================

@app.route('/load-model', methods=['POST'])
def load_model():
    """Load process tree model and build graph for Gurobi."""
    global process_tree, process_tree_graph

    data = request.json
    model_path = data.get('model_path')

    if not model_path:
        return jsonify({"error": "model_path required"}), 400

    try:
        print(f"Loading model: {model_path}")
        process_tree = pm4py.read_ptml(model_path)
        process_tree_graph = ProcessTreeGraph(process_tree)
        print(f"Model loaded: {process_tree_graph.number_of_nodes()} nodes, "
              f"{process_tree_graph.number_of_edges()} edges")
        return jsonify({
            "status": "success",
            "message": "Model loaded",
            "nodes": process_tree_graph.number_of_nodes(),
            "edges": process_tree_graph.number_of_edges()
        })
    except Exception as e:
        print(f"Error loading model: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/align', methods=['POST'])
def align_log():
    """Align a log file against the loaded model."""
    global process_tree, process_tree_graph

    if process_tree is None or process_tree_graph is None:
        return jsonify({"error": "No model loaded. Call /load-model first"}), 400

    total_start = time.time()

    data = request.json
    log_path = data.get('log_path')
    matrix_path = data.get('distance_matrix_path')

    if not log_path:
        return jsonify({"error": "log_path required"}), 400

    # Parse configuration
    config = _parse_config(data)
    prior_costs = data.get('prior_costs', {})
    collect_snapshots = data.get('collect_global_snapshots', False)

    try:
        # Load distance matrix if provided
        if matrix_path:
            load_distance_matrix(matrix_path)

        # Parse log
        parse_start = time.time()
        log = xes_importer.apply(log_path)
        parse_time = (time.time() - parse_start) * 1000

        # Group by variant
        variants = _extract_variants(log)

        print(f"Aligning {len(variants)} variants from {Path(log_path).name}")
        print(f"Config: bounds={config.use_bounds}, warm_start={config.use_warm_start}, "
              f"threshold={config.bound_threshold}, strategy={config.bounded_skip_strategy.value}")

        # Align
        results, stats, variant_costs, bounds_progression, global_snapshots = align_variants(
            variants, config, process_tree_graph, prior_costs, collect_snapshots
        )

        stats.parse_time_ms = parse_time
        stats.total_time_ms = (time.time() - total_start) * 1000

        # Build response
        response = _build_response(
            results, stats, variants, variant_costs, 
            bounds_progression, global_snapshots
        )

        return jsonify(response)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    from distance_matrix import _global_matrix
    return jsonify({
        "status": "healthy",
        "model_loaded": process_tree is not None,
        "graph_built": process_tree_graph is not None,
        "distance_matrix_loaded": _global_matrix.is_loaded()
    })


@app.route('/shutdown', methods=['POST'])
def shutdown():
    """Graceful shutdown endpoint."""
    print("Shutdown requested")
    import threading
    threading.Thread(target=lambda: os._exit(0)).start()
    return jsonify({"status": "shutting down"})


# ============================================
# HELPER FUNCTIONS
# ============================================

def _parse_config(data: dict) -> AlignmentConfig:
    """Parse alignment configuration from request data."""
    bounded_skip_strategy_str = data.get('bounded_skip_strategy', 'upper')
    try:
        bounded_skip_strategy = BoundedSkipStrategy(bounded_skip_strategy_str)
    except ValueError:
        bounded_skip_strategy = BoundedSkipStrategy.UPPER

    return AlignmentConfig(
        use_bounds=data.get('use_bounds', True),
        use_warm_start=data.get('use_warm_start', True),
        bound_threshold=data.get('bound_threshold', 1.0),
        bounded_skip_strategy=bounded_skip_strategy
    )


def _extract_variants(log) -> list:
    """Extract variants from a pm4py log."""
    variants_dict = get_variants.get_variants(log)
    variants = []

    for idx, (variant_tuple, traces) in enumerate(variants_dict.items()):
        if isinstance(variant_tuple, tuple):
            activities = list(variant_tuple)
        else:
            activities = [variant_tuple]

        signature = ",".join(str(a) for a in activities)

        variants.append(VariantData(
            index=idx,
            activities=activities,
            trace=traces[0],
            trace_count=len(traces),
            signature=signature
        ))

    return variants


def _build_response(results, stats, variants, variant_costs, 
                    bounds_progression, global_snapshots) -> dict:
    """Build JSON response from alignment results."""
    # Compute aggregates
    total_traces = sum(r.trace_count for r in results)
    weighted_fitness = sum(r.fitness * r.trace_count for r in results)
    weighted_cost = sum(r.cost * r.trace_count for r in results)

    avg_fitness = weighted_fitness / total_traces if total_traces > 0 else 0
    avg_cost = weighted_cost / total_traces if total_traces > 0 else 0

    print(f"Completed: {len(results)} variants, avg_fitness={avg_fitness:.4f}, avg_cost={avg_cost:.4f}")
    print(f"Stats: full={stats.full_alignments}, warm={stats.warm_start_alignments}, "
          f"skipped={stats.bounded_skips}, cached={stats.cached_alignments}")

    response = {
        "avg_fitness": round(avg_fitness, 6),
        "avg_cost": round(avg_cost, 6),
        "successful_alignments": len(results),
        "failed_alignments": 0,
        "total_traces": total_traces,
        "total_variants": len(variants),
        "timing": {
            "parse_time_ms": round(stats.parse_time_ms, 2),
            "total_alignment_time_ms": round(stats.alignment_time_ms, 2),
            "total_time_ms": round(stats.total_time_ms, 2)
        },
        "optimization_stats": {
            "full_alignments": stats.full_alignments,
            "warm_start_alignments": stats.warm_start_alignments,
            "bounded_skips": stats.bounded_skips,
            "cached_alignments": stats.cached_alignments
        },
        "alignments": [
            {
                "variant_name": variants[r.variant_index].activities,
                "alignment_cost": round(r.cost, 6),
                "fitness": round(r.fitness, 6),
                "trace_length": r.trace_length,
                "trace_count": r.trace_count,
                "alignment_time_ms": round(r.alignment_time_ms, 2),
                "method": r.method.value,
                "lower_bound": round(r.lower_bound, 2),
                "upper_bound": round(r.upper_bound, 2) if r.upper_bound != float('inf') else None
            }
            for r in results
        ],
        "bounds_progression": [
            {
                "variant_index": bp.variant_index,
                "num_references": bp.num_references,
                "lower_bound": round(bp.lower_bound, 4),
                "upper_bound": round(bp.upper_bound, 4) if bp.upper_bound is not None else None,
                "gap": round(bp.gap, 4) if bp.gap is not None else None,
                "estimated_cost": round(bp.estimated_cost, 4) if bp.estimated_cost is not None else None,
                "actual_cost": round(bp.actual_cost, 4) if bp.actual_cost is not None else None,
                "method": bp.method.value
            }
            for bp in bounds_progression
        ],
        "variant_costs": variant_costs
    }

    # Add global snapshots if collected
    if global_snapshots:
        response["global_bounds_progression"] = [
            {
                "num_references": gs.num_references,
                "num_remaining": gs.num_remaining,
                "mean_lower_bound": round(gs.mean_lower_bound, 4),
                "mean_upper_bound": round(gs.mean_upper_bound, 4),
                "mean_gap": round(gs.mean_gap, 4),
                "min_gap": round(gs.min_gap, 4),
                "max_gap": round(gs.max_gap, 4),
                "num_skippable": gs.num_skippable
            }
            for gs in global_snapshots
        ]

    return response


# ============================================
# MAIN
# ============================================

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Process Tree Alignment Server')
    parser.add_argument('--port', type=int, default=5001, help='Port to run server on')
    parser.add_argument('--host', type=str, default='127.0.0.1', help='Host to bind to')
    args = parser.parse_args()

    print(f"Starting alignment server on {args.host}:{args.port}")
    print("Using Gurobi-based alignment with warm start support")
    app.run(host=args.host, port=args.port, debug=False, threaded=True, use_reloader=False)