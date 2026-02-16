import { useMemo } from 'react';
import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/settingsStore';
import { useFileStore } from '@/stores/fileStore';
import { useConsoleStore } from '@/stores/consoleStore';
import { BENCHMARK_ALGORITHMS } from '@/config/benchmarkAlgorithms';
import { ActionSection, StepList, SettingsSummary } from './components';
import type { ValidationStep, SettingsItem } from './types';
import type { BenchmarkPayload, BenchmarkSession } from '@/types/benchmarkTypes';

export function BenchmarkSection() {
  const navigate = useNavigate();
  const { benchmarking } = useSettingsStore();
  const { selectedFiles } = useFileStore();
  const { addLog } = useConsoleStore();

  const log = (level: 'log' | 'warn' | 'error', message: string) => {
    addLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      source: 'renderer',
      component: 'Benchmark',
      message,
    });
  };

  const { pnmlFiles, ptmlFiles, eventLogs, directories } = useMemo(() => ({
    pnmlFiles: selectedFiles.filter((f) => f.type === 'file' && f.name.toLowerCase().endsWith('.pnml')),
    ptmlFiles: selectedFiles.filter((f) => f.type === 'file' && f.name.toLowerCase().endsWith('.ptml')),
    eventLogs: selectedFiles.filter((f) => f.type === 'file' && f.name.toLowerCase().endsWith('.xes')),
    directories: selectedFiles.filter((f) => f.type === 'directory'),
  }), [selectedFiles]);

  const needsPnml = benchmarking.selectedAlgorithms.some(
    (id) => BENCHMARK_ALGORITHMS[id]?.modelType === 'pnml'
  );
  const needsPtml = benchmarking.selectedAlgorithms.some(
    (id) => BENCHMARK_ALGORITHMS[id]?.modelType === 'ptml'
  );

  const steps = useMemo<ValidationStep[]>(() => {
    const result: ValidationStep[] = [];

    // Only show model requirements (algorithms already in settings)
    if (needsPnml) {
      result.push(
        pnmlFiles.length > 0
          ? { label: 'Petri Net model', status: 'ok', detail: pnmlFiles[0].name }
          : {
              label: 'Petri Net model',
              status: 'warning',
              detail: 'Required by ' + benchmarking.selectedAlgorithms
                .filter((id) => BENCHMARK_ALGORITHMS[id]?.modelType === 'pnml')
                .join(', '),
            }
      );
    }

    if (needsPtml) {
      result.push(
        ptmlFiles.length > 0
          ? { label: 'Process Tree model', status: 'ok', detail: ptmlFiles[0].name }
          : { label: 'Process Tree model', status: 'warning', detail: 'Required by PTALIGN' }
      );
    }

    // Log data requirement
    const hasLogs = eventLogs.length > 0 || directories.length > 0;
    result.push(
      hasLogs
        ? {
            label: 'Log data',
            status: 'ok',
            detail: directories.length > 0
              ? directories[0].name
              : `${eventLogs.length} file${eventLogs.length > 1 ? 's' : ''}`,
          }
        : { label: 'Log data', status: 'warning', detail: 'Select logs or a directory' }
    );

    return result;
  }, [benchmarking.selectedAlgorithms, needsPnml, needsPtml, pnmlFiles, ptmlFiles, eventLogs, directories]);

  const settings = useMemo<SettingsItem[]>(() => {
    const items: SettingsItem[] = [];

    if (benchmarking.selectedAlgorithms.length > 0) {
      items.push({ label: 'Algorithms', value: benchmarking.selectedAlgorithms.join(', ') });
    }

    items.push({ label: 'CPU Cores', value: String(benchmarking.coreCount) });

    if (benchmarking.selectedAlgorithms.includes('PTALIGN') && Object.keys(benchmarking.params).length > 0) {
      const ptalignConfig = BENCHMARK_ALGORITHMS['PTALIGN'];
      ptalignConfig.parameters.forEach((param) => {
        const value = benchmarking.params[param.key];
        if (value !== undefined) {
          items.push({ label: param.label, value: String(value) });
        }
      });
    }

    return items;
  }, [benchmarking]);

  // Need algorithms selected + all steps OK
  const canRun = benchmarking.selectedAlgorithms.length > 0 && steps.every((s) => s.status === 'ok');

  const handleRun = () => {
    if (!canRun) return;

    log('log', `Starting benchmark with algorithms: ${benchmarking.selectedAlgorithms.join(', ')}`);
    log('log', `CPU Cores: ${benchmarking.coreCount}, Logs: ${eventLogs.length + directories.length} sources`);

    const logDir = directories.length > 0 ? directories[0].path : eventLogs[0].path;

    const payloads: BenchmarkPayload[] = benchmarking.selectedAlgorithms.map((algorithmId) => {
      const algo = BENCHMARK_ALGORITHMS[algorithmId];

      const payload: BenchmarkPayload = {
        algorithm: algorithmId,
        numThreads: benchmarking.coreCount,
        logDirectory: logDir,
      };

      if (algo.modelType === 'pnml') {
        payload.pnmlModelPath = pnmlFiles[0].path;
      } else {
        payload.ptmlModelPath = ptmlFiles[0].path;
      }

      if (algorithmId === 'PTALIGN') {
        payload.useBounds = benchmarking.params.useBounds ?? true;
        payload.useWarmStart = benchmarking.params.useWarmStart ?? true;
        payload.boundThreshold = benchmarking.params.boundThreshold ?? 1.0;
        payload.boundedSkipStrategy = benchmarking.params.boundedSkipStrategy ?? 'upper';
        payload.propagateCostsAcrossClusters = benchmarking.params.propagateCostsAcrossClusters ?? false;
      }

      return payload;
    });

    const session: BenchmarkSession = { payloads };
    navigate('/benchmark', { state: session });
  };

  return (
    <ActionSection title="Benchmarking">
      <StepList steps={steps} />
      <SettingsSummary items={settings} />
      <Button
        onClick={handleRun}
        disabled={!canRun}
        className="w-full mt-3"
        variant="secondary"
      >
        <Play className="h-4 w-4 mr-2" />
        Run Benchmark
      </Button>
    </ActionSection>
  );
}