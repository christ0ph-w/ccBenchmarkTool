import numpy as np
from typing import Dict, Any, Optional
from sklearn.cluster import AgglomerativeClustering
from .base import BaseClusterer


class HierarchicalClusterer(BaseClusterer):
    def __init__(self):
        self.model: Optional[AgglomerativeClustering] = None
        self.labels_: Optional[np.ndarray] = None
        self.params: Dict[str, Any] = {}
    
    def fit(self, distance_matrix: np.ndarray, **kwargs) -> 'HierarchicalClusterer':
        """
        Fit hierarchical clustering. 
        
        Args:
            distance_matrix: NxN precomputed distance matrix
            **kwargs:
                n_clusters: number of clusters (default 3)
                linkage: 'average', 'complete', 'ward', 'single' (default 'average')
                distance_threshold: if set, n_clusters is ignored
        
        Returns:
            self
        """
        params = {
            'n_clusters': kwargs.get('n_clusters', 3),
            'linkage': kwargs.get('linkage', 'average'),
            'distance_threshold': kwargs. get('distance_threshold', None)
        }
        
        self.params = params
        
        if params['distance_threshold'] is not None:
            self.model = AgglomerativeClustering(
                n_clusters=None,
                distance_threshold=params['distance_threshold'],
                metric='precomputed',
                linkage=params['linkage']
            )
        else:
            self.model = AgglomerativeClustering(
                n_clusters=params['n_clusters'],
                metric='precomputed',
                linkage=params['linkage']
            )
        
        self.labels_ = self. model.fit_predict(distance_matrix)
        return self
    
    def get_labels(self) -> np.ndarray:
        if self.labels_ is None:
            raise ValueError("Model not fitted yet")
        return self.labels_