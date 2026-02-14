import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useConsoleStore } from "@/stores/consoleStore";
import { useEffect, useRef } from "react";

const MAX_LOGS = 500;

export const ConsolePanel: React.FC = () => {
  const { logs, addLog, clearLogs } = useConsoleStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.electronAPI?.onMainConsoleLog) {
      window.electronAPI.onMainConsoleLog((data: any) => {
        addLog({
          id: crypto.randomUUID(),
          timestamp: data.timestamp,
          level: data.level,
          source: 'main',
          component: 'Main Process',
          message: data.message,
        });
      });
    }

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const formatArgs = (args: any[]) =>
      args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');

    type LogLevel = 'log' | 'warn' | 'error';

    const createLogEntry = (level: LogLevel, component: string, args: any[]) => ({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      source: 'renderer' as const,
      component,
      message: formatArgs(args),
    });

    console.log = (...args: any[]) => {
      originalLog(...args);
      addLog(createLogEntry('log', 'React App', args));
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      addLog(createLogEntry('warn', 'React App', args));
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      addLog(createLogEntry('error', 'React App', args));
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, [addLog]);

  // Auto-scroll to newest log
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-yellow-500';
      default: return 'text-foreground';
    }
  };

  // Only render the last MAX_LOGS entries
  const visibleLogs = logs.length > MAX_LOGS ? logs.slice(-MAX_LOGS) : logs;

  return (
    <div className="flex flex-col border rounded-lg h-full overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b flex-shrink-0">
        <h3 className="font-semibold">Console</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={clearLogs}
          disabled={logs.length === 0}
        >
          Clear Console
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 font-mono text-xs space-y-1">
          {visibleLogs.length === 0 ? (
            <p className="text-muted-foreground">No console output</p>
          ) : (
            visibleLogs.map(log => (
              <div key={log.id} className={getLevelColor(log.level)}>
                <span className="text-muted-foreground">
                  [{log.timestamp.split('T')[1]?.slice(0, 8)}]
                </span>
                <span className="mx-2">[{log.level.toUpperCase()}]</span>
                <span className="text-blue-400">{log.component}</span>
                <span className="mx-2">→</span>
                <span>{log.message}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
};