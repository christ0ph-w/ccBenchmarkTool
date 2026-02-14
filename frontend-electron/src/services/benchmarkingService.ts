import type { BenchmarkRequest, BenchmarkRunResponse, BenchmarkResult } from '@/types/benchmarkTypes';

const API_BASE = 'http://localhost:8080/api/benchmark';

export const benchmarkingService = {
  async startBenchmark(request: BenchmarkRequest): Promise<BenchmarkRunResponse> {
    const response = await fetch(`${API_BASE}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to start benchmark');

    return data;
  },

  async getResult(benchmarkId: string): Promise<BenchmarkResult> {
    const response = await fetch(`${API_BASE}/run/${benchmarkId}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Results not ready');
    }
    return await response.json();
  },

  async restartPtalignServers(): Promise<void> {
    const response = await fetch(`${API_BASE}/restart-ptalign-servers`, {
      method: 'POST',
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to restart servers');
    }
  },
};