"""
Data models for the alignment server.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Optional, Any


class AlignmentMethod(Enum):
    FULL = "full"
    WARM_START = "warm_start"
    BOUNDED_SKIP = "bounded_skip"
    CACHED = "cached"


class BoundedSkipStrategy(Enum):
    LOWER = "lower"
    MIDPOINT = "midpoint"
    UPPER = "upper"


@dataclass
class AlignmentConfig:
    use_bounds: bool = True
    use_warm_start: bool = True
    bound_threshold: float = 1.0
    bounded_skip_strategy: BoundedSkipStrategy = BoundedSkipStrategy.UPPER


@dataclass
class VariantData:
    index: int
    activities: List[str]
    trace: object  # pm4py Trace
    trace_count: int
    signature: str
    matrix_idx: Optional[int] = None


@dataclass
class AlignmentSolution:
    """Stores alignment solution for warm starting other traces."""
    cost: float
    sync_arcs: List[Any]
    log_arcs: List[Dict]
    model_arcs: List[Dict]
    activities: List[str]


@dataclass
class BoundsProgressionEntry:
    """Tracks bounds tightening for analysis."""
    variant_index: int
    num_references: int
    lower_bound: float
    upper_bound: Optional[float]
    gap: Optional[float]
    estimated_cost: Optional[float]
    actual_cost: Optional[float]
    method: AlignmentMethod


@dataclass
class AlignmentResultData:
    variant_index: int
    signature: str
    cost: float
    fitness: float
    trace_length: int
    trace_count: int
    method: AlignmentMethod
    alignment_time_ms: float
    lower_bound: float = 0.0
    upper_bound: float = float('inf')


@dataclass
class AlignmentStats:
    full_alignments: int = 0
    warm_start_alignments: int = 0
    bounded_skips: int = 0
    cached_alignments: int = 0
    total_variants: int = 0
    parse_time_ms: float = 0.0
    alignment_time_ms: float = 0.0
    total_time_ms: float = 0.0


@dataclass
class GlobalBoundsSnapshot:
    """Snapshot of bounds for all remaining traces at a point in time."""
    num_references: int
    num_remaining: int
    mean_lower_bound: float
    mean_upper_bound: float
    mean_gap: float
    min_gap: float
    max_gap: float
    num_skippable: int