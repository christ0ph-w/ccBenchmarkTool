import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
} from 'recharts';
import { ComparisonSeries } from '@/types/comparisonTypes';

interface SpeedupChartProps {
  series: ComparisonSeries[];
}

const LOG_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

function getLogColor(logName: string, logNames: string[]): string {
  const index = logNames.indexOf(logName);
  return LOG_COLORS[index % LOG_COLORS.length];
}

interface ChartDataPoint {
  name: string;
  speedup: number;
  logName: string;
  benchmarkId: string;
  computeTimeMs: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }> }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-foreground">{data.logName}</p>
      <p className="text-muted-foreground">{data.name}</p>
      <div className="mt-1 space-y-1 text-muted-foreground">
        <p>Speedup: <span className="font-medium text-foreground">{data.speedup}%</span></p>
        <p>Compute Time: <span className="text-foreground">{data.computeTimeMs.toLocaleString()}ms</span></p>
      </div>
    </div>
  );
}

export function SpeedupChart({ series }: SpeedupChartProps) {
  const logNames = [...new Set(series.map((s) => s.logName))];
  const hasMultipleLogs = logNames.length > 1;

  const chartData: ChartDataPoint[] = series.map((s) => ({
    name: s.label,
    speedup: s.speedup !== null ? parseFloat(s.speedup.toFixed(1)) : 0,
    logName: s.logName,
    benchmarkId: s.benchmarkId,
    computeTimeMs: s.totalComputeTimeMs,
  }));

  const values = chartData.map((d) => d.speedup);
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(0, ...values);
  
  const range = maxVal - minVal;
  const minRange = 20;
  
  let yMin = minVal;
  let yMax = maxVal;
  
  if (range < minRange) {
    const center = (maxVal + minVal) / 2;
    yMin = center - minRange / 2;
    yMax = center + minRange / 2;
  } else {
    const padding = range * 0.15;
    yMin = minVal - padding;
    yMax = maxVal + padding;
  }

  const allNearZero = values.every((v) => Math.abs(v) < 1);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Speedup by Configuration</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Relative to baseline (negative = slower than baseline)
      </p>
      
      
      <div className="flex flex-wrap gap-4 mb-4">
        {logNames.map((logName) => (
          <div key={logName} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded" 
              style={{ backgroundColor: getLogColor(logName, logNames) }}
            />
            <span className="text-sm font-medium">{logName}</span>
          </div>
        ))}
      </div>

      
      {allNearZero && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            All speedup values are near 0%. The selected results have very similar execution times.
          </p>
        </div>
      )}
      
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            margin={{ top: 30, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#525252" opacity={0.5} vertical={false} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: '#a1a1aa' }}
              axisLine={{ stroke: '#525252' }}
              tickLine={{ stroke: '#525252' }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              domain={[Math.floor(yMin), Math.ceil(yMax)]}
              tick={{ fontSize: 12, fill: '#a1a1aa' }}
              axisLine={{ stroke: '#525252' }}
              tickLine={{ stroke: '#525252' }}
              label={{ 
                value: 'Speedup (%)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: 13, fill: '#a1a1aa' }
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#3f3f46', opacity: 0.5 }} />
            <ReferenceLine 
              y={0} 
              stroke="#71717a" 
              strokeWidth={2}
            />
            <Bar 
              dataKey="speedup" 
              name="Speedup"
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getLogColor(entry.logName, logNames)}
                />
              ))}
              <LabelList 
                dataKey="speedup" 
                position="top" 
                formatter={(value) => `${value}%`}
                style={{ fontSize: 11, fontWeight: 600, fill: '#e4e4e7' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}