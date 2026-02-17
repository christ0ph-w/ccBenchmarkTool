import { BenchmarkExportedResult, LogBenchmarkResult } from '@/types/benchmarkTypes';
import { 
  ConfigType, 
  SplitType, 
  ComparisonSeries, 
  ComparisonData 
} from '@/types/comparisonTypes';

// Detect config type from ptalignConfig
export function detectConfigType(config?: Record<string, unknown>): ConfigType {
  if (!config) return 'baseline';
  
  const useBounds = config.useBounds as boolean | undefined;
  const useWarmStart = config.useWarmStart as boolean | undefined;
  const boundThreshold = config.boundThreshold as number | undefined;
  
  if (!useBounds && !useWarmStart) {
    return 'baseline';
  }
  
  if (!useBounds && useWarmStart) {
    return 'warmstart';
  }
  
  // useBounds is true
  const threshold = boundThreshold ?? 0;
  return `t${Math.round(threshold)}` as ConfigType;
}

//Detect split type from log names
export function detectSplitType(logs: Record<string, LogBenchmarkResult>): SplitType {
  const logNames = Object.keys(logs);
  
  for (const name of logNames) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('cluster')) {
      return 'cluster';
    }
    if (lowerName.includes('random')) {
      return 'random';
    }
  }
  
  return 'unknown';
}

//Get a human-readable label for a config
export function getConfigLabel(config: ConfigType): string {
  if (config === 'baseline') return 'Baseline';
  if (config === 'warmstart') return 'WS';
  return config.replace('t', 't=');
}

//Extract threshold value from config type
export function getThresholdFromConfig(config: ConfigType): number | null {
  if (config === 'baseline' || config === 'warmstart') {
    return null;
  }
  const match = config.match(/^t(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

//Aggregate optimization stats from all logs
function aggregateOptimizationStats(logs: Record<string, LogBenchmarkResult>) {
  let fullAlignments = 0;
  let warmStartAlignments = 0;
  let boundedSkips = 0;
  let totalVariants = 0;
  
  Object.values(logs).forEach((log) => {
    const logData = log as unknown as Record<string, unknown>;
    const stats = logData.optimizationStats as Record<string, unknown> | undefined;
    
    if (stats) {
      fullAlignments += (stats.fullAlignments as number) || 0;
      warmStartAlignments += (stats.warmStartAlignments as number) || 0;
      boundedSkips += (stats.boundedSkips as number) || 0;
    }
    
    totalVariants += (logData.totalVariants as number) || 0;
  });
  
  const total = fullAlignments + warmStartAlignments + boundedSkips;
  const skipRate = total > 0 ? (boundedSkips / total) * 100 : 0;
  
  return {
    fullAlignments,
    warmStartAlignments,
    boundedSkips,
    totalVariants,
    skipRate,
  };
}

//Convert a BenchmarkExportedResult to a ComparisonSeries
export function resultToSeries(
  result: BenchmarkExportedResult,
  filename: string
): ComparisonSeries {
  const config = detectConfigType(result.ptalignConfig);
  const splitType = detectSplitType(result.logs);
  const threshold = getThresholdFromConfig(config);
  const stats = aggregateOptimizationStats(result.logs);
  
  return {
    benchmarkId: result.benchmarkId,
    filename,
    label: getConfigLabel(config),
    config,
    splitType,
    logName: result.logName,  // Use logName from the result
    threshold,
    avgFitness: result.summary.avgFitness,
    fitnessLoss: null,
    totalExecutionTimeMs: result.summary.totalExecutionTimeMs,
    totalComputeTimeMs: result.summary.totalComputeTimeMs,
    speedup: null,
    ...stats,
    sourceData: result,
  };
}

/**
 * Create a grouping key for baseline matching
 * Results with the same key share the same baseline
 */
function getBaselineGroupKey(series: ComparisonSeries): string {
  return `${series.logName}:${series.splitType}`;
}

// Find baselines for each group (logName + splitType combination)
function findBaselines(series: ComparisonSeries[]): Map<string, ComparisonSeries> {
  const baselines = new Map<string, ComparisonSeries>();
  
  // Group by logName + splitType
  const byGroup = new Map<string, ComparisonSeries[]>();
  series.forEach((s) => {
    const key = getBaselineGroupKey(s);
    const list = byGroup.get(key) || [];
    list.push(s);
    byGroup.set(key, list);
  });
  
  // Find baseline for each group
  byGroup.forEach((groupSeries, groupKey) => {
    // First look for explicit baseline
    let baseline = groupSeries.find((s) => s.config === 'baseline');
    
    // Then warmstart
    if (!baseline) {
      baseline = groupSeries.find((s) => s.config === 'warmstart');
    }
    
    // Then lowest threshold
    if (!baseline) {
      const sorted = [...groupSeries]
        .filter((s) => s.threshold !== null)
        .sort((a, b) => (a.threshold ?? 0) - (b.threshold ?? 0));
      baseline = sorted[0];
    }
    
    if (baseline) {
      baselines.set(groupKey, baseline);
    }
  });
  
  return baselines;
}

//Calculate speedup and fitness loss relative to same-group baseline
export function calculateRelativeMetrics(
  series: ComparisonSeries[],
  baselines: Map<string, ComparisonSeries>
): ComparisonSeries[] {
  return series.map((s) => {
    const groupKey = getBaselineGroupKey(s);
    const baseline = baselines.get(groupKey);
    
    if (!baseline) {
      return s;
    }
    
    const speedup = baseline.totalComputeTimeMs > 0
      ? ((baseline.totalComputeTimeMs - s.totalComputeTimeMs) / baseline.totalComputeTimeMs) * 100
      : null;
    
    const fitnessLoss = baseline.avgFitness > 0
      ? ((baseline.avgFitness - s.avgFitness) / baseline.avgFitness) * 100
      : null;
    
    return {
      ...s,
      speedup,
      fitnessLoss,
    };
  });
}

// Create a comparison from multiple results
export function createComparison(
  results: Array<{ result: BenchmarkExportedResult; filename: string }>,
  name: string
): ComparisonData {
  // Convert to series
  let series = results.map(({ result, filename }) => 
    resultToSeries(result, filename)
  );
  
  // Sort by: logName, then splitType, then config
  series.sort((a, b) => {
    // First by logName
    const logCompare = a.logName.localeCompare(b.logName);
    if (logCompare !== 0) return logCompare;
    
    // Then by split type (cluster before random)
    if (a.splitType === 'cluster' && b.splitType !== 'cluster') return -1;
    if (a.splitType !== 'cluster' && b.splitType === 'cluster') return 1;
    
    // Then by config
    const configOrder = (s: ComparisonSeries) => {
      if (s.config === 'baseline') return 0;
      if (s.config === 'warmstart') return 1;
      return 2 + (s.threshold ?? 0);
    };
    return configOrder(a) - configOrder(b);
  });
  
  // Find baselines per group and calculate relative metrics
  const baselines = findBaselines(series);
  series = calculateRelativeMetrics(series, baselines);
  
  // Get first baseline ID for reference
  const firstBaseline = baselines.values().next().value;
  
  return {
    comparisonId: generateId(),
    name,
    createdAt: new Date().toISOString(),
    baselineId: firstBaseline?.benchmarkId ?? null,
    series,
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}