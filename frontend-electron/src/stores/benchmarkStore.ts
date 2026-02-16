import {create} from 'zustand';

interface BenchmarkStore {
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
}

export const useBenchmarkStore = create<BenchmarkStore>((set) => ({
  isRunning: false,
  setIsRunning: (running) => set({ isRunning: running }),
}));