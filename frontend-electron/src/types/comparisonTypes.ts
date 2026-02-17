import { BenchmarkExportedResult } from './benchmarkTypes';


//Detected configuration from ptalignConfig
export type ConfigType = 'baseline' | 'warmstart' | `t${number}`;


 //Detected split type from log names
export type SplitType = 'cluster' | 'random' | 'unknown';

// A single series entry in a comparison (one benchmark result)
export interface ComparisonSeries {
  benchmarkId: string;
  filename: string;
  label: string;
  config: ConfigType;
  splitType: SplitType;
  logName: string;
  threshold: number | null;
  
  // Metrics
  avgFitness: number;
  fitnessLoss: number | null;
  totalExecutionTimeMs: number;
  totalComputeTimeMs: number;
  speedup: number | null;
  
  // Optimization stats (aggregated)
  totalVariants: number;
  fullAlignments: number;
  warmStartAlignments: number;
  boundedSkips: number;
  skipRate: number;
  
  // Reference to full data if needed
  sourceData: BenchmarkExportedResult;
}


//A saved comparison file
export interface ComparisonData {
  comparisonId: string;
  name: string;
  createdAt: string;
  
  // Baseline reference (if identified)
  baselineId: string | null;
  
  // All series in the comparison
  series: ComparisonSeries[];
}


//Chart type options
export type ChartType = 'skipRate' | 'speedup' | 'tradeoff';