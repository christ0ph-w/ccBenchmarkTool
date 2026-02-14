import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ClusteringSettings {
  algorithm: string;
  params: Record<string, any>;
}

interface BenchmarkingSettings {
  selectedAlgorithms: string[];
  coreCount: number;
}

interface SettingsState {
  clustering: ClusteringSettings;
  benchmarking: BenchmarkingSettings;

  setClusteringSettings: (settings: Partial<ClusteringSettings>) => void;
  setBenchmarkingSettings: (settings: Partial<BenchmarkingSettings>) => void;
  clearAllSettings: () => void;
}

const defaultClusteringSettings: ClusteringSettings = {
  algorithm: 'dbscan',
  params: {
    linkage: 'average',
    useDistanceThreshold: false,
    n_clusters: 3,
    distance_threshold: 10,
    eps: 5,
    min_samples: 5,
  },
};

const defaultBenchmarkingSettings: BenchmarkingSettings = {
  selectedAlgorithms: [],
  coreCount: 1,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      clustering: defaultClusteringSettings,
      benchmarking: defaultBenchmarkingSettings,

      setClusteringSettings: (settings) =>
        set((state) => ({
          clustering: {
            algorithm: settings.algorithm ?? state.clustering.algorithm,
            params: {
              ...state.clustering.params,
              ...settings.params,
            },
          },
        })),

      setBenchmarkingSettings: (settings) =>
        set((state) => ({
          benchmarking: { ...state.benchmarking, ...settings },
        })),

      clearAllSettings: () =>
        set({
          clustering: defaultClusteringSettings,
          benchmarking: defaultBenchmarkingSettings,
        }),
    }),
    {
      name: 'app-settings',
    }
  )
);