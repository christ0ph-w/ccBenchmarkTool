"""
Base class for clustering algorithms.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import numpy as np


class BaseClusterer(ABC):
    
    @abstractmethod
    def fit(self, distance_matrix: np.ndarray, **kwargs):
        """Fit clustering to distance matrix."""
        pass
    
    @abstractmethod
    def get_labels(self) -> np.ndarray:
        """Get cluster labels."""
        pass
    
    def get_cluster_sizes(self) -> Dict[int, int]:
        labels = self.get_labels()
        unique, counts = np.unique(labels, return_counts=True)
        return dict(zip(unique. tolist(), counts.tolist()))
    
    def get_num_clusters(self) -> int:
        """Get number of clusters (excluding noise)."""
        labels = self.get_labels()
        unique = np.unique(labels)
        # Exclude noise label -1 if present
        if -1 in unique:
            return len(unique) - 1
        return len(unique)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'labels': self.get_labels(). tolist(),
            'cluster_sizes': self.get_cluster_sizes(),
            'num_clusters': self.get_num_clusters()
        }