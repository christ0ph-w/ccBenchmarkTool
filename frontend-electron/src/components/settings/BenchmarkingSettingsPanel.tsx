import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useSettingsStore } from '@/stores/settingsStore';
import { useFileStore } from '@/stores/fileStore';
import { File, Folder, FileText } from 'lucide-react';
import { useMemo } from 'react';

// TODO: Extract to config file (like clusteringAlgorithms.ts) when backend supports it
const CONFORMANCE_ALGORITHMS = [
  { id: 'ILP', name: 'ILP', description: 'Integer Linear Programming' },
  { id: 'SPLITPOINT', name: 'Splitpoint', description: 'Splitpoint-based conformance checking' },
  { id: 'PTALIGN', name: 'PTALIGN', description: 'Process Tree alignment' },
];

export function BenchmarkingSettingsPanel() {
  const { benchmarking, setBenchmarkingSettings } = useSettingsStore();
  const { selectedFiles } = useFileStore();

  const { modelFiles, logFiles } = useMemo(() => {
    const models = selectedFiles.filter(
      (f) => f.type === 'file' && (f.name.toLowerCase().endsWith('.pnml') || f.name.toLowerCase().endsWith('.ptml'))
    );
    const logs = selectedFiles.filter(
      (f) => f.type === 'directory' || (f.type === 'file' && f.name.toLowerCase().endsWith('.xes'))
    );
    return { modelFiles: models, logFiles: logs };
  }, [selectedFiles]);

  const handleAlgorithmToggle = (algorithmId: string) => {
    const current = benchmarking.selectedAlgorithms;
    const newSelection = current.includes(algorithmId)
      ? current.filter((id) => id !== algorithmId)
      : [...current, algorithmId];

    setBenchmarkingSettings({ selectedAlgorithms: newSelection });
  };

  const handleCoreCountChange = (value: string) => {
    const coreCount = Math.max(1, parseInt(value) || 1);
    setBenchmarkingSettings({ coreCount });
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      <div className="p-3 border-b shrink-0">
        <h3 className="font-semibold">Benchmark Configuration</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <SelectedFilesSection modelFiles={modelFiles} logFiles={logFiles} />

        <AlgorithmSection
          selectedAlgorithms={benchmarking.selectedAlgorithms}
          onToggle={handleAlgorithmToggle}
        />

        <CoreCountSection
          coreCount={benchmarking.coreCount}
          onChange={handleCoreCountChange}
        />
      </div>
    </div>
  );
}

interface SelectedFilesSectionProps {
  modelFiles: { name: string; path: string }[];
  logFiles: { name: string; path: string; type: string }[];
}

function SelectedFilesSection({ modelFiles, logFiles }: SelectedFilesSectionProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Selected Files</h4>

      <FileDisplay
        icon={<File className="h-4 w-4 text-blue-500" />}
        label="Model File(s)"
        files={modelFiles}
        emptyText="No model file selected"
      />

      <FileDisplay
        icon={<Folder className="h-4 w-4 text-green-500" />}
        label="Log Directory / Files"
        files={logFiles}
        emptyText="No log directory or .xes file selected"
      />
    </div>
  );
}

interface FileDisplayProps {
  icon: React.ReactNode;
  label: string;
  files: { name: string; path: string }[];
  emptyText: string;
}

function FileDisplay({ icon, label, files, emptyText }: FileDisplayProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        {icon}
        <Label className="text-xs font-medium">{label}</Label>
      </div>
      {files.length > 0 ? (
        <div className="text-xs text-muted-foreground ml-6 space-y-1">
          {files.map((f) => (
            <p key={f.path} className="truncate flex items-center gap-1">
              <FileText className="h-3 w-3 inline" />
              {f.name}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-xs text-amber-600 ml-6 italic">{emptyText}</p>
      )}
    </div>
  );
}

interface AlgorithmSectionProps {
  selectedAlgorithms: string[];
  onToggle: (id: string) => void;
}

function AlgorithmSection({ selectedAlgorithms, onToggle }: AlgorithmSectionProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Conformance Algorithms</h4>
      <div className="space-y-3">
        {CONFORMANCE_ALGORITHMS.map((algo) => (
          <div key={algo.id} className="flex items-start space-x-2">
            <Checkbox
              id={algo.id}
              checked={selectedAlgorithms.includes(algo.id)}
              onCheckedChange={() => onToggle(algo.id)}
            />
            <div className="grid gap-1 leading-none">
              <Label htmlFor={algo.id} className="text-sm font-medium">
                {algo.name}
              </Label>
              <p className="text-xs text-muted-foreground">{algo.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CoreCountSectionProps {
  coreCount: number;
  onChange: (value: string) => void;
}

function CoreCountSection({ coreCount, onChange }: CoreCountSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="coreCount" className="text-sm font-medium">
        CPU Cores
      </Label>
      <Input
        id="coreCount"
        type="number"
        min="1"
        value={coreCount}
        onChange={(e) => onChange(e.target.value)}
        className="w-20"
      />
    </div>
  );
}