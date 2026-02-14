/**
 * Clustering Algorithm Configuration
 *
 * To add a new algorithm:
 * 1. Add a new entry to CLUSTERING_ALGORITHMS below
 * 2. Ensure the backend (Flask) supports the algorithm id and its parameters
 * 3. The settings UI will automatically render the parameters based on this config
 *
 * Supported parameter types:
 * - 'number'  : Numeric input with optional min/max/step
 * - 'select'  : Dropdown with predefined options
 * - 'toggle'  : Boolean on/off switch
 * - 'slider'  : Range slider with min/max/step
 *
 * Optional 'condition' function controls parameter visibility based on other parameter values.
 */

export interface AlgorithmParameter {
  key: string;
  label: string;
  type: 'number' | 'select' | 'toggle' | 'slider';
  min?: number;
  max?: number;
  step?: number;
  default: number | string | boolean;
  options?: Array<{ value: string; label: string }>;
  description?: string;
  condition?: (params: Record<string, any>) => boolean;
}

export interface ClusteringAlgorithm {
  id: string;
  name: string;
  description: string;
  parameters: AlgorithmParameter[];
}

export const CLUSTERING_ALGORITHMS: Record<string, ClusteringAlgorithm> = {
  hierarchical: {
    id: 'hierarchical',
    name: 'Hierarchical Clustering',
    description: 'Agglomerative hierarchical clustering',
    parameters: [
      {
        key: 'linkage',
        label: 'Linkage Method',
        type: 'select',
        default: 'average',
        options: [
          { value: 'average', label: 'Average' },
          { value: 'complete', label: 'Complete' },
          { value: 'single', label: 'Single' },
          { value: 'ward', label: 'Ward' },
        ],
        description: 'Criterion to use when calculating cluster distance',
      },
      {
        key: 'useDistanceThreshold',
        label: 'Use Distance Threshold Mode',
        type: 'toggle',
        default: false,
        description: 'Choose distance threshold instead of fixed cluster count',
      },
      {
        key: 'n_clusters',
        label: 'Number of Clusters',
        type: 'number',
        min: 2,
        max: 20,
        default: 3,
        condition: (params) => !params.useDistanceThreshold,
        description: 'Number of clusters to create',
      },
      {
        key: 'distance_threshold',
        label: 'Levenshtein Distance Threshold',
        type: 'number',
        min: 1,
        max: 50,
        step: 1,
        default: 10,
        condition: (params) => params.useDistanceThreshold,
        description: 'Integer distance threshold (Levenshtein distance)',
      },
    ],
  },
  dbscan: {
    id: 'dbscan',
    name: 'DBSCAN',
    description: 'Density-based spatial clustering',
    parameters: [
      {
        key: 'eps',
        label: 'EPS (Max Distance)',
        type: 'number',
        min: 0.1,
        max: 50,
        step: 1,
        default: 5,
        description: 'Maximum distance between samples in same neighborhood',
      },
      {
        key: 'min_samples',
        label: 'Min Samples',
        type: 'number',
        min: 1,
        max: 100,
        default: 5,
        description: 'Minimum samples in neighborhood to form a core point',
      },
    ],
  },
};