const API_BASE = 'http://localhost:5000/api';

interface ClusteringPayload {
  file_path: string;
  clustering_algorithm: string;
  algorithm_params: Record<string, any>;
}

interface ClusteringResponse {
  success: boolean;
  data?: {
    num_variants: number;
    num_clusters: number;
    cluster_sizes: Record<string, number>;
    algorithm: string;
    algorithm_params: Record<string, any>;
    distance_matrix: number[][];
    labels: number[];
    exported_files: string[];
  };
  error?: string;
}

export const clusteringService = {
  async clusterFile(payload: ClusteringPayload): Promise<ClusteringResponse> {
    const response = await fetch(`${API_BASE}/cluster/traces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result: ClusteringResponse = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Clustering failed');
    }

    return result;
  },
};