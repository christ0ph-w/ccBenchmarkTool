import type { BenchmarkResult, ComparativeResult } from '@/types/benchmarkTypes';

// TODO: Update when Spring Boot backend is deployed
const API_BASE = 'http://localhost:8080/api/benchmark';

export const benchmarkingService = {
  async startBenchmark(payload: {
    pnmlModelPath?: string;
    ptmlModelPath?: string;
    logDirectory: string;
    algorithms: string[];
    numThreads: number;
  }): Promise<{ benchmarkId: string }> {
    const isComparative = payload.algorithms.length > 1;
    const endpoint = isComparative ? `${API_BASE}/compare` : `${API_BASE}/run`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pnmlModelPath: payload.pnmlModelPath,
        ptmlModelPath: payload.ptmlModelPath,
        logDirectory: payload.logDirectory,
        algorithm: payload.algorithms[0],
        algorithms: payload.algorithms,
        numThreads: payload.numThreads,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to start benchmark');

    return { benchmarkId: data.benchmarkId || data.comparativeId };
  },

  async getResults(benchmarkId: string): Promise<BenchmarkResult> {
    const response = await fetch(`${API_BASE}/run/${benchmarkId}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Results not ready');
    }
    return await response.json();
  },

  async getComparativeResults(comparativeId: string): Promise<ComparativeResult> {
    const response = await fetch(`${API_BASE}/compare/${comparativeId}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Comparative results not ready');
    }
    return await response.json();
  },
};