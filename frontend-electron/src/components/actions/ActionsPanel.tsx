import { Button } from '@/components/ui/button';
import { Play, FlaskConical, CheckCircle2, AlertCircle, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '@/stores/settingsStore';
import { useFileStore } from '@/stores/fileStore';
import { clusteringService } from '@/services/clusteringService';
import { useMemo, useState } from 'react';
import { BENCHMARK_ALGORITHMS } from '@/config/benchmarkAlgorithms';
import type { BenchmarkPayload, BenchmarkSession } from '@/types/benchmarkTypes';

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

  const { pnmlFiles, ptmlFiles, eventLogs, directories } = useMemo(() => {
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
    try {
      await clusteringService.clusterFile({
        file_path: eventLogs[0].path,
        clustering_algorithm: clustering.algorithm,
        algorithm_params: clustering.params,
      });
      setClusteringStatus('done');
    } catch {
      setClusteringStatus('error');
    }
  };

  const handleRunBenchmark = () => {
    if (!canRunBenchmark) return;

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

  return (
    <div className="flex flex-col h-full border rounded-lg">
      <div className="p-3 border-b shrink-0">
        <h3 className="font-semibold">Actions</h3>
      </div>

      <div className="p-4 space-y-6">
        <ActionSection title="Clustering">
          <StepList steps={clusteringSteps} />
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
      </div>
    </div>
  );
}

function ActionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-slate-700">{title}</h4>
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
          <span className={step.status === 'warning' ? 'text-amber-700' : 'text-slate-700'}>
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