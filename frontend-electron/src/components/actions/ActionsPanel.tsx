import { Button } from '@/components/ui/button';
import { Play, FlaskConical, Eye, CheckCircle2, AlertCircle, Circle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '@/stores/settingsStore';
import { useFileStore } from '@/stores/fileStore';
import { clusteringService } from '@/services/clusteringService';
import { useMemo, useState } from 'react';
import { BENCHMARK_ALGORITHMS } from '@/config/benchmarkAlgorithms';
import { CLUSTERING_ALGORITHMS } from '@/config/clusteringAlgorithms';
import type { BenchmarkPayload, BenchmarkSession } from '@/types/benchmarkTypes';
import { useConsoleStore } from '@/stores/consoleStore';

type StepStatus = 'ok' | 'warning' | 'idle';

interface ValidationStep {
  label: string;
  status: StepStatus;
  detail?: string;
}

export function ActionsPanel() {
  const navigate = useNavigate();
  const { clustering, benchmarking } = useSettingsStore();
  const { selectedFiles, workingDirectory } = useFileStore();
  const [clusteringStatus, setClusteringStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');

  const { addLog } = useConsoleStore();

  const log = (level: 'log' | 'warn' | 'error', component: string, message: string) => {
    addLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      source: 'renderer',
      component,
      message,
    });
  }

  const { pnmlFiles, ptmlFiles, eventLogs, directories, jsonFiles } = useMemo(() => {
    return {
      pnmlFiles: selectedFiles.filter(
        (f) => f.type === 'file' && f.name.toLowerCase().endsWith('.pnml')
      ),
      ptmlFiles: selectedFiles.filter(
        (f) => f.type === 'file' && f.name.toLowerCase().endsWith('.ptml')
      ),
      eventLogs: selectedFiles.filter(
        (f) => f.type === 'file' && f.name.toLowerCase().endsWith('.xes')
      ),
      directories: selectedFiles.filter((f) => f.type === 'directory'),
      jsonFiles: selectedFiles.filter(
        (f) => f.type === 'file' && f.name.toLowerCase().endsWith('.json')
      ),
    };
  }, [selectedFiles]);

  const needsPnml = benchmarking.selectedAlgorithms.some(
    (id) => BENCHMARK_ALGORITHMS[id]?.modelType === 'pnml'
  );
  const needsPtml = benchmarking.selectedAlgorithms.some(
    (id) => BENCHMARK_ALGORITHMS[id]?.modelType === 'ptml'
  );

  const clusteringSteps = useMemo<ValidationStep[]>(() => {
    const steps: ValidationStep[] = [];

    steps.push(
      workingDirectory
        ? { label: 'Working directory', status: 'ok' }
        : { label: 'Working directory', status: 'warning', detail: 'Not set' }
    );

    steps.push(
      eventLogs.length > 0
        ? { label: 'Event log', status: 'ok', detail: eventLogs[0].name }
        : { label: 'Event log', status: 'warning', detail: 'Select a .xes file' }
    );

    return steps;
  }, [workingDirectory, eventLogs]);

  const benchmarkSteps = useMemo<ValidationStep[]>(() => {
    const steps: ValidationStep[] = [];

    steps.push(
      benchmarking.selectedAlgorithms.length > 0
        ? {
            label: 'Algorithms',
            status: 'ok',
            detail: benchmarking.selectedAlgorithms.join(', '),
          }
        : { label: 'Algorithms', status: 'warning', detail: 'Select in settings' }
    );

    if (needsPnml) {
      steps.push(
        pnmlFiles.length > 0
          ? { label: 'Petri Net model', status: 'ok', detail: pnmlFiles[0].name }
          : { label: 'Petri Net model', status: 'warning', detail: 'Required by ' +
              benchmarking.selectedAlgorithms.filter((id) => BENCHMARK_ALGORITHMS[id]?.modelType === 'pnml').join(', ') }
      );
    }

    if (needsPtml) {
      steps.push(
        ptmlFiles.length > 0
          ? { label: 'Process Tree model', status: 'ok', detail: ptmlFiles[0].name }
          : { label: 'Process Tree model', status: 'warning', detail: 'Required by PTALIGN' }
      );
    }

    if (!needsPnml && !needsPtml && benchmarking.selectedAlgorithms.length === 0) {
      steps.push({ label: 'Model file', status: 'idle' });
    }

    const hasLogs = eventLogs.length > 0 || directories.length > 0;
    steps.push(
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

    return steps;
  }, [benchmarking.selectedAlgorithms, needsPnml, needsPtml, pnmlFiles, ptmlFiles, eventLogs, directories]);

  const canRunClustering = clusteringSteps.every((s) => s.status === 'ok');
  const canRunBenchmark = benchmarkSteps.every((s) => s.status === 'ok');

  const handleRunClustering = async () => {
    if (!canRunClustering) return;

    setClusteringStatus('running');
    log('log', 'Clustering', `Starting ${clustering.algorithm} on ${eventLogs[0].name}...`);

    try {
      const result = await clusteringService.clusterFile({
        file_path: eventLogs[0].path,
        clustering_algorithm: clustering.algorithm,
        algorithm_params: clustering.params,
      });

      setClusteringStatus('done');
      log('log', 'Clustering', `Complete: ${result.data?.num_clusters} clusters found`);

      if (result.data?.cluster_sizes) {
        log('log', 'Clustering', `Cluster sizes: ${JSON.stringify(result.data.cluster_sizes)}`);
      }

      if (result.data?.exported_files) {
        log('log', 'Clustering', `Exported ${result.data.exported_files.length} cluster files`);
      }
    } catch (err) {
      setClusteringStatus('error');
      log('error', 'Clustering', `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRunBenchmark = () => {
    if (!canRunBenchmark) return;
    log('log', 'Benchmark', `Starting benchmark with ${benchmarking.selectedAlgorithms.join(', ')}`);
    log('log', 'Benchmark', `CPU Cores: ${benchmarking.coreCount}`);

    const logDir = directories.length > 0
      ? directories[0].path
      : eventLogs[0].path;

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

  const handleViewResults = () => {
    if (jsonFiles.length === 0) return;

    const filePaths = jsonFiles.map((f) => f.path);
    navigate('/benchmark', {
      state: { resultFiles: filePaths },
    });
  };

  // Build settings summaries
  const clusteringAlgoConfig = CLUSTERING_ALGORITHMS[clustering.algorithm];

  const clusteringSettings = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    items.push({ label: 'Algorithm', value: clusteringAlgoConfig?.name ?? clustering.algorithm });
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

  const benchmarkSettings = useMemo(() => {
    const items: { label: string; value: string }[] = [];

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

  return (
    <div className="flex flex-col h-full border rounded-lg">
      <div className="p-3 border-b shrink-0">
        <h3 className="font-semibold">Actions</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <ActionSection title="Clustering">
          <StepList steps={clusteringSteps} />
          <SettingsSummary items={clusteringSettings} />
          <Button
            onClick={handleRunClustering}
            disabled={!canRunClustering || clusteringStatus === 'running'}
            className="w-full mt-3"
          >
            <FlaskConical className="h-4 w-4 mr-2" />
            {clusteringStatus === 'running' ? 'Clustering...' : 'Run Clustering'}
          </Button>
        </ActionSection>

        <ActionSection title="Benchmarking">
          <StepList steps={benchmarkSteps} />
          <SettingsSummary items={benchmarkSettings} />
          <Button
            onClick={handleRunBenchmark}
            disabled={!canRunBenchmark}
            className="w-full mt-3"
            variant="secondary"
          >
            <Play className="h-4 w-4 mr-2" />
            Run Benchmark
          </Button>
        </ActionSection>

        {jsonFiles.length > 0 && (
          <ActionSection title="Results">
            <div className="space-y-1.5">
              {jsonFiles.map((f) => (
                <div key={f.path} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-slate-700 truncate">{f.name}</span>
                </div>
              ))}
            </div>
            <Button
              onClick={handleViewResults}
              className="w-full mt-3"
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Result{jsonFiles.length > 1 ? 's' : ''}
            </Button>
          </ActionSection>
        )}
      </div>
    </div>
  );
}

function ActionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function StepList({ steps }: { steps: ValidationStep[] }) {
  return (
    <div className="space-y-1.5">
      {steps.map((step) => (
        <div key={step.label} className="flex items-center gap-2 text-sm">
          <StatusIcon status={step.status} />
          <span className={step.status === 'warning' ? 'text-amber-700' : 'text-foreground'}>
            {step.label}
          </span>
          {step.detail && (
            <span className={`text-xs ml-auto truncate max-w-[140px] ${
              step.status === 'ok' ? 'text-muted-foreground' : 'text-amber-600 italic'
            }`}>
              {step.detail}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function SettingsSummary({ items }: { items: { label: string; value: string }[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-2 p-2 rounded bg-muted space-y-1">
      <div className="flex items-center gap-1">
        <Settings className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Current Settings</span>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {items.map((item) => (
            <tr key={item.label}>
              <td className="text-muted-foreground py-0.5 pr-4 whitespace-nowrap">{item.label}</td>
              <td className="font-medium text-foreground py-0.5">{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'ok':
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />;
    case 'idle':
      return <Circle className="h-4 w-4 text-slate-300 shrink-0" />;
  }
}