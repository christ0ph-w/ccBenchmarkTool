import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useBenchmarkRunner } from '@/hooks/useBenchmarkRunner';
import {
  BenchmarkHeader,
  BenchmarkStatusBanner,
  ResultSummaryCard,
  LogResultsSection,
  EmptyState,
} from '@/components/benchmark';
import { createComparison } from '@/lib/comparisonUtils';
import { ComparisonData } from '@/types/comparisonTypes';
import { ComparisonView } from '@/components/comparison/ComparisonView';
import { BarChart3, X } from 'lucide-react';

export function BenchmarkView() {
  const {
    session,
    status,
    currentAlgorithm,
    progress,
    error,
    liveResults,
    fileResults,
    resultSource,
    startBenchmark,
    goBack,
  } = useBenchmarkRunner();

  // Selection state for file results
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Removed results (hidden from view)
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  // Current comparison being viewed
  const [comparison, setComparison] = useState<ComparisonData | null>(null);

  // Filter out removed results
  const visibleFileResults = useMemo(() => 
    fileResults.filter((r) => !removedIds.has(r.benchmarkId)),
    [fileResults, removedIds]
  );

  if (!session) {
    return <NoSessionFallback onBack={goBack} />;
  }

  // If viewing a comparison, show that instead
  if (comparison) {
    return (
      <ComparisonView 
        comparison={comparison} 
        onBack={() => setComparison(null)} 
      />
    );
  }

  const isFileMode = resultSource === 'file';
  const algorithms = isFileMode
    ? visibleFileResults.map((r) => r.algorithm)
    : session.payloads?.map((p) => p.algorithm) ?? [];

  const hasResults = liveResults.size > 0 || visibleFileResults.length > 0;

  const handleSelectChange = (benchmarkId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(benchmarkId);
      } else {
        next.delete(benchmarkId);
      }
      return next;
    });
  };

  const handleRemove = (benchmarkId: string) => {
    setRemovedIds((prev) => new Set(prev).add(benchmarkId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(benchmarkId);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = visibleFileResults.map((r) => r.benchmarkId);
    setSelectedIds(new Set(allIds));
  };

  const handleSelectNone = () => {
    setSelectedIds(new Set());
  };

  const handleCreateComparison = () => {
    const selectedResults = visibleFileResults
      .filter((r) => selectedIds.has(r.benchmarkId))
      .map((r) => ({
        result: r,
        filename: `benchmark_${r.benchmarkId.substring(0, 8)}.json`,
      }));

    if (selectedResults.length < 2) {
      return;
    }

    const comparisonData = createComparison(
      selectedResults,
      `Comparison ${new Date().toLocaleString()}`
    );

    setComparison(comparisonData);
  };

  const selectedCount = selectedIds.size;
  const canCompare = selectedCount >= 2;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed header area */}
      <div className="shrink-0 p-6 pb-0 space-y-6">
        <BenchmarkHeader
          algorithms={algorithms}
          status={status}
          currentAlgorithm={currentAlgorithm}
          progress={progress}
          onStart={isFileMode ? undefined : startBenchmark}
          onBack={goBack}
          isFileMode={isFileMode}
        />

        <BenchmarkStatusBanner
          status={status}
          currentAlgorithm={currentAlgorithm}
          progress={progress}
          error={error}
          isFileMode={isFileMode}
        />

        {/* Selection toolbar for file mode */}
        {isFileMode && visibleFileResults.length > 0 && (
          <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {selectedCount} of {visibleFileResults.length} selected
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSelectNone}>
                  Select None
                </Button>
              </div>
            </div>
            
            <Button 
              onClick={handleCreateComparison}
              disabled={!canCompare}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Compare Selected ({selectedCount})
            </Button>
          </div>
        )}
      </div>

      {/* Scrollable results area */}
      <div className="flex-1 overflow-auto p-6 pt-4">
        {hasResults && (
          <div className="space-y-4">
            {resultSource === 'file' &&
              visibleFileResults.map((exported) => (
                <div key={exported.benchmarkId} className="space-y-2">
                  <ResultSummaryCard 
                    exported={exported}
                    selectable={true}
                    selected={selectedIds.has(exported.benchmarkId)}
                    onSelectChange={(selected) => handleSelectChange(exported.benchmarkId, selected)}
                    onRemove={() => handleRemove(exported.benchmarkId)}
                    defaultExpanded={false}
                  />
                  {/* Only show log results when expanded - we could add a state for this */}
                </div>
              ))
            }

            {resultSource === 'live' &&
              Array.from(liveResults.entries()).map(([algorithm, result]) => (
                <div key={algorithm} className="space-y-4">
                  <ResultSummaryCard results={result} />
                  <LogResultsSection results={result} />
                </div>
              ))
            }
          </div>
        )}

        {!hasResults && status === 'idle' && <EmptyState />}
      </div>
    </div>
  );
}

function NoSessionFallback({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <p className="text-slate-600">No benchmark session</p>
      <Button onClick={onBack} variant="outline">
        Back
      </Button>
    </div>
  );
}