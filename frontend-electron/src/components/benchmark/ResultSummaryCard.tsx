import { Card } from '@/components/ui/card';
import { BenchmarkResult } from '@/types/benchmarkTypes';

interface ResultSummaryCardProps {
  results: BenchmarkResult;
}

export function ResultSummaryCard({ results }: ResultSummaryCardProps) {
  const totalTraces = results.logResults?.reduce((sum, l) => sum + l.total_traces, 0) ?? 0;
  const totalVariants = results.logResults?.reduce((sum, l) => sum + l.total_variants, 0) ?? 0;
  const successfulAlignments = results.logResults?.reduce((sum, l) => sum + l.successful_alignments, 0) ?? 0;
  const failedAlignments = results.logResults?.reduce((sum, l) => sum + l.failed_alignments, 0) ?? 0;

  const avgFitness = successfulAlignments > 0
    ? results.logResults.reduce((sum, l) => sum + l.avg_fitness * l.successful_alignments, 0) / successfulAlignments
    : 0;

  const avgCost = successfulAlignments > 0
    ? results.logResults.reduce((sum, l) => sum + l.avg_cost * l.successful_alignments, 0) / successfulAlignments
    : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Summary</h2>
        <div className="text-sm text-muted-foreground">
          {results.algorithm} · {results.numThreads} thread{results.numThreads > 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Execution Time" value={formatTime(results.totalExecutionTimeMs)} />
        <StatCard label="Peak Memory" value={`${results.peakMemoryMb} MB`} />
        <StatCard label="Avg Fitness" value={formatPercent(avgFitness)} />
        <StatCard label="Avg Cost" value={avgCost.toFixed(4)} />
        <StatCard label="Total Traces" value={totalTraces.toString()} />
        <StatCard label="Total Variants" value={totalVariants.toString()} />
        <StatCard label="Successful" value={successfulAlignments.toString()} />
        <StatCard label="Failed" value={failedAlignments.toString()} highlight={failedAlignments > 0} />
      </div>

      {results.ptalignConfig && (
        <PtalignConfigDisplay config={results.ptalignConfig} />
      )}
    </Card>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-slate-50 p-3 rounded-lg">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-red-600' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}

function PtalignConfigDisplay({ config }: { config: Record<string, unknown> }) {
  return (
    <div className="mt-4 pt-4 border-t">
      <h4 className="text-sm font-medium mb-2">PTALIGN Configuration</h4>
      <div className="flex flex-wrap gap-2">
        {Object.entries(config).map(([key, value]) => (
          <span key={key} className="text-xs bg-slate-100 px-2 py-1 rounded">
            {key}: <span className="font-medium">{String(value)}</span>
          </span>
        ))}
      </div>
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