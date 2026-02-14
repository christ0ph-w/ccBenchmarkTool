import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useSettingsStore } from '@/stores/settingsStore';
import { useFileStore } from '@/stores/fileStore';
import { BENCHMARK_ALGORITHMS } from '@/config/benchmarkAlgorithms';
import { ParameterInput } from './ParameterInput';
import { File, Folder, FileText } from 'lucide-react';
import { useMemo } from 'react';

export function BenchmarkingSettingsPanel() {
  const { benchmarking, setBenchmarkingSettings } = useSettingsStore();
  const { selectedFiles } = useFileStore();

  const hasPtalign = benchmarking.selectedAlgorithms.includes('PTALIGN');
  const ptalignConfig = BENCHMARK_ALGORITHMS['PTALIGN'];

  const { pnmlFiles, ptmlFiles, logFiles } = useMemo(() => {
    return {
      pnmlFiles: selectedFiles.filter(
        (f) => f.type === 'file' && f.name.toLowerCase().endsWith('.pnml')
      ),
      ptmlFiles: selectedFiles.filter(
        (f) => f.type === 'file' && f.name.toLowerCase().endsWith('.ptml')
      ),
      logFiles: selectedFiles.filter(
        (f) => f.type === 'directory' || (f.type === 'file' && f.name.toLowerCase().endsWith('.xes'))
      ),
    };
  }, [selectedFiles]);

  const needsPnml = benchmarking.selectedAlgorithms.some(
    (id) => BENCHMARK_ALGORITHMS[id]?.modelType === 'pnml'
  );
  const needsPtml = benchmarking.selectedAlgorithms.some(
    (id) => BENCHMARK_ALGORITHMS[id]?.modelType === 'ptml'
  );

  const handleAlgorithmToggle = (algorithmId: string, checked: boolean) => {
    const current = benchmarking.selectedAlgorithms;
    const updated = checked
      ? [...current, algorithmId]
      : current.filter((id) => id !== algorithmId);

    setBenchmarkingSettings({ selectedAlgorithms: updated });

    if (checked && algorithmId === 'PTALIGN' && Object.keys(benchmarking.params).length === 0) {
      const defaultParams: Record<string, any> = {};
      ptalignConfig.parameters.forEach((p) => {
        defaultParams[p.key] = p.default;
      });
      setBenchmarkingSettings({ params: defaultParams });
    }
  };

  const handleCoreCountChange = (value: string) => {
    const coreCount = Math.max(1, parseInt(value) || 1);
    setBenchmarkingSettings({ coreCount });
  };

  const handleParamChange = (paramKey: string, value: any) => {
    setBenchmarkingSettings({ params: { [paramKey]: value } });
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      <div className="p-3 border-b shrink-0">
        <h3 className="font-semibold">Benchmark Configuration</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <SelectedFilesSection
          pnmlFiles={pnmlFiles}
          ptmlFiles={ptmlFiles}
          logFiles={logFiles}
          showPnml={needsPnml || benchmarking.selectedAlgorithms.length === 0}
          showPtml={needsPtml || benchmarking.selectedAlgorithms.length === 0}
        />

        <div className="space-y-3">
          <Label>Algorithms</Label>
          <div className="space-y-2">
            {Object.entries(BENCHMARK_ALGORITHMS).map(([id, algo]) => (
              <div key={id} className="flex items-center gap-2">
                <Checkbox
                  id={`algo-${id}`}
                  checked={benchmarking.selectedAlgorithms.includes(id)}
                  onCheckedChange={(checked) => handleAlgorithmToggle(id, checked === true)}
                />
                <Label htmlFor={`algo-${id}`} className="font-normal cursor-pointer">
                  {algo.name}
                  <span className="text-xs text-muted-foreground ml-2">
                    ({algo.description})
                  </span>
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="benchmark-coreCount">CPU Cores</Label>
          <Input
            id="benchmark-coreCount"
            type="number"
            min="1"
            value={benchmarking.coreCount}
            onChange={(e) => handleCoreCountChange(e.target.value)}
            className="w-20"
          />
        </div>

        {hasPtalign && ptalignConfig.parameters.length > 0 && (
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium">{ptalignConfig.name} Options</h4>
            {ptalignConfig.parameters.map((param) => (
              <ParameterInput
                key={param.key}
                parameter={param}
                value={benchmarking.params[param.key]}
                onChange={(value) => handleParamChange(param.key, value)}
                allParams={benchmarking.params}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface FileRef {
  name: string;
  path: string;
}

function SelectedFilesSection({ pnmlFiles, ptmlFiles, logFiles, showPnml, showPtml }: {
  pnmlFiles: FileRef[];
  ptmlFiles: FileRef[];
  logFiles: FileRef[];
  showPnml: boolean;
  showPtml: boolean;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Selected Files</h4>

      {showPnml && (
        <FileDisplay
          icon={<File className="h-4 w-4 text-blue-500" />}
          label="Petri Net (.pnml)"
          files={pnmlFiles}
          emptyText="No .pnml file selected"
        />
      )}

      {showPtml && (
        <FileDisplay
          icon={<File className="h-4 w-4 text-purple-500" />}
          label="Process Tree (.ptml)"
          files={ptmlFiles}
          emptyText="No .ptml file selected"
        />
      )}

      <FileDisplay
        icon={<Folder className="h-4 w-4 text-green-500" />}
        label="Log Directory / Files"
        files={logFiles}
        emptyText="No log directory or .xes file selected"
      />
    </div>
  );
}

function FileDisplay({ icon, label, files, emptyText }: {
  icon: React.ReactNode;
  label: string;
  files: FileRef[];
  emptyText: string;
}) {
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