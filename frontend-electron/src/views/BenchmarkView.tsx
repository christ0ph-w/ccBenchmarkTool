import { Button } from '@/components/ui/button';
import { useBenchmarkRunner } from '@/hooks/useBenchmarkRunner';
import { BenchmarkResult, ComparativeResult } from '@/types/benchmarkTypes';
import {
  BenchmarkHeader,
  BenchmarkStatusBanner,
  ComparativeResultsCard,
  SingleResultsCard,
  PerformanceCharts,
  EmptyState,
} from '@/components/benchmark';

export function BenchmarkView() {
  const {
    session,
    status,
    benchmarkId,
    error,
    results,
    startBenchmark,
    goBack,
  } = useBenchmarkRunner();

  if (!session) {
    return <NoSessionFallback onBack={goBack} />;
  }

  const { isComparative } = session;
  const showResults = results && status === 'completed';

  return (
    <div className="flex flex-col h-full gap-6 overflow-auto p-6">
      <BenchmarkHeader
        isComparative={isComparative}
        status={status}
        onStart={startBenchmark}
        onBack={goBack}
      />

      <BenchmarkStatusBanner
        status={status}
        benchmarkId={benchmarkId}
        error={error}
      />

      {showResults && isComparative && (
        <ComparativeResults results={results as ComparativeResult} />
      )}

      {showResults && !isComparative && (
        <SingleResultsCard results={results as BenchmarkResult} />
      )}

      {!results && status === 'idle' && <EmptyState />}
    </div>
  );
}

function ComparativeResults({ results }: { results: ComparativeResult }) {
  return (
    <div className="space-y-6">
      <ComparativeResultsCard results={results} />
      <PerformanceCharts results={results} />
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