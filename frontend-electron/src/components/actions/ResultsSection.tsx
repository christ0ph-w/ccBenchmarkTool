import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFileStore } from '@/stores/fileStore';
import { ActionSection } from './components';

export function ResultsSection() {
  const navigate = useNavigate();
  const { selectedFiles } = useFileStore();

  const jsonFiles = useMemo(
    () => selectedFiles.filter((f) => f.type === 'file' && f.name.toLowerCase().endsWith('.json')),
    [selectedFiles]
  );

  const hasFiles = jsonFiles.length > 0;

  const handleView = () => {
    if (!hasFiles) return;
    const filePaths = jsonFiles.map((f) => f.path);
    navigate('/benchmark', { state: { resultFiles: filePaths } });
  };

  return (
    <ActionSection title="Results">
      {hasFiles ? (
        <div className="space-y-1.5">
          {jsonFiles.map((f) => (
            <div key={f.path} className="flex items-center gap-2 text-sm">
              <FileJson className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="text-foreground truncate">{f.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Select .json result files to view
        </p>
      )}
      <Button
        onClick={handleView}
        disabled={!hasFiles}
        className="w-full mt-3"
        variant="outline"
      >
        <Eye className="h-4 w-4 mr-2" />
        View Result{jsonFiles.length > 1 ? 's' : ''}
      </Button>
    </ActionSection>
  );
}