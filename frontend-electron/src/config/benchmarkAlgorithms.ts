export interface BenchmarkAlgorithm {
  id: string;
  name: string;
  description: string;
  modelType: 'pnml' | 'ptml';
  parameters: BenchmarkParameter[];
}

export interface BenchmarkParameter {
  key: string;
  label: string;
  description?: string;
  type: 'toggle' | 'number' | 'select';
  default: any;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  condition?: (params: Record<string, any>) => boolean;
}

export const BENCHMARK_ALGORITHMS: Record<string, BenchmarkAlgorithm> = {
  ILP: {
    id: 'ILP',
    name: 'ILP',
    description: 'Integer Linear Programming',
    modelType: 'pnml',
    parameters: [],
  },
  SPLITPOINT: {
    id: 'SPLITPOINT',
    name: 'Splitpoint',
    description: 'Splitpoint-based conformance checking',
    modelType: 'pnml',
    parameters: [],
  },
  PTALIGN: {
    id: 'PTALIGN',
    name: 'PTALIGN',
    description: 'Process Tree alignment with Gurobi optimization',
    modelType: 'ptml',
    parameters: [
      {
        key: 'useWarmStart',
        label: 'Warm Start',
        description: 'Reuse previous alignment solutions as starting points',
        type: 'toggle',
        default: true,
      },
      {
        key: 'useBounds',
        label: 'Bounded Skip',
        description: 'Use bounds to skip variants with predictable costs',
        type: 'toggle',
        default: true,
      },
      {
        key: 'boundThreshold',
        label: 'Bound Threshold',
        description: 'Variants within this cost of their bound are skipped',
        type: 'number',
        default: 1.0,
        min: 0,
        max: 50,
        step: 1,
        condition: (params) => params.useBounds === true,
      },
      {
        key: 'boundedSkipStrategy',
        label: 'Skip Strategy',
        description: 'How to estimate cost for skipped variants',
        type: 'select',
        default: 'upper',
        options: [
          { value: 'lower', label: 'Lower Bound' },
          { value: 'midpoint', label: 'Midpoint' },
          { value: 'upper', label: 'Upper Bound' },
        ],
        condition: (params) => params.useBounds === true,
      },
      {
        key: 'propagateCostsAcrossClusters',
        label: 'Propagate Costs',
        description: 'Share cost information across clustered log files',
        type: 'toggle',
        default: false,
      },
    ],
  },
};