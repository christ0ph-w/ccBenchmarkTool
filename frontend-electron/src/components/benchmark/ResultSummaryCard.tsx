import { Card } from '@/components/ui/card';
import { BenchmarkResult, BenchmarkExportedResult } from '@/types/benchmarkTypes';

interface LiveResultProps {
  results: BenchmarkResult;
  exported?: never;
}

interface FileResultProps {
  results?: never;
  exported: BenchmarkExportedResult;
}

type ResultSummaryCardProps = LiveResultProps | FileResultProps;

export function ResultSummaryCard(props: ResultSummaryCardProps) {
  if (props.exported) {
    return <ExportedSummary data={props.exported} />;
  }
  return <LiveSummary data={props.results} />;
}

function LiveSummary({ data }: { data: BenchmarkResult }) {
  const totalTraces = data.logResults?.reduce((sum, l) => sum + l.totalTraces, 0) ?? 0;
  const totalVariants = data.logResults?.reduce((sum, l) => sum + l.totalVariants, 0) ?? 0;
  const successfulAlignments = data.logResults?.reduce((sum, l) => sum + l.successfulAlignments, 0) ?? 0;
  const failedAlignments = data.logResults?.reduce((sum, l) => sum + l.failedAlignments, 0) ?? 0;

  const avgFitness = successfulAlignments > 0
    ? data.logResults.reduce((sum, l) => sum + l.avgFitness * l.successfulAlignments, 0) / successfulAlignments
    : 0;

  const avgCost = successfulAlignments > 0
    ? data.logResults.reduce((sum, l) => sum + l.avgCost * l.successfulAlignments, 0) / successfulAlignments
    : 0;

  return (
    <SummaryLayout
      algorithm={data.algorithm}
      subtitle={`${data.numThreads} thread${data.numThreads > 1 ? 's' : ''}`}
      stats={[
        { label: 'Execution Time', value: formatTime(data.totalExecutionTimeMs) },
        { label: 'Peak Memory', value: `${data.peakMemoryMb} MB` },
        { label: 'Avg Fitness', value: formatPercent(avgFitness) },
        { label: 'Avg Cost', value: avgCost.toFixed(4) },
        { label: 'Total Traces', value: totalTraces.toString() },
        { label: 'Total Variants', value: totalVariants.toString() },
        { label: 'Successful', value: successfulAlignments.toString() },
        { label: 'Failed', value: failedAlignments.toString(), highlight: failedAlignments > 0 },
      ]}
      ptalignConfig={data.ptalignConfig}
    />
  );
}

function ExportedSummary({ data }: { data: BenchmarkExportedResult }) {
  const s = data.summary;

  return (
    <SummaryLayout
      algorithm={data.algorithm}
      subtitle={`${data.numThreads} thread${data.numThreads > 1 ? 's' : ''} · ${data.logName} · ${data.timestamp}`}
      stats={[
        { label: 'Execution Time', value: formatTime(s.totalExecutionTimeMs) },
        { label: 'Compute Time', value: formatTime(s.totalComputeTimeMs) },
        { label: 'Peak Memory', value: `${s.peakMemoryMb} MB` },
        { label: 'Avg Fitness', value: formatPercent(s.avgFitness) },
        { label: 'Avg Cost', value: s.avgCost.toFixed(4) },
        { label: 'Total Traces', value: s.totalTraces.toString() },
        { label: 'Total Variants', value: s.totalVariants.toString() },
        { label: 'Logs Processed', value: s.totalLogsProcessed.toString() },
        { label: 'Successful', value: s.successfulAlignments.toString() },
        { label: 'Failed', value: s.failedAlignments.toString(), highlight: s.failedAlignments > 0 },
      ]}
      ptalignConfig={data.ptalignConfig}
    />
  );
}

interface StatItem {
  label: string;
  value: string;
  highlight?: boolean;
}

function SummaryLayout({ algorithm, subtitle, stats, ptalignConfig }: {
  algorithm: string;
  subtitle: string;
  stats: StatItem[];
  ptalignConfig?: Record<string, unknown>;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{algorithm}</h2>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} highlight={stat.highlight} />
        ))}
      </div>

      {ptalignConfig && <PtalignConfigDisplay config={ptalignConfig} />}
    </Card>
  );
}

function StatCard({ label, value, highlight }: StatItem) {
  return (
    <div className="bg-muted p-3 rounded-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-red-500' : 'text-foreground'}`}>
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
          <span key={key} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
            {key}: <span className="font-medium text-foreground">{String(value)}</span>
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