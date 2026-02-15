// Requests

export interface BenchmarkRequest {
  pnmlModelPath?: string;
  ptmlModelPath?: string;
  logDirectory: string;
  algorithm: string;
  numThreads: number;
  useBounds?: boolean;
  useWarmStart?: boolean;
  boundThreshold?: number;
  boundedSkipStrategy?: 'lower' | 'midpoint' | 'upper';
  propagateCostsAcrossClusters?: boolean;
}

// Responses (from POST /benchmark/run)

export interface BenchmarkRunResponse {
  benchmarkId: string;
  statusUrl: string;
  streamUrl?: string;
}

// Timing & Optimization Detail

export interface TimingBreakdown {
  totalMs: number;
  computeMs: number;
  overheadMs: number;
  parseMs?: number;
  networkMs?: number;
  efficiency: number;
}

export interface OptimizationStats {
  fullAlignments: number;
  warmStartAlignments: number;
  boundedSkips: number;
  cachedAlignments: number;
  optimizationRate: number;
}

// Per-Variant Alignment Detail

export type AlignmentMethod = 'full' | 'warmStart' | 'boundedSkip' | 'cached';

export interface TraceAlignmentDetail {
  variantName: string[];
  alignmentCost: number;
  fitness: number;
  traceLength: number;
  traceCount: number;
  alignmentTimeMs: number;
  statesExplored: number;
  method: AlignmentMethod;
  lowerBound: number;
  upperBound?: number;
  confidence: number;
}

// Bounds Progression (for convergence analysis)

export interface BoundsProgressionEntry {
  variantIndex: number;
  numReferences: number;
  lowerBound: number;
  upperBound?: number;
  gap?: number;
  estimatedCost?: number;
  actualCost?: number;
  method: string;
}

export interface GlobalBoundsSnapshot {
  numReferences: number;
  numRemaining: number;
  meanLowerBound: number;
  meanUpperBound: number;
  meanGap: number;
  minGap: number;
  maxGap: number;
  numSkippable: number;
}

// Per-Log Results

export interface LogBenchmarkResult {
  logName: string;
  totalTraces: number;
  totalVariants: number;
  successfulAlignments: number;
  failedAlignments: number;
  avgFitness: number;
  avgCost: number;
  executionTimeMs: number;
  memoryUsedMb: number;
  timing?: TimingBreakdown;
  optimizationStats?: OptimizationStats;
  alignments?: TraceAlignmentDetail[];
  boundsProgression?: BoundsProgressionEntry[];
  globalBoundsProgression?: GlobalBoundsSnapshot[];
}

// Summary (top-level aggregated metrics)

export interface BenchmarkSummary {
  avgFitness: number;
  avgCost: number;
  successfulAlignments: number;
  failedAlignments: number;
  totalTraces: number;
  totalVariants: number;
  totalLogsProcessed: number;
  totalExecutionTimeMs: number;
  totalComputeTimeMs: number;
  peakMemoryMb: number;
}

// Full Exported Result (matches BenchmarkResultExporter output)

export interface BenchmarkExportedResult {
  benchmarkId: string;
  algorithm: string;
  modelFile: string;
  logName: string;
  numThreads: number;
  timestamp: string;
  summary: BenchmarkSummary;
  ptalignConfig?: Record<string, unknown>;
  logs: Record<string, LogBenchmarkResult>;
}

// API Result (from GET /benchmark/run/{id}, matches BenchmarkResult.java)

export interface BenchmarkResult {
  benchmarkId: string;
  modelFile: string;
  algorithm: string;
  numThreads: number;
  startTime: string;
  endTime: string;
  totalExecutionTimeMs: number;
  peakMemoryMb: number;
  success: boolean;
  errorMessage?: string;
  logResults: LogBenchmarkResult[];
  ptalignConfig?: Record<string, unknown>;
}

// Frontend Payload (single algorithm request built by ActionsPanel)

export interface BenchmarkPayload {
  pnmlModelPath?: string;
  ptmlModelPath?: string;
  logDirectory: string;
  algorithm: string;
  numThreads: number;
  useBounds?: boolean;
  useWarmStart?: boolean;
  boundThreshold?: number;
  boundedSkipStrategy?: 'lower' | 'midpoint' | 'upper';
  propagateCostsAcrossClusters?: boolean;
}

// Session passed to BenchmarkView via navigate state

export interface BenchmarkSession {
  payloads?: BenchmarkPayload[];
  resultFiles?: string[];
}