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

function parseThresholds(input: string): number[] {
  return input
    .split(',')
    .map((s) => parseFloat(s.trim()))
    .filter((n) => !isNaN(n) && n >= 0)
    .sort((a, b) => a - b);
}

function generateBatchPayloads(
  basePayload: BenchmarkPayload,
  thresholds: number[],
  skipStrategy: string,
  propagateCosts: boolean
): BenchmarkPayload[] {
  const payloads: BenchmarkPayload[] = [];

  payloads.push({
    ...basePayload,
    useBounds: false,
    useWarmStart: false,
    boundThreshold: 0,
    boundedSkipStrategy: skipStrategy as 'lower' | 'midpoint' | 'upper',
    propagateCostsAcrossClusters: propagateCosts,
  });

  payloads.push({
    ...basePayload,
    useBounds: false,
    useWarmStart: true,
    boundThreshold: 0,
    boundedSkipStrategy: skipStrategy as 'lower' | 'midpoint' | 'upper',
    propagateCostsAcrossClusters: propagateCosts,
  });

  for (const threshold of thresholds) {
    payloads.push({
      ...basePayload,
      useBounds: true,
      useWarmStart: true,
      boundThreshold: threshold,
      boundedSkipStrategy: skipStrategy as 'lower' | 'midpoint' | 'upper',
      propagateCostsAcrossClusters: propagateCosts,
    });
  }

  return payloads;
}

