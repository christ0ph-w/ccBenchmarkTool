import { useMemo, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/settingsStore';
import { useFileStore } from '@/stores/fileStore';
import { clusteringService } from '@/services/clusteringService';
import { useConsoleStore } from '@/stores/consoleStore';
import { CLUSTERING_ALGORITHMS } from '@/config/clusteringAlgorithms';
import { ActionSection, StepList, SettingsSummary } from './components';
import type { ValidationStep, SettingsItem } from './types';

export function ClusteringSection() {
  const { clustering } = useSettingsStore();
  const { selectedFiles, workingDirectory, refreshFileTree } = useFileStore();
  const { addLog } = useConsoleStore();
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');

  const eventLogs = useMemo(
    () => selectedFiles.filter((f) => f.type === 'file' && f.name.toLowerCase().endsWith('.xes')),
    [selectedFiles]
  );

  const log = (level: 'log' | 'warn' | 'error', message: string) => {
    addLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      source: 'renderer',
      component: 'Clustering',
      message,
    });
  };

  const steps = useMemo<ValidationStep[]>(() => [
    eventLogs.length > 0
      ? { label: 'Event log', status: 'ok', detail: eventLogs[0].name }
      : { label: 'Event log', status: 'warning', detail: 'Select a .xes file' },
  ], [eventLogs]);

  const clusteringAlgoConfig = CLUSTERING_ALGORITHMS[clustering.algorithm];

  const settings = useMemo<SettingsItem[]>(() => {
    const items: SettingsItem[] = [
      { label: 'Algorithm', value: clusteringAlgoConfig?.name ?? clustering.algorithm },
    ];

    if (clustering.params) {
      Object.entries(clustering.params).forEach(([key, value]) => {
        const paramConfig = clusteringAlgoConfig?.parameters?.find((p: any) => p.key === key);
        if (paramConfig) {
          items.push({ label: paramConfig.label, value: String(value) });
        }
      });
    }

    return items;
  }, [clustering, clusteringAlgoConfig]);

  const canRun = steps.every((s) => s.status === 'ok') && !!workingDirectory;

  const handleRun = async () => {
    if (!canRun) return;

    setStatus('running');
    log('log', `Starting ${clustering.algorithm} on ${eventLogs[0].name}...`);

    try {
      const result = await clusteringService.clusterFile({
        file_path: eventLogs[0].path,
        clustering_algorithm: clustering.algorithm,
        algorithm_params: clustering.params,
      });

      setStatus('done');
      log('log', `Complete: ${result.data?.num_clusters} clusters found`);

      if (result.data?.cluster_sizes) {
        log('log', `Cluster sizes: ${JSON.stringify(result.data.cluster_sizes)}`);
      }

      if (result.data?.exported_files) {
        log('log', `Exported ${result.data.exported_files.length} cluster files`);
      }

      // Refresh file tree to show new files
      await refreshFileTree();
      log('log', 'File tree refreshed');
    } catch (err) {
      setStatus('error');
      log('error', `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <ActionSection title="Clustering">
      <StepList steps={steps} />
      <SettingsSummary items={settings} />
      <Button
        onClick={handleRun}
        disabled={!canRun || status === 'running'}
        className="w-full mt-3"
      >
        <FlaskConical className="h-4 w-4 mr-2" />
        {status === 'running' ? 'Clustering...' : 'Run Clustering'}
      </Button>
    </ActionSection>
  );
}