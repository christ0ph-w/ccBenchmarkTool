import { Folder, AlertCircle } from 'lucide-react';
import { useFileStore } from '@/stores/fileStore';
import { ClusteringSection } from './ClusteringSection';
import { BenchmarkSection } from './BenchmarkSection';
import { ResultsSection } from './ResultsSection';

export function ActionsPanel() {
  const { workingDirectory } = useFileStore();

  return (
    <div className="flex flex-col h-full border rounded-lg">
      <div className="p-3 border-b shrink-0 flex items-center justify-between">
        <h3 className="font-semibold">Actions</h3>
        <div className="flex items-center gap-1.5 text-xs">
          {workingDirectory ? (
            <>
              <Folder className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground truncate max-w-[150px]">
                {workingDirectory.split(/[/\\]/).pop()}
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-amber-600">No working directory</span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <ClusteringSection />
        <BenchmarkSection />
        <ResultsSection />
      </div>
    </div>
  );
}