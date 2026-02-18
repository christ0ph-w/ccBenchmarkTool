import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';
import { ComparisonSeries } from '@/types/comparisonTypes';

interface TradeoffChartProps {
  series: ComparisonSeries[];
}

const LOG_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#ef4444', // red
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

const LOG_SHAPES: Array<'circle' | 'square' | 'triangle' | 'diamond'> = [
  'circle',
  'square',
  'triangle',
  'diamond',
];

interface DataPoint {
  fitnessLoss: number;
  speedup: number;
  label: string;
  logName: string;
  benchmarkId: string;
}

interface LogData {
  logName: string;
  color: string;
  shape: 'circle' | 'square' | 'triangle' | 'diamond';
  points: DataPoint[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: DataPoint }> }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-foreground">{data.logName}</p>
      <p className="text-muted-foreground">{data.label}</p>
      <div className="mt-1 space-y-1 text-muted-foreground">
        <p>Fitness Loss: <span className="font-medium text-foreground">{data.fitnessLoss.toFixed(2)}%</span></p>
        <p>Speedup: <span className="font-medium text-foreground">{data.speedup.toFixed(1)}%</span></p>
      </div>
    </div>
  );
}

function CustomDot({ cx, cy, payload, color, shape }: { 
  cx?: number; 
  cy?: number; 
  payload?: DataPoint;
  color: string;
  shape: string;
}) {
  if (cx === undefined || cy === undefined) return null;
  
  const size = 8;
  
  switch (shape) {
    case 'square':
      return (
        <rect
          x={cx - size / 2}
          y={cy - size / 2}
          width={size}
          height={size}
          fill={color}
          stroke={color}
          strokeWidth={2}
        />
      );
    case 'triangle':
      const points = `${cx},${cy - size} ${cx - size},${cy + size / 2} ${cx + size},${cy + size / 2}`;
      return <polygon points={points} fill={color} stroke={color} strokeWidth={2} />;
    case 'diamond':
      const diamondPoints = `${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`;
      return <polygon points={diamondPoints} fill={color} stroke={color} strokeWidth={2} />;
    default: // circle
      return <circle cx={cx} cy={cy} r={size / 2} fill={color} stroke={color} strokeWidth={2} />;
  }
}

function CustomLabel({ x, y, value, index }: { x?: number; y?: number; value?: string; index?: number }) {
  if (x === undefined || y === undefined || !value) return null;
  
  return (
    <text
      x={x}
      y={y - 10}
      fill="#a1a1aa"
      fontSize={10}
      textAnchor="middle"
    >
      {value}
    </text>
  );
}

export function TradeoffChart({ series }: TradeoffChartProps) {
  const logNames = [...new Set(series.map((s) => s.logName))];
  
  // Group data by log and sort by threshold
  const logDataMap = new Map<string, LogData>();
  
  logNames.forEach((logName, index) => {
    const logSeries = series
      .filter((s) => s.logName === logName)
      .filter((s) => s.fitnessLoss !== null && s.speedup !== null)
      .map((s) => ({
        fitnessLoss: s.fitnessLoss ?? 0,
        speedup: s.speedup ?? 0,
        label: s.label,
        logName: s.logName,
        benchmarkId: s.benchmarkId,
      }))
      // Sort by fitness loss to create proper line connections
      .sort((a, b) => a.fitnessLoss - b.fitnessLoss);
    
    logDataMap.set(logName, {
      logName,
      color: LOG_COLORS[index % LOG_COLORS.length],
      shape: LOG_SHAPES[index % LOG_SHAPES.length],
      points: logSeries,
    });
  });

  const allPoints = Array.from(logDataMap.values()).flatMap((d) => d.points);
  
  if (allPoints.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-2">Fitness-Speedup Trade-off</h3>
        <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-lg">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">No Trade-off Data</p>
            <p className="text-sm mt-1">Need baseline comparison to calculate trade-offs.</p>
          </div>
        </div>
      </div>
    );
  }

  const maxFitnessLoss = Math.max(...allPoints.map((p) => p.fitnessLoss), 10);
  const maxSpeedup = Math.max(...allPoints.map((p) => p.speedup), 10);
  const minSpeedup = Math.min(...allPoints.map((p) => p.speedup), 0);

  const xMax = Math.ceil(maxFitnessLoss * 1.1);
  const yMax = Math.ceil(maxSpeedup * 1.1);
  const yMin = Math.min(0, Math.floor(minSpeedup * 1.1));

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Fitness-Speedup Trade-off</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Higher and left is better (more speedup, less fitness loss)
      </p>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {Array.from(logDataMap.values()).map(({ logName, color, shape }) => (
          <div key={logName} className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16">
              {shape === 'circle' && <circle cx="8" cy="8" r="6" fill={color} />}
              {shape === 'square' && <rect x="2" y="2" width="12" height="12" fill={color} />}
              {shape === 'triangle' && <polygon points="8,2 14,14 2,14" fill={color} />}
              {shape === 'diamond' && <polygon points="8,1 15,8 8,15 1,8" fill={color} />}
            </svg>
            <span className="text-sm font-medium">{logName}</span>
          </div>
        ))}
      </div>
      
      <div className="h-[450px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#525252" opacity={0.5} />
            <XAxis 
              type="number"
              dataKey="fitnessLoss"
              domain={[0, xMax]}
              tick={{ fontSize: 12, fill: '#a1a1aa' }}
              axisLine={{ stroke: '#525252' }}
              tickLine={{ stroke: '#525252' }}
              label={{ 
                value: 'Fitness Loss (%)', 
                position: 'bottom',
                offset: 0,
                style: { textAnchor: 'middle', fontSize: 13, fill: '#a1a1aa' }
              }}
            />
            <YAxis 
              type="number"
              dataKey="speedup"
              domain={[yMin, yMax]}
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
            <Tooltip content={<CustomTooltip />} />
            
            <ReferenceLine 
              x={10} 
              stroke="#71717a" 
              strokeDasharray="5 5"
              label={{ 
                value: '10% fitness loss', 
                position: 'top',
                fill: '#71717a',
                fontSize: 11,
              }}
            />
            
            <ReferenceLine y={0} stroke="#71717a" strokeWidth={1} />
            
            {Array.from(logDataMap.values()).map(({ logName, color, shape, points }) => (
              <Line
                key={logName}
                data={points}
                type="linear"
                dataKey="speedup"
                stroke={color}
                strokeWidth={2}
                dot={(props) => (
                  <CustomDot 
                    {...props} 
                    color={color} 
                    shape={shape}
                  />
                )}
                activeDot={{ r: 8, fill: color }}
                name={logName}
                isAnimationActive={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Points show different threshold configurations (hover for details)
      </p>
    </div>
  );
}