import { Button } from "@/components/ui/button";
import { useFileStore } from "@/stores/fileStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { clusteringService } from "@/services/clusteringService";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { BenchmarkPayload } from "@/types/benchmarkTypes";
import { AlertCircle, Loader2, FlaskConical, Play, FileText, FolderOpen, TreePine } from "lucide-react";

export function ActionsPanel() {
  const { selectedFiles } = useFileStore();
  const { clustering, benchmarking } = useSettingsStore();
  const navigate = useNavigate();

  const [clusteringLoading, setClusteringLoading] = useState(false);
  const [clusteringError, setClusteringError] = useState<string | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);

  const { eventLogs, pnmlFiles, ptmlFiles, directories } = useMemo(() => {
    const models = selectedFiles.filter(f =>
      f.type === 'file' && (f.name.toLowerCase().endsWith('.pnml') || f.name.toLowerCase().endsWith('.ptml'))
    );

    return {
      eventLogs: selectedFiles.filter(f =>
        f.type === 'file' && f.name.toLowerCase().endsWith('.xes')
      ),
      pnmlFiles: models.filter(f => f.name.toLowerCase().endsWith('.pnml')),
      ptmlFiles: models.filter(f => f.name.toLowerCase().endsWith('.ptml')),
      directories: selectedFiles.filter(f => f.type === 'directory'),
    };
  }, [selectedFiles]);

  const needsPnml = benchmarking.selectedAlgorithms.some(a => ['ILP', 'SPLITPOINT'].includes(a));
  const needsPtml = benchmarking.selectedAlgorithms.some(a => ['PTALIGN'].includes(a));

  const canRunClustering = eventLogs.length > 0;
  const canRunBenchmark =
    (eventLogs.length >= 1 || directories.length >= 1) &&
    benchmarking.selectedAlgorithms.length > 0 &&
    (!needsPnml || pnmlFiles.length >= 1) &&
    (!needsPtml || ptmlFiles.length >= 1);

  const handleRunClustering = async () => {
    if (!canRunClustering) return;

    setClusteringLoading(true);
    setClusteringError(null);

    try {
      const backendParams = transformClusteringParams(clustering);
      const relativePath = extractRelativePath(eventLogs[0].path);

      const payload = {
        file_path: relativePath,
        clustering_algorithm: clustering.algorithm,
        algorithm_params: backendParams,
      };

      await clusteringService.clusterFile(payload);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setClusteringError(errorMsg);
    } finally {
      setClusteringLoading(false);
    }
  };

  const handleRunBenchmarking = () => {
    if (!canRunBenchmark) return;

    setBenchmarkLoading(true);
    setBenchmarkError(null);

    try {
      const logPath = eventLogs[0]?.path ?? directories[0]?.path;

      const payload: BenchmarkPayload = {
        pnmlModelPath: pnmlFiles[0]?.path,
        ptmlModelPath: ptmlFiles[0]?.path,
        logDirectory: logPath,
        algorithms: benchmarking.selectedAlgorithms,
        numThreads: benchmarking.coreCount,
      };

      navigate('/benchmark', {
        state: {
          payload,
          isComparative: benchmarking.selectedAlgorithms.length > 1,
        },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setBenchmarkError(errorMsg);
    } finally {
      setBenchmarkLoading(false);
    }
  };

  const getBenchmarkValidationMessage = (): string | null => {
    if (benchmarking.selectedAlgorithms.length === 0) {
      return 'Select at least one algorithm';
    }
    if (eventLogs.length === 0 && directories.length === 0) {
      return 'Select a log file (.xes) or directory';
    }
    if (needsPnml && pnmlFiles.length === 0) {
      return 'ILP/SPLITPOINT require a .pnml file';
    }
    if (needsPtml && ptmlFiles.length === 0) {
      return 'PTALIGN requires a .ptml file';
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      <Header />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          <ClusteringSection
            algorithm={clustering.algorithm}
            params={clustering.params}
            disabled={!canRunClustering}
            loading={clusteringLoading}
            error={clusteringError}
            onRun={handleRunClustering}
          />

          <BenchmarkSection
            pnmlFiles={pnmlFiles}
            ptmlFiles={ptmlFiles}
            eventLogs={eventLogs}
            directories={directories}
            selectedAlgorithms={benchmarking.selectedAlgorithms}
            coreCount={benchmarking.coreCount}
            disabled={!canRunBenchmark}
            loading={benchmarkLoading}
            error={benchmarkError}
            validationMessage={getBenchmarkValidationMessage()}
            onRun={handleRunBenchmarking}
          />
        </div>
      </div>
    </div>
  );
}

// Sub-components

function Header() {
  return (
    <div className="flex items-center justify-between p-3 border-b shrink-0">
      <h3 className="font-semibold">Actions</h3>
    </div>
  );
}

interface ClusteringSectionProps {
  algorithm: string;
  params: Record<string, any>;
  disabled: boolean;
  loading: boolean;
  error: string | null;
  onRun: () => void;
}

function ClusteringSection({ algorithm, params, disabled, loading, error, onRun }: ClusteringSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-medium text-sm">Clustering</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Cluster event logs using {algorithm} clustering with Levenshtein distance
        </p>
      </div>

      <ConfigDisplay>
        <ConfigItem label="Algorithm" value={algorithm} />
        {algorithm === 'hierarchical' && (
          <>
            <ConfigItem label="Linkage" value={params.linkage} />
            {params.useDistanceThreshold ? (
              <ConfigItem label="Distance Threshold" value={params.distance_threshold} />
            ) : (
              <ConfigItem label="Clusters" value={params.n_clusters} />
            )}
          </>
        )}
        {algorithm === 'dbscan' && (
          <>
            <ConfigItem label="EPS" value={params.eps} />
            <ConfigItem label="Min Samples" value={params.min_samples} />
          </>
        )}
      </ConfigDisplay>

      <ErrorDisplay error={error} />

      <ActionButton onClick={onRun} disabled={disabled} loading={loading}>
        <FlaskConical className="h-4 w-4 mr-1" />
        Run Clustering
      </ActionButton>
    </div>
  );
}

interface FileRef {
  id: string;
  name: string;
  path: string;
}

interface BenchmarkSectionProps {
  pnmlFiles: FileRef[];
  ptmlFiles: FileRef[];
  eventLogs: FileRef[];
  directories: FileRef[];
  selectedAlgorithms: string[];
  coreCount: number;
  disabled: boolean;
  loading: boolean;
  error: string | null;
  validationMessage: string | null;
  onRun: () => void;
}

function BenchmarkSection({
  pnmlFiles,
  ptmlFiles,
  eventLogs,
  directories,
  selectedAlgorithms,
  coreCount,
  disabled,
  loading,
  error,
  validationMessage,
  onRun,
}: BenchmarkSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-medium text-sm">Conformance Checking</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Benchmark conformance checking algorithms
        </p>
      </div>

      <ConfigDisplay>
        <FileList
          label="Petri Net (.pnml)"
          files={pnmlFiles}
          icon={<FileText className="h-3 w-3 inline mr-1" />}
          emptyText="No .pnml file selected"
        />
        <FileList
          label="Process Tree (.ptml)"
          files={ptmlFiles}
          icon={<TreePine className="h-3 w-3 inline mr-1" />}
          emptyText="No .ptml file selected"
        />
        <FileList
          label="Log Input"
          files={eventLogs.length > 0 ? eventLogs : directories}
          icon={eventLogs.length > 0
            ? <FileText className="h-3 w-3 inline mr-1" />
            : <FolderOpen className="h-3 w-3 inline mr-1" />
          }
          emptyText="No log file or directory selected"
        />
      </ConfigDisplay>

      <ConfigDisplay>
        <ConfigItem label="Algorithms" value={`${selectedAlgorithms.length} selected`} />
        {selectedAlgorithms.length > 0 && (
          <div className="text-xs text-muted-foreground">{selectedAlgorithms.join(', ')}</div>
        )}
        <ConfigItem label="Cores" value={coreCount} />
      </ConfigDisplay>

      {validationMessage && (
        <div className="flex gap-2 items-start text-xs bg-amber-50 border border-amber-200 rounded p-2 text-amber-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{validationMessage}</span>
        </div>
      )}

      <ErrorDisplay error={error} />

      <ActionButton onClick={onRun} disabled={disabled} loading={loading} variant="secondary">
        <Play className="h-4 w-4 mr-1" />
        Run Benchmark
      </ActionButton>
    </div>
  );
}

