import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { benchmarkingService } from '@/services/benchmarkingService';
import { BenchmarkSession, BenchmarkResult } from '@/types/benchmarkTypes';

export type BenchmarkStatus = 'idle' | 'running' | 'completed' | 'error';

interface UseBenchmarkRunnerReturn {
  session: BenchmarkSession | null;
  status: BenchmarkStatus;
  currentAlgorithm: string;
  progress: { current: number; total: number };
  error: string;
  results: Map<string, BenchmarkResult>;
  startBenchmark: () => Promise<void>;
  goBack: () => void;
}

export function useBenchmarkRunner(): UseBenchmarkRunnerReturn {
  const location = useLocation();
  const navigate = useNavigate();

  const [session, setSession] = useState<BenchmarkSession | null>(null);
  const [status, setStatus] = useState<BenchmarkStatus>('idle');
  const [currentAlgorithm, setCurrentAlgorithm] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');
  const [results, setResults] = useState<Map<string, BenchmarkResult>>(new Map());

  useEffect(() => {
    const state = location.state as BenchmarkSession | null;
    if (state?.payloads) {
      setSession(state);
      setStatus('idle');
      setCurrentAlgorithm('');
      setProgress({ current: 0, total: state.payloads.length });
      setError('');
      setResults(new Map());
    }
  }, [location.state]);

  const startBenchmark = useCallback(async () => {
    if (!session) return;

    setStatus('running');
    setError('');
    setResults(new Map());

    const total = session.payloads.length;
    setProgress({ current: 0, total });

    try {
      for (let i = 0; i < total; i++) {
        const payload = session.payloads[i];
        setCurrentAlgorithm(payload.algorithm);
        setProgress({ current: i + 1, total });

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

        const result = await pollForResult(response.benchmarkId);

        setResults((prev) => {
          const updated = new Map(prev);
          updated.set(payload.algorithm, result);
          return updated;
        });
      }

      setStatus('completed');
      setCurrentAlgorithm('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setStatus('error');
    }
  }, [session]);

  const goBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return {
    session,
    status,
    currentAlgorithm,
    progress,
    error,
    results,
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