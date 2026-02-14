import { Button } from '@/components/ui/button';
import { useBenchmarkRunner } from '@/hooks/useBenchmarkRunner';
import {
  BenchmarkHeader,
  BenchmarkStatusBanner,
  ResultSummaryCard,
  LogResultsSection,
  EmptyState,
} from '@/components/benchmark';

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

  if (!session) {
    return <NoSessionFallback onBack={goBack} />;
  }

  const isFileMode = resultSource === 'file';
  const algorithms = isFileMode
    ? fileResults.map((r) => r.algorithm)
    : session.payloads?.map((p) => p.algorithm) ?? [];

  const hasResults = liveResults.size > 0 || fileResults.length > 0;

  return (
    <div className="flex flex-col h-full gap-6 overflow-auto p-6">
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

      {hasResults && (
        <div className="space-y-6">
          {resultSource === 'file' &&
            fileResults.map((exported, index) => (
              <div key={index} className="space-y-4">
                <ResultSummaryCard exported={exported} />
                <LogResultsSection exported={exported} />
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