"""
Export clustered traces as XES files 
"""
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
import polars as pl
import rustxes

import logging
logger = logging.getLogger(__name__)


class XESExporter:
    def __init__(self):
        pass

    def _build_param_suffix(self, algorithm: str, params:  Dict[str, Any]) -> str:
        if algorithm == 'hierarchical': 
            linkage = params.get('linkage', 'average')
            if params. get('distance_threshold') is not None:
                return f"{linkage}_{params['distance_threshold']}"
            else: 
                n_clusters = params.get('n_clusters', 3)
                return f"{linkage}_{n_clusters}"
        
        elif algorithm == 'dbscan':
            eps = params.get('eps', 0.5)
            min_samples = params.get('min_samples', 5)
            return f"{eps}_{min_samples}"
        
        else:
            return "default"

    
    def export_clusters(
        self,
        clustering_result: Dict[str, Any],
        output_dir: str,
        algorithm: str = 'hierarchical',
        algorithm_params:  Dict[str, Any] = None,
        session_timestamp: str = None,
        log_name: str = None
    ) -> List[str]:
        """
        Export clustered traces as XES files.
        
        Args:
            clustering_result: Dict from pipeline.get_clustering_result() with:
                - labels: cluster label per variant
                - frequencies: frequency per variant
                - variant_to_case_ids: Dict mapping variant_idx → case_ids
                - unique_variants: list of unique variants
                - extraction_result: original extraction data
            output_dir: Base directory (e.g., 'data/20250915175732_data')
            algorithm: Algorithm name (e.g., 'hierarchical', 'dbscan')
            session_timestamp: YYYYMMDD_HHMMSS format.  If None, use current time.
        
        Returns:
            List of exported file paths
        """
        if session_timestamp is None:
            session_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        param_suffix = self._build_param_suffix(algorithm, algorithm_params or {})

        if log_name: 
            cluster_dir_name = f"{log_name}_{algorithm}_{session_timestamp}_param_{param_suffix}_clusters"
        else:
            cluster_dir_name = f"{algorithm}_{session_timestamp}_param_{param_suffix}_clusters"

        cluster_dir = Path(output_dir) / cluster_dir_name
        cluster_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info("Creating cluster directory: %s", cluster_dir)
        
        labels = clustering_result['labels']
        frequencies = clustering_result['frequencies']
        variant_to_case_ids = clustering_result['variant_to_case_ids']
        unique_variants = clustering_result['unique_variants']
        xes_df = clustering_result['extraction_result']['xes_df']
        
        unique_clusters = sorted(set(labels))
        
        logger.info("Exporting %d clusters...", len(unique_clusters))
        
        exported_files = []
        
        for cluster_id in unique_clusters:
            variant_indices = [i for i, label in enumerate(labels) if label == cluster_id]
            
           
            num_variants = len(variant_indices)
            num_traces = sum(frequencies[idx] for idx in variant_indices)
            logger.info("Cluster %d: %d variants, %d traces", cluster_id, num_variants, num_traces)

            case_ids_in_cluster = []
            for variant_idx in variant_indices:
                case_ids_in_cluster.extend(variant_to_case_ids[variant_idx])
            
            cluster_df = xes_df. filter(pl.col('case:concept:name').is_in(case_ids_in_cluster))
            
            cluster_file = cluster_dir / f"cluster_{cluster_id}.xes"
            
            try:
                rustxes.export_xes(cluster_df, str(cluster_file))
                exported_files.append(str(cluster_file))
                
                logger.info("Exported %s", cluster_file.name)
            
            except Exception as e:
                logger.error("Error exporting cluster %d: %s", cluster_id, e, exc_info=True)
        
        
        logger.info("Exported %d clusters to %s", len(exported_files), cluster_dir)
        
        return exported_files
    
    