// TODO: Rework when Spring Boot backend is integrated

// Requests

export interface BenchmarkRequest {
  modelPath: string;
  logDirectory: string;
  algorithm: string;
  numThreads: number;
}

export interface ComparativeRequest {
  modelPath: string;
  logDirectory: string;
  algorithms: string[];
  numThreads: number;
}

// Responses

export interface BenchmarkRunResponse {
  benchmarkId: string;
  statusUrl: string;
  streamUrl: string;
}

export interface BenchmarkCompareResponse {
  comparativeId: string;
  statusUrl: string;
  streamUrl?: string;
}

export interface BenchmarkStartResponse extends BenchmarkRunResponse {
  comparativeId?: string;
}

// Progress Tracking

export interface BenchmarkProgressEvent {
  benchmarkId: string;
  algorithm: string;
  totalFiles: number;
  currentFile: number;
  totalTracesInCurrentFile: number;
  currentTraceInFile: number;
  currentFileName: string;
  currentFileStartTime?: number;
  percentComplete: number;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  error: string | null;
}

// Per-File Results

export interface LogBenchmarkResult {
  logName: string;
  totalTraces: number;
  alignedTraces: number;
  avgFitness: number;
  avgCost: number;
  executionTimeMs: number;
  memoryUsedMb: number;
}

// Single Benchmark Results

export interface BenchmarkResult {
  benchmarkId: string;
  modelFile: string;
  algorithm: string;
  startTime: string;
  endTime: string;
  totalExecutionTimeMs: number;
  peakMemoryMb: number;
  success: boolean;
  errorMessage?: string;
  logResults: LogBenchmarkResult[];
}

// Comparative Results

export interface AlgorithmComparison {
  algorithmName: string;
  totalExecutionTimeMs: number;
  averageFitness: number;
  averageCost: number;
  peakMemoryMb: number;
  successfulAlignments: number;
  failedAlignments: number;
}

export interface ComparativeResult {
  comparativeId: string;
  modelFile: string;
  totalFilesProcessed: number;
  totalTraces: number;
  startTime: string;
  endTime: string;
  success: boolean;
  errorMessage?: string;
  algorithmResults: Record<string, AlgorithmComparison>;
}

// Frontend Payload

export interface BenchmarkPayload {
  pnmlModelPath?: string;
  ptmlModelPath?: string;
  logDirectory: string;
  algorithms: string[];
  numThreads: number;
}