import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { ComparisonSeries } from '@/types/comparisonTypes';

interface SkipRateChartProps {
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
  skipRate: number;
  logName: string;
  benchmarkId: string;
  fullLabel: string;
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
      <div className="mt-1 text-muted-foreground">
        <p>Skip Rate: <span className="font-medium text-foreground">{data.skipRate}%</span></p>
      </div>
    </div>
  );
}

export function SkipRateChart({ series }: SkipRateChartProps) {
  const logNames = [...new Set(series.map((s) => s.logName))];
  const hasMultipleLogs = logNames.length > 1;

  const chartData: ChartDataPoint[] = series.map((s) => ({
    name: s.label,
    skipRate: parseFloat(s.skipRate.toFixed(1)),
    logName: s.logName,
    benchmarkId: s.benchmarkId,
    fullLabel: hasMultipleLogs ? `${s.logName}\n${s.label}` : s.label,
  }));

  const allZero = chartData.every((d) => d.skipRate === 0);

  if (allZero) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-4">Skip Rate by Configuration</h3>
        <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-lg">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">No Bounded Skips</p>
            <p className="text-sm mt-1">All selected results have 0% skip rate.</p>
            <p className="text-sm">Try comparing results with higher thresholds.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Skip Rate by Configuration</h3>
      
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
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#a1a1aa' }}
              axisLine={{ stroke: '#525252' }}
              tickLine={{ stroke: '#525252' }}
              label={{ 
                value: 'Skip Rate (%)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: 13, fill: '#a1a1aa' }
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#3f3f46', opacity: 0.5 }} />
            <Bar 
              dataKey="skipRate" 
              name="Skip Rate"
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
                dataKey="skipRate" 
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