export function BenchmarkSection() {
  const navigate = useNavigate();
  const { benchmarking } = useSettingsStore();
  const { getSelectionState } = useFileStore();
  const { addLog } = useConsoleStore();

  const { pnmlModel, ptmlModel, logDirectory, logFile } = getSelectionState();
  
  const hasLogData = logDirectory !== null || logFile !== null;
  const logPath = logDirectory?.path ?? logFile?.path ?? null;
  const logDisplayName = logDirectory?.name ?? logFile?.name ?? null;

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

  const needsPnml = benchmarking.selectedAlgorithms.some(
    (id) => BENCHMARK_ALGORITHMS[id]?.modelType === 'pnml'
  );
  const needsPtml = benchmarking.selectedAlgorithms.some(
    (id) => BENCHMARK_ALGORITHMS[id]?.modelType === 'ptml'
  );

  const isBatchMode = benchmarking.selectedAlgorithms.includes('PTALIGN') && 
                      benchmarking.params.batchMode === true;

  const batchThresholds = useMemo(() => {
    if (!isBatchMode) return [];
    const thresholdStr = benchmarking.params.batchThresholds ?? '0, 1, 2, 3, 5';
    return parseThresholds(thresholdStr);
  }, [isBatchMode, benchmarking.params.batchThresholds]);

  const totalBatchRuns = isBatchMode ? 2 + batchThresholds.length : 0;

  const steps = useMemo<ValidationStep[]>(() => {
    const result: ValidationStep[] = [];

    if (needsPnml) {
      result.push(
        pnmlModel
          ? { label: 'Petri Net model', status: 'ok', detail: pnmlModel.name }
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
        ptmlModel
          ? { label: 'Process Tree model', status: 'ok', detail: ptmlModel.name }
          : { label: 'Process Tree model', status: 'warning', detail: 'Required by PTALIGN' }
      );
    }

    result.push(
      hasLogData
        ? { label: 'Log data', status: 'ok', detail: logDisplayName! }
        : { label: 'Log data', status: 'warning', detail: 'Select a directory or .xes file' }
    );

    return result;
  }, [benchmarking.selectedAlgorithms, needsPnml, needsPtml, pnmlModel, ptmlModel, hasLogData, logDisplayName]);

  const settings = useMemo<SettingsItem[]>(() => {
    const items: SettingsItem[] = [];

    if (benchmarking.selectedAlgorithms.length > 0) {
      items.push({ label: 'Algorithms', value: benchmarking.selectedAlgorithms.join(', ') });
    }

    items.push({ label: 'CPU Cores', value: String(benchmarking.coreCount) });

    if (benchmarking.selectedAlgorithms.includes('PTALIGN')) {
      const params = benchmarking.params;
      if (isBatchMode) {
        items.push({ label: 'Batch Mode', value: 'Enabled' });
        items.push({ 
          label: 'Batch Runs', 
          value: `Baseline + WS + ${batchThresholds.length} thresholds (${totalBatchRuns} total)` 
        });
        items.push({ label: 'Thresholds', value: batchThresholds.join(', ') });
      } else {
        items.push({ label: 'Warm Start', value: String(params.useWarmStart ?? true) });
        items.push({ label: 'Bounded Skip', value: String(params.useBounds ?? true) });
        if (params.useBounds) {
          items.push({ label: 'Bound Threshold', value: String(params.boundThreshold ?? 1) });
          items.push({ label: 'Skip Strategy', value: params.boundedSkipStrategy ?? 'upper' });
        }
      }
      items.push({ label: 'Propagate Costs', value: String(params.propagateCostsAcrossClusters ?? false) });
    }

    return items;
  }, [benchmarking, isBatchMode, batchThresholds, totalBatchRuns]);

  const canRun = benchmarking.selectedAlgorithms.length > 0 && steps.every((s) => s.status === 'ok');

  const handleRun = () => {
    if (!canRun || !logPath) return;

    let payloads: BenchmarkPayload[] = [];

    for (const algorithmId of benchmarking.selectedAlgorithms) {
      const algo = BENCHMARK_ALGORITHMS[algorithmId];

      const basePayload: BenchmarkPayload = {
        algorithm: algorithmId,
        numThreads: benchmarking.coreCount,
        logDirectory: logPath,
      };

      if (algo.modelType === 'pnml' && pnmlModel) {
        basePayload.pnmlModelPath = pnmlModel.path;
      } else if (algo.modelType === 'ptml' && ptmlModel) {
        basePayload.ptmlModelPath = ptmlModel.path;
      }

      if (algorithmId === 'PTALIGN' && isBatchMode) {
        const batchPayloads = generateBatchPayloads(
          basePayload,
          batchThresholds,
          benchmarking.params.boundedSkipStrategy ?? 'upper',
          benchmarking.params.propagateCostsAcrossClusters ?? false
        );
        payloads.push(...batchPayloads);
        
        log('log', `Starting batch benchmark with ${batchPayloads.length} configurations`);
        log('log', `Configurations: Baseline, Warmstart-only, t=${batchThresholds.join(', t=')}`);
      } else if (algorithmId === 'PTALIGN') {
        basePayload.useBounds = benchmarking.params.useBounds ?? true;
        basePayload.useWarmStart = benchmarking.params.useWarmStart ?? true;
        basePayload.boundThreshold = benchmarking.params.boundThreshold ?? 1.0;
        basePayload.boundedSkipStrategy = benchmarking.params.boundedSkipStrategy ?? 'upper';
        basePayload.propagateCostsAcrossClusters = benchmarking.params.propagateCostsAcrossClusters ?? false;
        payloads.push(basePayload);
        
        log('log', `Starting benchmark with algorithm: ${algorithmId}`);
      } else {
        payloads.push(basePayload);
        log('log', `Starting benchmark with algorithm: ${algorithmId}`);
      }
    }

    log('log', `CPU Cores: ${benchmarking.coreCount}, Log data: ${logDisplayName}`);
    log('log', `Starting benchmark with ${payloads.length} configuration(s)`);

    const session: BenchmarkSession = { payloads };
    navigate('/benchmark', { state: session });
  };

  const buttonLabel = isBatchMode 
    ? `Run Batch (${totalBatchRuns} configs)` 
    : 'Run Benchmark';

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
        {buttonLabel}
      </Button>
    </ActionSection>
  );
}