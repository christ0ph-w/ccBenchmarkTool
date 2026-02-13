"""
Extract trace variants from XES files using rustxes. 
"""
import polars as pl
import rustxes
from typing import Dict, List, Any


def extract_variants(xes_path: str) -> Dict[str, Any]:
    """
    Extract trace variants from XES file with frequency tracking.
    
    Args:
        xes_path: str - path to XES file
        
    Returns:
        dict with keys:
        - 'variants': List[List[str]] - unique activity sequences
        - 'frequencies': List[int] - how many traces follow each variant
        - 'variant_to_case_ids': Dict[int, List[str]] - maps variant_idx → case_ids
        - 'activities': List[str] - all unique activities (sorted)
        - 'case_ids': List[str] - all case IDs in order
        - 'total_traces': int - total number of traces
        - 'xes_df': pl.DataFrame - original DataFrame
        - 'log_attrs': dict - XES metadata
    """
    xes_df, log_attrs = rustxes. import_xes(xes_path)
    
    traces = []
    case_ids = []
    all_activities = set()

    grouped = xes_df.group_by('case:concept:name', maintain_order=True)
    
    for case_id, group_df in grouped:
        case_id_str = case_id[0] if isinstance(case_id, tuple) else str(case_id)
        
        group_sorted = group_df.sort('time:timestamp')
        activities = group_sorted['concept:name'].to_list()
        
        traces.append(activities)
        case_ids.append(case_id_str)
        all_activities.update(activities)
    
    trace_tuples = [tuple(t) for t in traces]
    variant_dict: Dict[tuple, List[int]] = {}
    
    for trace_idx, trace_tuple in enumerate(trace_tuples):
        if trace_tuple not in variant_dict:
            variant_dict[trace_tuple] = []
        variant_dict[trace_tuple].append(trace_idx)
    
    sorted_variants = sorted(
        variant_dict.items(),
        key=lambda x: min(x[1])
    )
    
    variants = [list(v) for v, _ in sorted_variants]
    frequencies = [len(trace_indices) for _, trace_indices in sorted_variants] 
    
    variant_to_case_ids = {}
    for variant_idx, (_, trace_indices) in enumerate(sorted_variants):
        variant_to_case_ids[variant_idx] = [case_ids[idx] for idx in trace_indices]
    
    return {
        'variants': variants,
        'frequencies': frequencies,
        'variant_to_case_ids': variant_to_case_ids,
        'activities': sorted(list(all_activities)),
        'case_ids': case_ids,
        'total_traces': len(traces),
        'xes_df': xes_df,
        'log_attrs': log_attrs
    }