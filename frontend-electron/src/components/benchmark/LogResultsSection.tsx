import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { BenchmarkResult, BenchmarkExportedResult, LogBenchmarkResult, TimingBreakdown, OptimizationStats } from '@/types/benchmarkTypes';

interface LiveLogResultsProps {
  results: BenchmarkResult;
  exported?: never;
}

interface FileLogResultsProps {
  results?: never;
  exported: BenchmarkExportedResult;
}

type LogResultsSectionProps = LiveLogResultsProps | FileLogResultsProps;

export function LogResultsSection(props: LogResultsSectionProps) {
  const logs: { name: string; data: LogBenchmarkResult }[] = [];

  if (props.exported) {
    Object.entries(props.exported.logs).forEach(([name, data]) => {
      logs.push({ name, data });
    });
  } else if (props.results?.logResults) {
    props.results.logResults.forEach((data, index) => {
      logs.push({ name: `Log ${index + 1}`, data });
    });
  }

  if (logs.length === 0) return null;

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">
        Log Results ({logs.length})
      </h2>
      <div className="space-y-3">
        {logs.map((log) => (
          <LogResultItem key={log.name} name={log.name} log={log.data} />
        ))}
      </div>
    </Card>
  );
}

function LogResultItem({ name, log }: { name: string; log: LogBenchmarkResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium">{name}</span>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Fitness: {formatPercent(log.avgFitness)}</span>
          <span>Cost: {log.avgCost.toFixed(4)}</span>
          <span>{formatTime(log.executionTimeMs)}</span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Traces" value={log.totalTraces.toString()} />
            <MiniStat label="Variants" value={log.totalVariants.toString()} />
            <MiniStat label="Successful" value={log.successfulAlignments.toString()} />
            <MiniStat label="Failed" value={log.failedAlignments.toString()} />
            <MiniStat label="Memory" value={`${log.memoryUsedMb} MB`} />
            <MiniStat label="Avg Fitness" value={formatPercent(log.avgFitness)} />
            <MiniStat label="Avg Cost" value={log.avgCost.toFixed(4)} />
            <MiniStat label="Time" value={formatTime(log.executionTimeMs)} />
          </div>

          {log.timing && <TimingDisplay timing={log.timing} />}
          {log.optimizationStats && <OptimizationDisplay stats={log.optimizationStats} />}
        </div>
      )}
    </div>
  );
}

function TimingDisplay({ timing }: { timing: TimingBreakdown }) {
  const total = timing.totalMs || 1;

  const segments = [
    { label: 'Compute', ms: timing.computeMs, color: 'bg-blue-500' },
    { label: 'Parse', ms: timing.parseMs ?? 0, color: 'bg-green-500' },
    { label: 'Network', ms: timing.networkMs ?? 0, color: 'bg-yellow-500' },
    { label: 'Overhead', ms: timing.overheadMs, color: 'bg-slate-300' },
  ].filter(s => s.ms > 0);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Timing Breakdown</h4>
      <div className="flex h-4 rounded-full overflow-hidden">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={seg.color}
            style={{ width: `${(seg.ms / total) * 100}%` }}
            title={`${seg.label}: ${formatTime(seg.ms)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {segments.map((seg) => (
          <span key={seg.label} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${seg.color}`} />
            {seg.label}: {formatTime(seg.ms)}
          </span>
        ))}
        <span className="text-muted-foreground">
          Efficiency: {(timing.efficiency * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function OptimizationDisplay({ stats }: { stats: OptimizationStats }) {
  const total = stats.fullAlignments + stats.warmStartAlignments + stats.boundedSkips + stats.cachedAlignments;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Optimization Stats</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Full Alignments" value={stats.fullAlignments.toString()} />
        <MiniStat label="Warm Start" value={stats.warmStartAlignments.toString()} />
        <MiniStat label="Bounded Skips" value={stats.boundedSkips.toString()} />
        <MiniStat label="Cached" value={stats.cachedAlignments.toString()} />
      </div>
      {total > 0 && (
        <p className="text-xs text-muted-foreground">
          Optimization rate: {(stats.optimizationRate * 100).toFixed(1)}%
          ({stats.warmStartAlignments + stats.boundedSkips + stats.cachedAlignments}/{total} optimized)
        </p>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-slate-500">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}