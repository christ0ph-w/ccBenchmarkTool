import { Card } from '@/components/ui/card';
import { ComparativeResult, AlgorithmComparison } from '@/types/benchmarkTypes';

interface PerformanceChartsProps {
  results: ComparativeResult;
}

export function PerformanceCharts({ results }: PerformanceChartsProps) {
  const algorithms = Object.entries(results.algorithmResults || {});

  if (algorithms.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <h3 className="font-bold text-lg mb-4">Performance Comparison</h3>

      <div className="space-y-6">
        <MetricChart
          title="Execution Time (seconds)"
          algorithms={algorithms}
          getValue={(data) => data.totalExecutionTimeMs}
          formatLabel={(ms) => `${(ms / 1000).toFixed(2)}s`}
          color="bg-blue-500"
        />

        <MetricChart
          title="Peak Memory (MB)"
          algorithms={algorithms}
          getValue={(data) => data.peakMemoryMb}
          formatLabel={(mb) => `${mb} MB`}
          color="bg-orange-500"
        />

        <MetricChart
          title="Average Fitness"
          algorithms={algorithms}
          getValue={(data) => data.averageFitness}
          formatLabel={(val) => `${(val * 100).toFixed(1)}%`}
          color="bg-green-500"
          maxValue={1} // Fitness is 0-1, not relative
        />
      </div>
    </Card>
  );
}

interface MetricChartProps {
  title: string;
  algorithms: [string, AlgorithmComparison][];
  getValue: (data: AlgorithmComparison) => number;
  formatLabel: (value: number) => string;
  color: string;
  maxValue?: number; // Fixed max for percentage-based metrics
}

function MetricChart({
  title,
  algorithms,
  getValue,
  formatLabel,
  color,
  maxValue,
}: MetricChartProps) {
  const values = algorithms.map(([, data]) => getValue(data));
  const max = maxValue ?? Math.max(...values);

  return (
    <div>
      <h4 className="font-semibold text-sm mb-3 text-slate-700">{title}</h4>
      <div className="space-y-2">
        {algorithms.map(([name, data]) => {
          const value = getValue(data);
          const percentage = max > 0 ? (value / max) * 100 : 0;

          return (
            <BarRow
              key={name}
              label={name}
              percentage={percentage}
              displayValue={formatLabel(value)}
              color={color}
            />
          );
        })}
      </div>
    </div>
  );
}

function BarRow({ label, percentage, displayValue, color }: {
  label: string;
  percentage: number;
  displayValue: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm font-medium text-slate-700">{label}</span>
      <div className="flex-1 bg-slate-200 rounded-full h-6 overflow-hidden">
        <div
          className={`${color} h-full flex items-center justify-end pr-2`}
          style={{ width: `${Math.max(percentage, 10)}%` }} // min width for label visibility
        >
          <span className="text-xs font-bold text-white">{displayValue}</span>
        </div>
      </div>
    </div>
  );
}