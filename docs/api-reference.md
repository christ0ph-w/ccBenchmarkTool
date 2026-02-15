# API Reference

## Spring Boot API (Port 8080)

Base URL: `http://localhost:8080/api`

### Endpoints

#### List Algorithms
```http
GET /benchmark/algorithms
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

#### Restart PTALIGN Servers
```http
POST /benchmark/restart-ptalign-servers
```

---

## Flask Clustering API (Port 5000)

Base URL: `http://localhost:5000/api`

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

---

## Data Types

All types use **camelCase** consistently.

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
  "statesExplored": 0,
  "method": "warmStart",
  "lowerBound": 1.8,
  "upperBound": 2.2,
  "confidence": 1.0
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