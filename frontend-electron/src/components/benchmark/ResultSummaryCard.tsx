import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { BenchmarkResult, BenchmarkExportedResult } from '@/types/benchmarkTypes';

interface LiveResultProps {
  results: BenchmarkResult;
  exported?: never;
  selectable?: false;
}

interface FileResultProps {
  results?: never;
  exported: BenchmarkExportedResult;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  onRemove?: () => void;
  defaultExpanded?: boolean;
}

type ResultSummaryCardProps = LiveResultProps | FileResultProps;

export function ResultSummaryCard(props: ResultSummaryCardProps) {
  if (props.exported) {
    return <ExportedSummary {...props} />;
  }
  return <LiveSummary data={props.results} />;
}

function LiveSummary({ data }: { data: BenchmarkResult }) {
  const [expanded, setExpanded] = useState(true);
  
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
      expanded={expanded}
      onToggleExpand={() => setExpanded(!expanded)}
    />
  );
}

function ExportedSummary({ 
  exported, 
  selectable, 
  selected, 
  onSelectChange, 
  onRemove,
  defaultExpanded = false 
}: FileResultProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const data = exported!;
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
      expanded={expanded}
      onToggleExpand={() => setExpanded(!expanded)}
      selectable={selectable}
      selected={selected}
      onSelectChange={onSelectChange}
      onRemove={onRemove}
    />
  );
}

interface StatItem {
  label: string;
  value: string;
  highlight?: boolean;
}

interface SummaryLayoutProps {
  algorithm: string;
  subtitle: string;
  stats: StatItem[];
  ptalignConfig?: Record<string, unknown>;
  expanded: boolean;
  onToggleExpand: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  onRemove?: () => void;
}

/**
 * Format ptalignConfig into a short summary string
 */
function formatConfigSummary(config: Record<string, unknown>): string {
  const parts: string[] = [];
  
  const useBounds = config.useBounds as boolean | undefined;
  const useWarmStart = config.useWarmStart as boolean | undefined;
  const boundThreshold = config.boundThreshold as number | undefined;
  
  if (!useBounds && !useWarmStart) {
    return 'Baseline';
  }
  
  if (useWarmStart) {
    parts.push('WS');
  }
  
  if (useBounds && boundThreshold !== undefined && boundThreshold !== null) {
    parts.push(`t=${boundThreshold}`);
  } else if (useBounds) {
    parts.push('Bounds');
  }
  
  return parts.join(', ') || 'Default';
}

function SummaryLayout({ 
  algorithm, 
  subtitle, 
  stats, 
  ptalignConfig,
  expanded,
  onToggleExpand,
  selectable,
  selected,
  onSelectChange,
  onRemove,
}: SummaryLayoutProps) {
  // Quick stats for collapsed view
  const fitnessVal = stats.find(s => s.label === 'Avg Fitness')?.value ?? '';
  const timeVal = stats.find(s => s.label === 'Compute Time')?.value 
    ?? stats.find(s => s.label === 'Execution Time')?.value ?? '';
  const configSummary = ptalignConfig ? formatConfigSummary(ptalignConfig) : null;
  
  return (
    <Card className="overflow-hidden">
      {/* Header - always visible */}
      <div 
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggleExpand}
      >
        {selectable && (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelectChange?.(checked === true)}
            />
          </div>
        )}
        
        <button className="p-0.5">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold">{algorithm}</h2>
            {configSummary && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {configSummary}
              </span>
            )}
            {!expanded && (
              <span className="text-sm text-muted-foreground">
                — {fitnessVal} · {timeVal}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        </div>
        
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Expandable content */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} highlight={stat.highlight} />
            ))}
          </div>

          {ptalignConfig && <PtalignConfigDisplay config={ptalignConfig} />}
        </div>
      )}
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
    <div className="pt-3 border-t">
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