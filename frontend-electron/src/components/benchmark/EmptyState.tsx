import { BarChart3 } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <BarChart3 className="h-16 w-16 text-slate-300 mb-4" />
      <p className="text-slate-500 text-lg">
        Click "Start Benchmark" to run and see results
      </p>
    </div>
  );
}