// Shared UI

function ConfigDisplay({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs space-y-1 bg-muted/30 p-2 rounded">
      {children}
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="font-medium">{label}:</span> {value}
    </div>
  );
}

interface FileListProps {
  label: string;
  files: FileRef[];
  icon: React.ReactNode;
  emptyText: string;
}

function FileList({ label, files, icon, emptyText }: FileListProps) {
  return (
    <>
      <div><span className="font-medium">{label}:</span></div>
      <div className="ml-2 text-muted-foreground">
        {files.length > 0 ? (
          files.map((f) => (
            <div key={f.id} className="truncate">
              {icon} {extractRelativePath(f.path)}
            </div>
          ))
        ) : (
          <div className="text-amber-600">
            <AlertCircle className="h-3 w-3 inline mr-1" />
            {emptyText}
          </div>
        )}
      </div>
    </>
  );
}

function ErrorDisplay({ error }: { error: string | null }) {
  if (!error) return null;

  return (
    <div className="flex gap-2 items-start text-xs bg-red-50 border border-red-200 rounded p-2 text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{error}</span>
    </div>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  variant?: "default" | "secondary";
  children: React.ReactNode;
}

function ActionButton({ onClick, disabled, loading, variant = "default", children }: ActionButtonProps) {
  return (
    <Button onClick={onClick} disabled={disabled || loading} size="sm" variant={variant} className="w-fit">
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Running...
        </>
      ) : (
        children
      )}
    </Button>
  );
}

// Helpers

function transformClusteringParams(clustering: { algorithm: string; params: Record<string, any> }) {
  const backendParams: Record<string, any> = {};

  if (clustering.algorithm === 'hierarchical') {
    backendParams.linkage = clustering.params.linkage;
    if (clustering.params.useDistanceThreshold) {
      backendParams.distance_threshold = clustering.params.distance_threshold;
    } else {
      backendParams.n_clusters = clustering.params.n_clusters;
    }
  } else if (clustering.algorithm === 'dbscan') {
    backendParams.eps = clustering.params.eps;
    backendParams.min_samples = clustering.params.min_samples;
  }

  return backendParams;
}

function extractRelativePath(fullPath: string): string {
  const separators = ['\\data\\', '/data/'];

  for (const sep of separators) {
    const dataIndex = fullPath.toLowerCase().indexOf(sep.toLowerCase());
    if (dataIndex !== -1) {
      return fullPath.substring(dataIndex + sep.length);
    }
  }

  return fullPath;
}