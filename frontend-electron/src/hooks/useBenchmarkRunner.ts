import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { benchmarkingService } from '@/services/benchmarkingService';
import { fileService } from '@/services/fileService';
import { useFileStore } from '@/stores/fileStore';
import { useConsoleStore } from '@/stores/consoleStore';
import { useBenchmarkStore } from '@/stores/benchmarkStore';
import { BenchmarkSession, BenchmarkResult, BenchmarkExportedResult } from '@/types/benchmarkTypes';

export type BenchmarkStatus = 'idle' | 'running' | 'completed' | 'error';
export type ResultSource = 'live' | 'file';

interface UseBenchmarkRunnerReturn {
  session: BenchmarkSession | null;
  status: BenchmarkStatus;
  currentAlgorithm: string;
  progress: { current: number; total: number };
  error: string;
  liveResults: Map<string, BenchmarkResult>;
  fileResults: BenchmarkExportedResult[];
  resultSource: ResultSource | null;
  startBenchmark: () => Promise<void>;
  goBack: () => void;
}

export function useBenchmarkRunner(): UseBenchmarkRunnerReturn {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshFileTree } = useFileStore();
  const { addLog } = useConsoleStore();
  const { setIsRunning } = useBenchmarkStore();

  const [session, setSession] = useState<BenchmarkSession | null>(null);
  const [status, setStatus] = useState<BenchmarkStatus>('idle');
  const [currentAlgorithm, setCurrentAlgorithm] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');
  const [liveResults, setLiveResults] = useState<Map<string, BenchmarkResult>>(new Map());
  const [fileResults, setFileResults] = useState<BenchmarkExportedResult[]>([]);
  const [resultSource, setResultSource] = useState<ResultSource | null>(null);

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

  // Sync status with global store
  useEffect(() => {
    setIsRunning(status === 'running');
  }, [status, setIsRunning]);

  // Warn before closing window while running
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === 'running') {
        e.preventDefault();
        e.returnValue = 'Benchmark is still running. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);

  useEffect(() => {
    const state = location.state as BenchmarkSession | null;
    if (!state) return;

    setSession(state);
    setError('');
    setLiveResults(new Map());
    setFileResults([]);

    if (state.resultFiles && state.resultFiles.length > 0) {
      setResultSource('file');
      setStatus('running');
      loadResultFiles(state.resultFiles);
    } else if (state.payloads) {
      setResultSource('live');
      setStatus('idle');
      setProgress({ current: 0, total: state.payloads.length });
    }
  }, [location.state]);

  const loadResultFiles = async (filePaths: string[]) => {
    try {
      const loaded: BenchmarkExportedResult[] = [];

      for (const filePath of filePaths) {
        const content = await fileService.readFile(filePath);
        const parsed = JSON.parse(content) as BenchmarkExportedResult;
        loaded.push(parsed);
      }

      setFileResults(loaded);
      setProgress({ current: loaded.length, total: loaded.length });
      setStatus('completed');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load result file';
      setError(errorMsg);
      setStatus('error');
    }
  };

  const startBenchmark = useCallback(async () => {
    if (!session?.payloads) return;

    setStatus('running');
    setError('');
    setLiveResults(new Map());
    setResultSource('live');

    const total = session.payloads.length;
    setProgress({ current: 0, total });

    log('log', `Starting benchmark with ${total} algorithm(s)`);

    try {
      for (let i = 0; i < total; i++) {
        const payload = session.payloads[i];
        setCurrentAlgorithm(payload.algorithm);
        setProgress({ current: i + 1, total });

        log('log', `Running ${payload.algorithm} (${i + 1}/${total})...`);

        const response = await benchmarkingService.startBenchmark({
          pnmlModelPath: payload.pnmlModelPath,
          ptmlModelPath: payload.ptmlModelPath,
          logDirectory: payload.logDirectory,
          algorithm: payload.algorithm,
          numThreads: payload.numThreads,
          useBounds: payload.useBounds,
          useWarmStart: payload.useWarmStart,
          boundThreshold: payload.boundThreshold,
          boundedSkipStrategy: payload.boundedSkipStrategy,
          propagateCostsAcrossClusters: payload.propagateCostsAcrossClusters,
        });

        log('log', `Waiting for ${payload.algorithm} results (ID: ${response.benchmarkId})...`);

        const result = await pollForResult(response.benchmarkId);

        log('log', `${payload.algorithm} completed: ${result.logResults?.length ?? 0} logs processed`);

        setLiveResults((prev) => {
          const updated = new Map(prev);
          updated.set(payload.algorithm, result);
          return updated;
        });
      }

      setStatus('completed');
      setCurrentAlgorithm('');

      log('log', 'Benchmark completed successfully');

      await refreshFileTree();
      log('log', 'File tree refreshed');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setStatus('error');
      log('error', `Benchmark failed: ${errorMsg}`);
    }
  }, [session, refreshFileTree, addLog]);

  const goBack = useCallback(() => {
    if (status === 'running') {
      const confirmed = window.confirm(
        'Benchmark is still running. Are you sure you want to go back? Progress will be lost.'
      );
      if (!confirmed) return;
    }
    navigate('/');
  }, [navigate, status]);

  return {
    session,
    status,
    currentAlgorithm,
    progress,
    error,
    liveResults,
    fileResults,
    resultSource,
    startBenchmark,
    goBack,
  };
}

async function pollForResult(
  benchmarkId: string,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<BenchmarkResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(intervalMs);

    try {
      return await benchmarkingService.getResult(benchmarkId);
    } catch {
      // Not ready yet
    }
  }

  throw new Error('Benchmark timed out');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}