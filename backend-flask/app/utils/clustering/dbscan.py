import numpy as np
from typing import Dict, Any, Optional
from sklearn.cluster import DBSCAN
from .base import BaseClusterer


class DBSCANClusterer(BaseClusterer):
    def __init__(self):
        self.model: Optional[DBSCAN] = None
        self.labels_: Optional[np.ndarray] = None
        self.params: Dict[str, Any] = {}
    
    def fit(self, distance_matrix: np.ndarray, **kwargs) -> 'DBSCANClusterer':
        """
        Fit DBSCAN clustering.
        
        Args:
            distance_matrix: NxN precomputed distance matrix
            **kwargs:
                eps: maximum distance between samples (default 0.5)
                min_samples: minimum samples in neighborhood (default 5)
        
        Returns:
            self
        """
        params = {
            'eps': kwargs.get('eps', 0.5),
            'min_samples': kwargs.get('min_samples', 5)
        }
        
        self.params = params
        
        self.model = DBSCAN(
            eps=params['eps'],
            min_samples=params['min_samples'],
            metric='precomputed'
        )
        
        self.labels_ = self. model.fit_predict(distance_matrix)
        return self
    
    def get_labels(self) -> np.ndarray:
        """Get cluster labels for each variant (including -1 for noise)."""
        if self.labels_ is None:
            raise ValueError("Model not fitted yet")
        return self.labels_