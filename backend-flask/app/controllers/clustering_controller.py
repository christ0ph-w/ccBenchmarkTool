from flask import request, jsonify
from pathlib import Path

from config import Config
from app.services import ClusteringPipeline
from app.utils.clustering import CLUSTERERS


class ClusteringController:
    def cluster_traces(self):
        """
        HTTP endpoint for clustering traces.
        
        Expected JSON:
        {
            "file_path": "relative/path/from/data/file.xes",
            "clustering_algorithm": "hierarchical" | "dbscan",
            "algorithm_params": {
                "n_clusters": 3,
                "linkage": "average"
            }
        }
        """
        try:
            data = request.get_json()
            if not data:
                return jsonify({
                    'success': False,
                    'error': 'Request body must be JSON'
                }), 400
            
            # Validate fields 
            required_fields = ['file_path', 'clustering_algorithm', 'algorithm_params']
            missing_fields = [f for f in required_fields if f not in data]
            if missing_fields:
                return jsonify({
                    'success': False,
                    'error': f'Missing required fields: {", ". join(missing_fields)}'
                }), 400
            
            file_path = data['file_path']
            algorithm = data['clustering_algorithm']
            algorithm_params = data. get('algorithm_params', {})
            
            if algorithm not in CLUSTERERS:
                return jsonify({
                    'success': False,
                    'error': f'Unknown algorithm: {algorithm}. Available: {list(CLUSTERERS.keys())}'
                }), 400
            
            abs_file_path = Config.get_absolute_data_path(file_path)
            log_name = abs_file_path.stem
            
            if not abs_file_path.exists():
                return jsonify({
                    'success': False,
                    'error': f'File not found: {abs_file_path}'
                }), 404

            pipeline = ClusteringPipeline()
            
            output_dir = str(abs_file_path.parent)
            
            result = pipeline.run(
                str(abs_file_path),
                algorithm=algorithm,
                algorithm_params=algorithm_params,
                output_dir=output_dir,
                log_name=log_name
            )
            
            response_data = {
                'success': True,
                'data': {
                    'num_variants': len(result['unique_variants']),
                    'num_clusters': result['num_clusters'],
                    'cluster_sizes': result['cluster_sizes'],
                    'algorithm': result['algorithm'],
                    'algorithm_params': result['algorithm_params'],
                    'distance_matrix': result['distance_matrix'],
                    'labels': result['labels'].tolist() if hasattr(result['labels'], 'tolist') else result['labels'],
                    'exported_files': result.get('exported_files', [])
                }
            }
            
            return jsonify(response_data), 200
        
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': f'Validation error: {str(e)}'
            }), 400
        
        except FileNotFoundError as e:
            return jsonify({
                'success': False,
                'error': f'File error: {str(e)}'
            }), 404
        
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Processing failed: {str(e)}'
            }), 500