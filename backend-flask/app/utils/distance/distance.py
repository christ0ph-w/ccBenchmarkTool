from typing import List, Optional, Sequence
import numpy as np
from tqdm import tqdm
import Levenshtein

import logging

logger = logging.getLogger(__name__)

class DistanceMatrix:
    def __init__(self, verbose: bool = True):
        self.matrix: Optional[np.ndarray] = None
        self.variants: Optional[List[str]] = None
        self.verbose = verbose

    def compute(
        self,
        variants: Sequence,
        *,
        input_type: str = "unicode",
        encoder=None
    ) -> np.ndarray:
        """
        Compute full symmetric distance matrix.

        Args:
            variants: list of items determined by input_type:
                      - 'unicode': List[str] where each str must be one-char-per-event.
                      - 'ids': List[List[int]] sequences of ids (one id per event).
                      - 'activities': List[List[str]] raw activity names (one name per event).
            input_type: 'unicode'|'ids'|'activities'
            encoder: required for input_type in ('ids', 'activities'). Must implement:
                     - ids_to_unicode_string(ids: List[int]) -> str
                     - encode_sequence_ids(seq: List[str]) -> List[int]   (only for 'activities')
        Returns:
            NxN numpy float32 symmetric distance matrix (raw integer distances).
        """
        if input_type not in ("unicode", "ids", "activities"):
            raise ValueError("input_type must be 'unicode', 'ids', or 'activities'")

        if input_type in ("ids", "activities") and encoder is None:
            raise ValueError("encoder is required for input_type 'ids' or 'activities'")

        logger.info("Preparing %d traces (input_type=%s)...", len(variants), input_type)

        if input_type == "unicode":
            uni_variants: List[str] = [str(v) for v in variants]
        elif input_type == "ids":
            uni_variants = [encoder.ids_to_unicode_string(list(v)) for v in variants]
        else:
            uni_variants = []
            for seq in variants:
                ids = encoder.encode_sequence_ids(list(seq))
                uni_variants.append(encoder.ids_to_unicode_string(ids))

        # store variants (unicode strings)
        self.variants = uni_variants

        n = len(uni_variants)
        logger.info("Computing Levenshtein distance matrix for %d variants...", n)

        self.matrix = np.zeros((n, n), dtype=np.float32)

        iterator = tqdm(range(n), desc="Computing distances") if self.verbose else range(n)

        for i in iterator:
            self.matrix[i, i] = 0.0
            si = uni_variants[i]
            for j in range(i + 1, n):
                sj = uni_variants[j]
                d = Levenshtein.distance(si, sj)
                self.matrix[i, j] = d
                self.matrix[j, i] = d

        logger.info("Distance matrix shape: %s", self.matrix.shape)

        return self.matrix

    def get_submatrix(self, indices: List[int]) -> np.ndarray:
        if self.matrix is None:
            raise ValueError("Compute matrix first")
        return self.matrix[np.ix_(indices, indices)]

    def save(self, path: str):
        if self.matrix is None:
            raise ValueError("No matrix computed")
        np.save(path, self.matrix)

    def load(self, path: str):
        self.matrix = np.load(path)

    def to_json_serializable(self) -> List[List[float]]:
        if self.matrix is None:
            raise ValueError("No matrix computed")
        return self.matrix.tolist()