import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { BenchmarkStatus } from '@/hooks/useBenchmarkRunner';

interface BenchmarkHeaderProps {
  algorithms: string[];
  status: BenchmarkStatus;
  currentAlgorithm: string;
  progress: { current: number; total: number };
  onStart: () => void;
  onBack: () => void;
}

export function BenchmarkHeader({ algorithms, status, currentAlgorithm, progress, onStart, onBack }: BenchmarkHeaderProps) {
  const isRunning = status === 'running';

  return (
    <div className="flex items-center justify-between sticky top-0 bg-background z-10 pb-4 border-b">
      <div>
        <h1 className="text-2xl font-bold">Benchmark Results</h1>
        <p className="text-sm text-slate-600">
          {algorithms.join(' · ')}
          {isRunning && ` — Running ${currentAlgorithm} (${progress.current}/${progress.total})`}
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={onStart} disabled={isRunning} className="px-6">
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running {progress.current}/{progress.total}
            </>
          ) : status === 'completed' ? (
            'Run Again'
          ) : (
            'Start Benchmark'
          )}
        </Button>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
    </div>
  );
}