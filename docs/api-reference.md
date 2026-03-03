# API Reference

## Overview

| Service | Port | Base URL | Purpose |
|---------|------|----------|---------|
| Spring Boot | 8080 | `http://localhost:8080/api/benchmark` | Benchmark orchestration |
| Flask Clustering | 5000 | `http://localhost:5000/api` | Trace variant clustering |
| PTALIGN | 5001+ | `http://localhost:5001` | Process tree alignment (internal) |

---

## Spring Boot API (Port 8080)

Base URL: `http://localhost:8080/api/benchmark`

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/algorithms` | GET | List available algorithms |
| `/run` | POST | Start async benchmark |
| `/run/{id}` | GET | Get cached results |
| `/run-sync` | POST | Run benchmark synchronously |
| `/restart-ptalign-servers` | POST | Restart Python servers |

#### List Algorithms

```http
GET /benchmark/algorithms
```

**Response:**
```json
[
  {"name": "ILP", "description": "Integer Linear Programming alignment", "modelType": "pnml"},
  {"name": "SPLITPOINT", "description": "Split-point alignment", "modelType": "pnml"},
  {"name": "PTALIGN", "description": "Process Tree Alignment - Gurobi-based", "modelType": "ptml"}
]
```

#### Start Benchmark (Async)

```http
POST /benchmark/run
```

**Request:**
```json
{
  "pnmlModelPath": "data/Model.pnml",
  "ptmlModelPath": "data/Model.ptml",
  "logDirectory": "data/EventLog.xes",
  "algorithm": "PTALIGN",
  "numThreads": 4,
  "useBounds": true,
  "useWarmStart": true,
  "boundThreshold": 1.0,
  "boundedSkipStrategy": "upper",
  "propagateCostsAcrossClusters": false
}
```

**Response:**
```json
{
  "benchmarkId": "a8129b9d-65cd-44c2-bcdd-21b14857cca5",
  "statusUrl": "/api/benchmark/run/a8129b9d-..."
}
```

#### Get Results

```http
GET /benchmark/run/{benchmarkId}
```

Returns `BenchmarkResult` (see Data Types below) or 404 if not ready.

#### Run Benchmark (Sync)

```http
POST /benchmark/run-sync
```

Same request body as `/run`. Blocks until complete. Use for scripted batch runs.

#### Restart PTALIGN Servers

```http
POST /benchmark/restart-ptalign-servers
```

Restarts Python alignment servers. Call between benchmark runs for clean measurement state.

---

## Flask Clustering API (Port 5000)

Base URL: `http://localhost:5000/api`

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/cluster/traces` | POST | Cluster trace variants |

#### Cluster Traces

```http
POST /cluster/traces
```

**Request:**
```json
{
  "file_path": "data/EventLog.xes",
  "clustering_algorithm": "hierarchical",
  "algorithm_params": {
    "linkage": "average",
    "n_clusters": 3
  }
}
```

**Available algorithms:** `dbscan`, `hierarchical`

**Algorithm parameters:**

| Algorithm | Parameter | Default | Description |
|-----------|-----------|---------|-------------|
| dbscan | `eps` | 0.5 | Max Levenshtein distance to be neighbors |
| dbscan | `min_samples` | 5 | Min variants to form a cluster |
| hierarchical | `n_clusters` | 3 | Number of clusters |
| hierarchical | `linkage` | "average" | Linkage method |
| hierarchical | `distance_threshold` | null | Cluster by distance instead of n_clusters |

**Response:**
```json
{
  "success": true,
  "data": {
    "num_variants": 45,
    "num_clusters": 3,
    "cluster_sizes": {"0": 20, "1": 15, "2": 10},
    "algorithm": "hierarchical",
    "algorithm_params": {"n_clusters": 3, "linkage": "average"},
    "distance_matrix": [[0, 2, 5], [2, 0, 3], [5, 3, 0]],
    "labels": [0, 0, 1, 1, 2],
    "exported_files": ["cluster_0.xes", "cluster_1.xes", "cluster_2.xes"]
  }
}
```

---

## PTALIGN API (Port 5001+)

Internal API used by Spring Boot. One server per thread.

Base URL: `http://localhost:5001`

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/load-model` | POST | Load process tree |
| `/align` | POST | Align log against model |
| `/shutdown` | POST | Graceful shutdown |

#### Load Model

```http
POST /load-model
```

```json
{
  "model_path": "/absolute/path/to/model.ptml"
}
```

#### Align Log

```http
POST /align
```

```json
{
  "log_path": "/absolute/path/to/log.xes",
  "distance_matrix_path": "/absolute/path/to/matrix.json",
  "use_bounds": true,
  "use_warm_start": true,
  "bound_threshold": 1.0,
  "bounded_skip_strategy": "upper",
  "prior_costs": {}
}
```

---

## Data Types

### BenchmarkResult

```json
{
  "benchmarkId": "uuid",
  "modelFile": "Model.ptml",
  "algorithm": "PTALIGN",
  "numThreads": 4,
  "startTime": "2026-02-15T14:53:50",
  "endTime": "2026-02-15T14:54:35",
  "totalExecutionTimeMs": 45230,
  "peakMemoryMb": 512,
  "success": true,
  "errorMessage": null,
  "ptalignConfig": {},
  "logResults": []
}
```

### LogBenchmarkResult

```json
{
  "logName": "EventLog_cluster_0.xes",
  "totalTraces": 210,
  "totalVariants": 45,
  "successfulAlignments": 45,
  "failedAlignments": 0,
  "avgFitness": 0.9456,
  "avgCost": 2.12,
  "executionTimeMs": 8450,
  "memoryUsedMb": 128,
  "timing": {},
  "optimizationStats": {},
  "alignments": [],
  "boundsProgression": [],
  "globalBoundsProgression": []
}
```

### TimingBreakdown

```json
{
  "totalMs": 8450,
  "computeMs": 7200,
  "overheadMs": 1250,
  "parseMs": 350,
  "networkMs": 900,
  "efficiency": 0.852
}
```

### OptimizationStats

```json
{
  "fullAlignments": 5,
  "warmStartAlignments": 32,
  "boundedSkips": 8,
  "cachedAlignments": 0,
  "optimizationRate": 0.889
}
```

### TraceAlignmentDetail

```json
{
  "variantName": ["Activity_A", "Activity_B"],
  "alignmentCost": 2.0,
  "fitness": 0.9523,
  "traceLength": 12,
  "traceCount": 15,
  "alignmentTimeMs": 145,
  "method": "warmStart",
  "lowerBound": 1.8,
  "upperBound": 2.2
}
```

### BoundsProgressionEntry

```json
{
  "variantIndex": 5,
  "numReferences": 3,
  "lowerBound": 1.8,
  "upperBound": 2.5,
  "gap": 0.7,
  "estimatedCost": null,
  "actualCost": 2.1,
  "method": "warmStart"
}
```

### GlobalBoundsSnapshot

```json
{
  "numReferences": 3,
  "numRemaining": 42,
  "meanLowerBound": 1.5,
  "meanUpperBound": 4.2,
  "meanGap": 2.7,
  "minGap": 0.3,
  "maxGap": 5.8,
  "numSkippable": 8
}
```

---

## Exported JSON Structure

Files saved to `data/results/benchmark_{id}_{algo}_{model}_{log}.json`:

```json
{
  "benchmarkId": "a8129b9d",
  "algorithm": "PTALIGN",
  "modelFile": "Model.ptml",
  "logName": "EventLog",
  "numThreads": 4,
  "timestamp": "20260215_145300",
  "summary": {
    "avgFitness": 0.9234,
    "avgCost": 2.45,
    "successfulAlignments": 846,
    "failedAlignments": 0,
    "totalTraces": 1050,
    "totalVariants": 215,
    "totalLogsProcessed": 5,
    "totalExecutionTimeMs": 45230,
    "totalComputeTimeMs": 38500,
    "peakMemoryMb": 512
  },
  "ptalignConfig": {
    "useBounds": true,
    "useWarmStart": true,
    "boundThreshold": 1.0,
    "boundedSkipStrategy": "upper",
    "propagateCosts": false
  },
  "logs": {}
}
```