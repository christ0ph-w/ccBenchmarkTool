import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { benchmarkingService } from '@/services/benchmarkingService';
import { BenchmarkPayload, BenchmarkResult, ComparativeResult } from '@/types/benchmarkTypes';

export type BenchmarkStatus = 'idle' | 'running' | 'completed' | 'error';

interface BenchmarkSession {
  payload: BenchmarkPayload;
  isComparative: boolean;
}

interface UseBenchmarkRunnerReturn {
  session: BenchmarkSession | null;
  status: BenchmarkStatus;
  benchmarkId: string;
  error: string;
  results: BenchmarkResult | ComparativeResult | null;
  startBenchmark: () => Promise<void>;
  goBack: () => void;
}

export function useBenchmarkRunner(): UseBenchmarkRunnerReturn {
  const location = useLocation();
  const navigate = useNavigate();

  const [session, setSession] = useState<BenchmarkSession | null>(null);
  const [status, setStatus] = useState<BenchmarkStatus>('idle');
  const [benchmarkId, setBenchmarkId] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState<BenchmarkResult | ComparativeResult | null>(null);

  useEffect(() => {
    const state = location.state as BenchmarkSession | null;
    if (state?.payload) {
      setSession(state);
      setStatus('idle');
      setBenchmarkId('');
      setError('');
      setResults(null);
    }
  }, [location.state]);

  const startBenchmark = useCallback(async () => {
    if (!session) return;

    setStatus('running');
    setError('');

    try {
      const { payload, isComparative } = session;

      const { benchmarkId: id } = await benchmarkingService.startBenchmark({
        pnmlModelPath: payload.pnmlModelPath,
        ptmlModelPath: payload.ptmlModelPath,
        logDirectory: payload.logDirectory,
        algorithms: payload.algorithms,
        numThreads: payload.numThreads,
      });

      setBenchmarkId(id);

      const result = await pollForResults(id, isComparative);
      setResults(result);
      setStatus('completed');
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
    benchmarkId,
    error,
    results,
    startBenchmark,
    goBack,
  };
}

async function pollForResults(
  benchmarkId: string,
  isComparative: boolean,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<BenchmarkResult | ComparativeResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(intervalMs);

    try {
      if (isComparative) {
        return await benchmarkingService.getComparativeResults(benchmarkId);
      } else {
        return await benchmarkingService.getResults(benchmarkId);
      }
    } catch {
      // Result not ready yet, continue polling
    }
  }

  throw new Error('Benchmark timed out');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}