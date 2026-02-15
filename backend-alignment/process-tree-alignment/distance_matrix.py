"""
Distance matrix loading and lookup functions.
"""

import json
import ast
from pathlib import Path
from typing import Dict, Optional, Tuple


class DistanceMatrix:
    """Handles distance matrix operations."""
    
    def __init__(self):
        self.matrix: Optional[Dict[int, Dict[int, float]]] = None
        self.variant_signatures: Optional[Dict[str, int]] = None
    
    def load(self, matrix_path: str) -> bool:
        """Load precomputed distance matrix from JSON file."""
        if not matrix_path or not Path(matrix_path).exists():
            print(f"Distance matrix not found: {matrix_path}")
            return False

        try:
            with open(matrix_path, 'r') as f:
                data = json.load(f)

            self.matrix = {}
            self.variant_signatures = {}

            if 'distance_matrix' in data:
                matrix_2d = data['distance_matrix']
                n = len(matrix_2d)

                for i in range(n):
                    self.matrix[i] = {}
                    for j in range(n):
                        self.matrix[i][j] = matrix_2d[i][j]

                print(f"Loaded distance matrix: {n}x{n} entries")

            if 'variant_names' in data:
                for idx, var in enumerate(data['variant_names']):
                    try:
                        if isinstance(var, str) and var.startswith('['):
                            activities = ast.literal_eval(var)
                            sig = ",".join(str(a) for a in activities)
                        elif isinstance(var, list):
                            sig = ",".join(str(a) for a in var)
                        else:
                            sig = str(var)

                        self.variant_signatures[sig] = idx

                    except Exception as e:
                        print(f"Error parsing variant {idx}: {e}")
                        continue

                print(f"Loaded {len(self.variant_signatures)} variant signatures")

            return True

        except Exception as e:
            print(f"Error loading distance matrix: {e}")
            import traceback
            traceback.print_exc()
            return False

    def get_distance(self, idx1: int, idx2: int) -> float:
        """Get distance between two variants by their matrix indices."""
        if self.matrix is None:
            return float('inf')

        if idx1 == idx2:
            return 0.0

        if idx1 in self.matrix and idx2 in self.matrix[idx1]:
            return self.matrix[idx1][idx2]

        return float('inf')

    def get_variant_index(self, signature: str) -> Optional[int]:
        """Get matrix index for a variant signature."""
        if self.variant_signatures is None:
            return None
        return self.variant_signatures.get(signature)

    def is_loaded(self) -> bool:
        """Check if distance matrix is loaded."""
        return self.matrix is not None


# Global instance for backward compatibility
_global_matrix = DistanceMatrix()


def load_distance_matrix(matrix_path: str) -> bool:
    """Load distance matrix (global function for compatibility)."""
    return _global_matrix.load(matrix_path)


def get_distance(idx1: int, idx2: int) -> float:
    """Get distance (global function for compatibility)."""
    return _global_matrix.get_distance(idx1, idx2)


def get_variant_matrix_index(signature: str) -> Optional[int]:
    """Get variant index (global function for compatibility)."""
    return _global_matrix.get_variant_index(signature)