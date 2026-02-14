import { create } from 'zustand';

const MAX_LOGS = 500;

export interface ConsoleLog {
  id: string;
  timestamp: string;
  level: 'log' | 'warn' | 'error';
  source: 'main' | 'renderer';
  component: string;
  message: string;
}

interface ConsoleStore {
  logs: ConsoleLog[];
  addLog: (log: ConsoleLog) => void;
  clearLogs: () => void;
}

export const useConsoleStore = create<ConsoleStore>((set) => ({
  logs: [],
  addLog: (log) => set((state) => {
    const updated = [...state.logs, log];
    return { logs: updated.length > MAX_LOGS ? updated.slice(-MAX_LOGS) : updated };
  }),
  clearLogs: () => set({ logs: [] }),
}));