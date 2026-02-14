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
  total_ms: number;
  compute_ms: number;
  overhead_ms: number;
  parse_ms?: number;
  network_ms?: number;
  efficiency: number;
}

export interface OptimizationStats {
  full_alignments: number;
  warm_start_alignments: number;
  bounded_skips: number;
  cached_alignments: number;
  optimization_rate: number;
}

// Per-Variant Alignment Detail

export type AlignmentMethod = 'full' | 'warm_start' | 'bounded_skip' | 'cached';

export interface TraceAlignmentDetail {
  variant_name: string[];
  alignment_cost: number;
  fitness: number;
  trace_length: number;
  trace_count: number;
  alignment_time_ms: number;
  states_explored: number;
  method: AlignmentMethod;
  lower_bound: number;
  upper_bound?: number;
  confidence: number;
}

// Bounds Progression (for convergence analysis)

export interface BoundsProgressionEntry {
  variant_index: number;
  num_references: number;
  lower_bound: number;
  upper_bound?: number;
  gap?: number;
  estimated_cost?: number;
  actual_cost?: number;
  method: string;
}

export interface GlobalBoundsSnapshot {
  num_references: number;
  num_remaining: number;
  mean_lower_bound: number;
  mean_upper_bound: number;
  mean_gap: number;
  min_gap: number;
  max_gap: number;
  num_skippable: number;
}

// Per-Log Results

export interface LogBenchmarkResult {
  total_traces: number;
  total_variants: number;
  successful_alignments: number;
  failed_alignments: number;
  avg_fitness: number;
  avg_cost: number;
  execution_time_ms: number;
  memory_mb: number;
  timing?: TimingBreakdown;
  optimization_stats?: OptimizationStats;
  alignments?: TraceAlignmentDetail[];
  bounds_progression?: BoundsProgressionEntry[];
  global_bounds_progression?: GlobalBoundsSnapshot[];
}

// Summary (top-level aggregated metrics)

export interface BenchmarkSummary {
  avg_fitness: number;
  avg_cost: number;
  successful_alignments: number;
  failed_alignments: number;
  total_traces: number;
  total_variants: number;
  total_logs_processed: number;
  total_execution_time_ms: number;
  total_compute_time_ms: number;
  peak_memory_mb: number;
}

// Full Exported Result (matches BenchmarkResultExporter output)

export interface BenchmarkExportedResult {
  algorithm: string;
  model_file: string;
  log_name: string;
  num_threads: number;
  timestamp: string;
  summary: BenchmarkSummary;
  ptalign_config?: Record<string, unknown>;
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
  payloads: BenchmarkPayload[];
}