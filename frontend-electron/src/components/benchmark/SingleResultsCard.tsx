import { Card } from '@/components/ui/card';
import { BenchmarkResult, LogBenchmarkResult } from '@/types/benchmarkTypes';

interface SingleResultsCardProps {
  results: BenchmarkResult;
}

export function SingleResultsCard({ results }: SingleResultsCardProps) {
  return (
    <Card className="p-6 bg-linear-to-br from-blue-50 to-blue-100 border border-blue-300">
      <h2 className="text-xl font-bold text-blue-900 mb-4">Benchmark Results</h2>
      <SummaryStats results={results} />
      <LogResultsList logs={results.logResults} />
    </Card>
  );
}

function SummaryStats({ results }: { results: BenchmarkResult }) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <StatCard label="Execution Time" value={formatTime(results.totalExecutionTimeMs)} />
      <StatCard label="Peak Memory" value={`${results.peakMemoryMb} MB`} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4 rounded-lg">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function LogResultsList({ logs }: { logs?: LogBenchmarkResult[] }) {
  if (!logs || logs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-slate-900">Log Files Processed</h3>
      {logs.map((log, index) => (
        <LogResultItem key={log.logName || index} log={log} />
      ))}
    </div>
  );
}

function LogResultItem({ log }: { log: LogBenchmarkResult }) {
  return (
    <div className="bg-white p-3 rounded border border-blue-200">
      <p className="font-medium text-slate-900">{log.logName}</p>

      <div className="grid grid-cols-3 gap-3 mt-2 text-sm">
        <LogStat label="Fitness" value={formatPercent(log.avgFitness)} />
        <LogStat label="Cost" value={log.avgCost.toFixed(4)} />
        <LogStat label="Time" value={formatTime(log.executionTimeMs)} />
      </div>
    </div>
  );
}

function LogStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-600">{label}:</span>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function formatTime(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}