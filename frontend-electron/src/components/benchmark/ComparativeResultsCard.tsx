import { Card } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { ComparativeResult, AlgorithmComparison } from '@/types/benchmarkTypes';

interface ComparativeResultsCardProps {
  results: ComparativeResult;
}

export function ComparativeResultsCard({ results }: ComparativeResultsCardProps) {
  const algorithms = Object.entries(results.algorithmResults || {});

  if (algorithms.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 bg-linear-to-br from-green-50 to-green-100 border border-green-300">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-green-700" />
        <h2 className="text-xl font-bold text-green-900">Comparative Results</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {algorithms.map(([name, data]) => (
          <AlgorithmCard key={name} name={name} data={data} />
        ))}
      </div>
    </Card>
  );
}

function AlgorithmCard({ name, data }: { name: string; data: AlgorithmComparison }) {
  return (
    <Card className="p-4 bg-white">
      <h3 className="font-bold text-lg mb-3 text-slate-900">{name}</h3>

      <div className="space-y-2 text-sm">
        <StatRow label="Execution Time" value={formatTime(data.totalExecutionTimeMs)} />
        <StatRow label="Avg Fitness" value={formatPercent(data.averageFitness)} />
        <StatRow label="Avg Cost" value={data.averageCost.toFixed(4)} />
        <StatRow label="Peak Memory" value={`${data.peakMemoryMb} MB`} />
        <StatRow
          label="Success Rate"
          value={`${data.successfulAlignments}/${data.successfulAlignments + data.failedAlignments}`}
          highlight
        />
      </div>
    </Card>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600">{label}:</span>
      <span className={`font-semibold ${highlight ? 'text-green-600' : 'text-slate-900'}`}>
        {value}
      </span>
    </div>
  );
}

function formatTime(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}