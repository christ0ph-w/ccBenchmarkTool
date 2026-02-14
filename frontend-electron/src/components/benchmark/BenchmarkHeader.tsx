import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { BenchmarkStatus } from '@/hooks/useBenchmarkRunner';

interface BenchmarkHeaderProps {
  isComparative: boolean;
  status: BenchmarkStatus;
  onStart: () => void;
  onBack: () => void;
}

export function BenchmarkHeader({
  isComparative,
  status,
  onStart,
  onBack,
}: BenchmarkHeaderProps) {
  return (
    <div className="flex items-center justify-between sticky top-0 bg-background z-10 pb-4 border-b">
      <div>
        <h1 className="text-2xl font-bold">Benchmark Results</h1>
        <p className="text-sm text-slate-600">
          {isComparative ? 'Comparative' : 'Single Algorithm'} Benchmark
        </p>
      </div>

      <div className="flex gap-2">
        <StartButton status={status} onClick={onStart} />
        <BackButton onClick={onBack} />
      </div>
    </div>
  );
}

function StartButton({ status, onClick }: { status: BenchmarkStatus; onClick: () => void }) {
  const isRunning = status === 'running';

  return (
    <Button onClick={onClick} disabled={isRunning} className="px-6">
      {isRunning ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Running...
        </>
      ) : status === 'completed' ? (
        'Run Again'
      ) : (
        'Start Benchmark'
      )}
    </Button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick} variant="outline">
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back
    </Button>
  );
}