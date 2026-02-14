import { AlertCircle } from 'lucide-react';
import { BenchmarkStatus } from '@/hooks/useBenchmarkRunner';

interface BenchmarkStatusBannerProps {
  status: BenchmarkStatus;
  currentAlgorithm: string;
  progress: { current: number; total: number };
  error: string;
  isFileMode?: boolean;
}

export function BenchmarkStatusBanner({ status, currentAlgorithm, progress, error, isFileMode }: BenchmarkStatusBannerProps) {
  if (status === 'idle' && !error) return null;

  return (
    <div className="space-y-3">
      {status === 'running' && !isFileMode && (
        <div className="space-y-2">
          <div className="p-3 rounded-lg border bg-yellow-50 border-yellow-200 text-yellow-900">
            <p className="text-sm font-medium">
              Running {currentAlgorithm} ({progress.current}/{progress.total})
            </p>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {status === 'completed' && !isFileMode && (
        <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 text-blue-900">
          <p className="text-sm font-medium">
            Completed — {progress.total} algorithm{progress.total > 1 ? 's' : ''} finished
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-900 text-sm font-semibold flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Error
          </p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}