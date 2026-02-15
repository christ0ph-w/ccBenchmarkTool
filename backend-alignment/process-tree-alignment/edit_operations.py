"""
Edit operations for warm start alignment transformation.

Computes Levenshtein distance (insertions/deletions only) and
transforms reference alignments to target traces.
"""

import copy
from typing import List, Tuple, Dict, Any

from process_tree_graph import ProcessTreeGraph
from process_tree_alignment_opt import insert_move, delete_move
from models import AlignmentSolution


def compute_edit_operations(
    reference: List[str],
    target: List[str]
) -> List[Tuple[str, int]]:
    """
    Compute edit operations to transform reference trace into target trace.
    Uses Levenshtein with insertions and deletions only (no substitution).
    
    Returns operations in order:
    - Deletions from back to front (so indices remain valid)
    - Then insertions from front to back
    
    Args:
        reference: List of activities in reference trace
        target: List of activities in target trace
    
    Returns:
        List of (operation, position) tuples
    """
    m, n = len(reference), len(target)

    # DP table: dp[i][j] = min cost to transform reference[:i] to target[:j]
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    # Base cases
    for i in range(m + 1):
        dp[i][0] = i  # Delete all from reference
    for j in range(n + 1):
        dp[0][j] = j  # Insert all from target

    # Fill DP table (no substitution - only insert or delete)
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if reference[i - 1] == target[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = min(
                    dp[i - 1][j] + 1,  # Delete from reference
                    dp[i][j - 1] + 1   # Insert from target
                )

    # Backtrack to find operations
    deletions = []
    insertions = []

    i, j = m, n
    while i > 0 or j > 0:
        if i > 0 and j > 0 and reference[i - 1] == target[j - 1]:
            i -= 1
            j -= 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            deletions.append(i - 1)
            i -= 1
        elif j > 0 and dp[i][j] == dp[i][j - 1] + 1:
            insertions.append(j - 1)
            j -= 1
        else:
            raise RuntimeError("Backtracking failed")

    # Sort: deletions back-to-front, insertions front-to-back
    deletions.sort(reverse=True)
    insertions.sort()

    operations = []
    for pos in deletions:
        operations.append(('delete', pos))
    for pos in insertions:
        operations.append(('insert', pos))

    return operations


def compute_levenshtein_distance(reference: List[str], target: List[str]) -> int:
    """
    Compute Levenshtein distance (insertions/deletions only).
    
    This is the same DP as compute_edit_operations but only returns the distance.
    Useful for runtime bounds computation when matrix is not available.
    """
    m, n = len(reference), len(target)

    # Optimize space: only need two rows
    prev = list(range(n + 1))
    curr = [0] * (n + 1)

    for i in range(1, m + 1):
        curr[0] = i
        for j in range(1, n + 1):
            if reference[i - 1] == target[j - 1]:
                curr[j] = prev[j - 1]
            else:
                curr[j] = min(prev[j], curr[j - 1]) + 1
        prev, curr = curr, prev

    return prev[n]


def transform_alignment_solution(
    process_tree_graph: ProcessTreeGraph,
    reference_solution: AlignmentSolution,
    target_activities: List[str]
) -> Tuple[List, List[Dict], List[Dict]]:
    """
    Transform a reference alignment solution to fit a target trace.
    
    Applies edit operations (insert_move/delete_move) to convert
    the reference alignment into a warm start for the target trace.
    
    Args:
        process_tree_graph: The process tree graph
        reference_solution: AlignmentSolution from reference trace
        target_activities: Activities in the target trace
    
    Returns:
        (sync_arcs, log_arcs, model_arcs) ready for warm start
    """
    operations = compute_edit_operations(
        reference_solution.activities,
        target_activities
    )

    # Deep copy the solution
    sync_arcs = copy.deepcopy(reference_solution.sync_arcs)
    log_arcs = copy.deepcopy(reference_solution.log_arcs)
    model_arcs = copy.deepcopy(reference_solution.model_arcs)

    # Apply operations in order
    for op, pos in operations:
        if op == 'delete':
            sync_arcs, log_arcs, model_arcs = delete_move(
                sync_arcs, log_arcs, model_arcs, pos
            )
        elif op == 'insert':
            sync_arcs, log_arcs, model_arcs = insert_move(
                process_tree_graph, sync_arcs, log_arcs, model_arcs, pos
            )

    # Verify lengths
    assert len(sync_arcs) == len(target_activities), \
        f"sync_arcs length {len(sync_arcs)} != target length {len(target_activities)}"
    assert len(log_arcs) == len(target_activities), \
        f"log_arcs length {len(log_arcs)} != target length {len(target_activities)}"
    assert len(model_arcs) == len(target_activities) + 1, \
        f"model_arcs length {len(model_arcs)} != target length + 1"

    return sync_arcs, log_arcs, model_arcs