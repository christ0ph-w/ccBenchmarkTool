"""
Activity encoding for Levenshtein distance computation
"""
from typing import Dict, List, Iterable


class ActivityEncoder:
    def __init__(self, auto_fit: bool = True, unicode_base: int = 0xE000):
        """
        Args:
            auto_fit: when True, unseen activities are added automatically.
                      When False, unknown activity raises KeyError.
            unicode_base: starting codepoint for mapping ids -> unicode characters.
                          Default is U+E000 (Private Use Area). Must ensure
                          unicode_base + max_id <= 0x10FFFF.
        """
        self.activity_to_idx: Dict[str, int] = {}
        self.idx_to_activity: Dict[int, str] = {}
        self.next_index = 0
        self.auto_fit = auto_fit
        self.unicode_base = unicode_base

    def fit(self, activities: Iterable[str]) -> "ActivityEncoder":
        for a in activities:
            if a not in self.activity_to_idx:
                idx = self.next_index
                self.activity_to_idx[a] = idx
                self.idx_to_activity[idx] = a
                self.next_index += 1
        return self

    def encode_id(self, activity: str) -> int:
        if activity not in self.activity_to_idx:
            if not self.auto_fit:
                raise KeyError(f"Unknown activity '{activity}' (auto_fit=False).")
            idx = self.next_index
            self.activity_to_idx[activity] = idx
            self.idx_to_activity[idx] = activity
            self.next_index += 1
        return self.activity_to_idx[activity]

    def encode_sequence_ids(self, sequence: Iterable[str]) -> List[int]:
        return [self.encode_id(a) for a in sequence]

    def ids_to_unicode_string(self, ids: List[int]) -> str:
        """ Convert integer ids to unicode string (one character per id)."""
        if not ids:
            return ""
        max_id = max(ids)
        last_cp = self.unicode_base + max_id
        if last_cp > 0x10FFFF:
            raise ValueError(
                f"Not enough Unicode code points: base {hex(self.unicode_base)} + max_id {max_id} "
                f"exceeds 0x10FFFF. Choose a different strategy for large activity sets."
            )
        return ''.join(chr(self.unicode_base + idx) for idx in ids)

    def get_mapping(self) -> Dict[str, int]:
        """Return activity -> id mapping (shallow copy)."""
        return dict(self.activity_to_idx)

    def decode_id(self, idx: int) -> str:
        return self.idx_to_activity[idx]

    def __len__(self) -> int:
        return self.next_index

    def __repr__(self) -> str:
        return f"ActivityEncoder({len(self)} activities, auto_fit={self.auto_fit})"