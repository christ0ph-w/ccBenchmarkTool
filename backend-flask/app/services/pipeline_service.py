"""
Clustering pipeline orchestrator.
"""
from typing import Dict, Any, Optional
import numpy as np
from pathlib import Path
import logging

from app.utils.extraction import extract_variants
from app.utils.encoding import ActivityEncoder
from app.utils.distance import DistanceMatrix
from app.utils.clustering import CLUSTERERS
from app.utils.exporting import XESExporter

logger = logging.getLogger(__name__)

class ClusteringPipeline:
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self. extraction_result: Optional[Dict[str, Any]] = None
        self.encoder: Optional[ActivityEncoder] = None
        self.distance_matrix: Optional[np.ndarray] = None
        self.clustering_result: Optional[Dict[str, Any]] = None
       
    
    def run(
        self,
        xes_file_path: str,
        algorithm: str = 'hierarchical',
        algorithm_params: Optional[Dict[str, Any]] = None,
        output_dir: Optional[str] = None,
        log_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Run the full clustering pipeline.
        
        Args:
            xes_file_path: Path to XES file
            algorithm: 'hierarchical' or 'dbscan'
            algorithm_params: Parameters for the clustering algorithm
            output_dir: Directory to export clusters (if None, no export)
        
        Returns:
            Clustering result dictionary
        """
        logger.info("Starting pipeline...")

        if algorithm_params is None:
            algorithm_params = {}
        
        try:
            #Extract variants
            logger.info("Extracting variants from XES...")
            self.extraction_result = extract_variants(xes_file_path)
            logger.info("Extracted %d traces, %d unique variants",
                        self.extraction_result['total_traces'],
                        len(self.extraction_result['variants']))
            
            #Encode activities
            logger.info("Encoding activities...")
            self.encoder = ActivityEncoder(auto_fit=True)
            self.encoder.fit(self.extraction_result['activities'])
            logger.info("Encoded %d unique activities", len(self.encoder))
            
            #Compute distance matrix
            logger.info("Computing Levenshtein distance matrix...")
            distance_calc = DistanceMatrix(verbose=self.verbose)
            self.distance_matrix = distance_calc.compute(
                self.extraction_result['variants'],
                input_type='activities',
                encoder=self.encoder
            )
            logger.info("Distance matrix shape: %s", self.distance_matrix.shape)
            
            #Cluster
            logger.info("Running %s clustering...", algorithm)
            
            if algorithm not in CLUSTERERS:
                raise ValueError(f"Unknown algorithm: {algorithm}. Available: {list(CLUSTERERS.keys())}")

            clusterer = CLUSTERERS[algorithm]()
            
            clusterer.fit(self.distance_matrix, **algorithm_params)
            labels = clusterer.get_labels()
            
            
            num_clusters = clusterer.get_num_clusters()
            cluster_sizes = clusterer.get_cluster_sizes()
            logger.info("Clustering complete: %d clusters", num_clusters)
            logger.debug("Cluster sizes: %s", cluster_sizes)
            
            self.clustering_result = {
                'labels': labels,
                'frequencies': self.extraction_result['frequencies'],
                'variant_to_case_ids': self.extraction_result['variant_to_case_ids'],
                'unique_variants': self.extraction_result['variants'],
                'extraction_result': self.extraction_result,
                'algorithm': algorithm,
                'algorithm_params': algorithm_params,
                'cluster_sizes': clusterer.get_cluster_sizes(),
                'num_clusters': clusterer.get_num_clusters(),
                'distance_matrix': self.distance_matrix. tolist()  # For response
            }
            
            #Export
            if output_dir:
                logger.info("Exporting clusters to %s...", output_dir)
                exporter = XESExporter(verbose=self.verbose)
                exported_files = exporter.export_clusters(
                    self.clustering_result,
                    output_dir,
                    algorithm=algorithm,
                    algorithm_params=algorithm_params,
                    log_name=log_name
                )
                self.clustering_result['exported_files'] = exported_files
            
            logger.info("Pipeline complete")
            
            return self.clustering_result
        
        except Exception as e:
            logger.error("Pipeline error: %s", str(e), exc_info=True)
            raise
    
    def get_clustering_result(self) -> Optional[Dict[str, Any]]:
        return self. clustering_result