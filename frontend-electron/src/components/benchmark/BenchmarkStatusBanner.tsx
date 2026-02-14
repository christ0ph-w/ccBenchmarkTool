import { AlertCircle } from 'lucide-react';
import { BenchmarkStatus } from '@/hooks/useBenchmarkRunner';

interface BenchmarkStatusBannerProps {
  status: BenchmarkStatus;
  benchmarkId: string;
  error: string;
}

export function BenchmarkStatusBanner({
  status,
  benchmarkId,
  error,
}: BenchmarkStatusBannerProps) {
  return (
    <div className="space-y-3">
      {benchmarkId && <StatusBar status={status} benchmarkId={benchmarkId} />}
      {error && <ErrorBar error={error} />}
    </div>
  );
}

function StatusBar({ status, benchmarkId }: { status: BenchmarkStatus; benchmarkId: string }) {
  const config = getStatusConfig(status);

  return (
    <div className={`p-3 rounded-lg border ${config.colors}`}>
      <p className="text-sm font-medium">
        Status: <span className="font-bold">{config.label}</span>
        <span className="text-xs ml-4">ID: {benchmarkId.substring(0, 12)}...</span>
      </p>
    </div>
  );
}

function ErrorBar({ error }: { error: string }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-900 text-sm font-semibold flex items-center gap-1">
        <AlertCircle className="h-4 w-4" />
        Error
      </p>
      <p className="text-red-700 text-sm mt-1">{error}</p>
    </div>
  );
}

interface StatusConfig {
  label: string;
  colors: string;
}

function getStatusConfig(status: BenchmarkStatus): StatusConfig {
  switch (status) {
    case 'running':
      return { label: 'RUNNING', colors: 'bg-yellow-50 border-yellow-200 text-yellow-900' };
    case 'completed':
      return { label: 'COMPLETED', colors: 'bg-blue-50 border-blue-200 text-blue-900' };
    case 'error':
      return { label: 'ERROR', colors: 'bg-red-50 border-red-200 text-red-900' };
    default:
      return { label: 'IDLE', colors: 'bg-slate-50 border-slate-200 text-slate-900' };
  }
}