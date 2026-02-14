import { useSettingsStore } from '@/stores/settingsStore';
import { useFileStore } from '@/stores/fileStore';
import { CLUSTERING_ALGORITHMS } from '@/config/clusteringAlgorithms';
import { ParameterInput } from './ParameterInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { File, FileText } from 'lucide-react';
import { useMemo } from 'react';

export function ClusteringSettingsPanel() {
  const { clustering, setClusteringSettings } = useSettingsStore();
  const { selectedFiles } = useFileStore();

  const algorithm = CLUSTERING_ALGORITHMS[clustering.algorithm];

  const eventLogs = useMemo(
    () => selectedFiles.filter((f) => f.type === 'file' && f.name.toLowerCase().endsWith('.xes')),
    [selectedFiles]
  );

  const handleAlgorithmChange = (algorithmId: string) => {
    const newAlgorithm = CLUSTERING_ALGORITHMS[algorithmId];
    const defaultParams: Record<string, any> = {};
    newAlgorithm.parameters.forEach((p) => {
      defaultParams[p.key] = p.default;
    });

    setClusteringSettings({
      algorithm: algorithmId,
      params: defaultParams,
    });
  };

  const handleParamChange = (paramKey: string, value: any) => {
    setClusteringSettings({
      params: { [paramKey]: value },
    });
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      <div className="p-3 border-b shrink-0">
        <h3 className="font-semibold">Clustering Configuration</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Selected Files</h4>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <File className="h-4 w-4 text-blue-500" />
              <Label className="text-xs font-medium">Event Log (.xes)</Label>
            </div>
            {eventLogs.length > 0 ? (
              <div className="text-xs text-muted-foreground ml-6 space-y-1">
                {eventLogs.map((f) => (
                  <p key={f.path} className="truncate flex items-center gap-1">
                    <FileText className="h-3 w-3 inline" />
                    {f.name}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-600 ml-6 italic">No .xes file selected</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="algorithm-select">Algorithm</Label>
          <Select value={clustering.algorithm} onValueChange={handleAlgorithmChange}>
            <SelectTrigger id="algorithm-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CLUSTERING_ALGORITHMS).map(([id, algo]) => (
                <SelectItem key={id} value={id}>
                  {algo.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{algorithm?.description}</p>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Parameters</h4>
          {algorithm?.parameters.map((param) => (
            <ParameterInput
              key={param.key}
              parameter={param}
              value={clustering.params[param.key]}
              onChange={(value) => handleParamChange(param.key, value)}
              allParams={clustering.params}
            />
          ))}
        </div>
      </div>
    </div>
  );
}