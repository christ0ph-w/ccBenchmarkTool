# API Reference

## Base URL

```
http://localhost:8080/api
```

---

## Endpoints

### List Available Algorithms

```http
GET /benchmark/algorithms
```

**Response:**
```json
[
  {
    "name": "ILP",
    "description": "Integer Linear Programming alignment - optimal but slower",
    "modelType": "PETRI_NET"
  },
  {
    "name": "SPLITPOINT",
    "description": "Split-point alignment - faster heuristic approach",
    "modelType": "PETRI_NET"
  },
  {
    "name": "PTALIGN",
    "description": "Process Tree Alignment - Gurobi-based with warm start and bounds optimization",
    "modelType": "PROCESS_TREE"
  }
]
```

---

### Start Benchmark (Async)

```http
POST /benchmark/run
Content-Type: application/json
```

**Request Body:**
```json
{
  "pnmlModelPath": "20250915_data/Model.pnml",
  "ptmlModelPath": "20250915_data/Model.ptml",
  "logDirectory": "20250915_data/EventLog.xes",
  "algorithm": "PTALIGN",
  "numThreads": 4,
  
  "useBounds": true,
  "useWarmStart": true,
  "boundThreshold": 1.0,
  "boundedSkipStrategy": "upper",
  "propagateCostsAcrossClusters": false
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `pnmlModelPath` | string | For ILP/SPLITPOINT | - | Path to Petri net model |
| `ptmlModelPath` | string | For PTALIGN | - | Path to Process Tree model |
| `logDirectory` | string | Yes | - | Path to XES file or directory |
| `algorithm` | string | Yes | - | `ILP`, `SPLITPOINT`, or `PTALIGN` |
| `numThreads` | integer | No | CPU cores | Number of parallel threads (max 16 for PTALIGN) |
| `useBounds` | boolean | No | `true` | Enable bounds-based skipping (PTALIGN) |
| `useWarmStart` | boolean | No | `true` | Enable warm start optimization (PTALIGN) |
| `boundThreshold` | number | No | `1.0` | Gap threshold for bounded skip (PTALIGN) |
| `boundedSkipStrategy` | string | No | `"upper"` | Cost estimation: `lower`, `midpoint`, `upper` |
| `propagateCostsAcrossClusters` | boolean | No | `false` | Share costs across cluster files |

**Response:**
```json
{
  "benchmarkId": "a8129b9d-65cd-44c2-bcdd-21b14857cca5",
  "statusUrl": "/api/benchmark/run/a8129b9d-65cd-44c2-bcdd-21b14857cca5"
}
```

---

### Get Benchmark Results

```http
GET /benchmark/run/{benchmarkId}
```

**Response (Pending - 404):**
```json
{
  "error": "Benchmark results not found or expired",
  "benchmarkId": "a8129b9d-65cd-44c2-bcdd-21b14857cca5"
}
```

**Response (Complete - 200):**
```json
{
  "benchmarkId": "a8129b9d-65cd-44c2-bcdd-21b14857cca5",
  "modelFile": "Model.ptml",
  "algorithm": "PTALIGN",
  "numThreads": 4,
  "startTime": "2026-02-15T14:53:50",
  "endTime": "2026-02-15T14:54:35",
  "totalExecutionTimeMs": 45230,
  "peakMemoryMb": 512,
  "success": true,
  "errorMessage": null,
  "ptalignConfig": {
    "use_bounds": true,
    "use_warm_start": true,
    "bound_threshold": 1.0,
    "bounded_skip_strategy": "upper",
    "propagate_costs": false
  },
  "logResults": [ ... ]
}
```

---

### Run Benchmark (Sync)

```http
POST /benchmark/run-sync
Content-Type: application/json
```

Same request body as async. **Blocks until complete.**

**Response:**
```json
{
  "status": "success",
  "benchmarkId": "a8129b9d-65cd-44c2-bcdd-21b14857cca5",
  "algorithm": "PTALIGN",
  "totalExecutionTimeMs": 45230,
  "success": true,
  "logsProcessed": 5
}
```

---

### Restart PTALIGN Servers

```http
POST /benchmark/restart-ptalign-servers
```

Restarts Python alignment servers for clean measurement state. Use between benchmark runs for accurate timing comparisons.

**Response:**
```json
{
  "status": "success",
  "message": "PTALIGN servers restarted"
}
```

---

### Get Comparative Results

```http
GET /benchmark/compare/{comparativeId}
```

Returns cached comparative benchmark results.

---

## Data Types

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
  "timing": { ... },
  "optimizationStats": { ... },
  "alignments": [ ... ],
  "boundsProgression": [ ... ],
  "globalBoundsProgression": [ ... ]
}
```

### TimingBreakdown

```json
{
  "total_ms": 8450,
  "compute_ms": 7200,
  "overhead_ms": 1250,
  "parse_ms": 350,
  "network_ms": 900,
  "efficiency": 0.852
}
```

| Field | Description |
|-------|-------------|
| `total_ms` | Total wall-clock time |
| `compute_ms` | Pure alignment computation time |
| `overhead_ms` | I/O, parsing, network overhead |
| `parse_ms` | XES file parsing time |
| `network_ms` | HTTP round-trip time (PTALIGN only) |
| `efficiency` | `compute_ms / total_ms` |

### OptimizationStats

```json
{
  "full_alignments": 5,
  "warm_start_alignments": 32,
  "bounded_skips": 8,
  "cached_alignments": 0,
  "optimization_rate": 0.889
}
```

| Field | Description |
|-------|-------------|
| `full_alignments` | Computed from scratch |
| `warm_start_alignments` | Used reference solution as starting point |
| `bounded_skips` | Skipped due to tight bounds |
| `cached_alignments` | Reused from prior cluster |
| `optimization_rate` | Fraction that avoided full computation |

### TraceAlignmentDetail

```json
{
  "variant_name": ["Activity_A", "Activity_B", "Activity_C"],
  "alignment_cost": 2.0,
  "fitness": 0.9523,
  "trace_length": 12,
  "trace_count": 15,
  "alignment_time_ms": 145,
  "states_explored": 0,
  "method": "warm_start",
  "lower_bound": 1.8,
  "upper_bound": 2.2,
  "confidence": 1.0
}
```

| Field | Description |
|-------|-------------|
| `variant_name` | List of activities in the trace variant |
| `alignment_cost` | Total cost (log moves + model moves) |
| `fitness` | `1 - (cost / (trace_length + cost))` |
| `trace_length` | Number of events in trace |
| `trace_count` | Number of traces with this variant |
| `alignment_time_ms` | Time to compute this alignment |
| `states_explored` | Search states explored (ILP/SPLITPOINT) |
| `method` | `full`, `warm_start`, `bounded_skip`, `cached` |
| `lower_bound` | Computed lower bound on cost |
| `upper_bound` | Computed upper bound on cost |
| `confidence` | 1.0 for exact, lower for estimated |

### BoundsProgressionEntry

```json
{
  "variant_index": 5,
  "num_references": 3,
  "lower_bound": 1.8,
  "upper_bound": 2.5,
  "gap": 0.7,
  "estimated_cost": null,
  "actual_cost": 2.1,
  "method": "warm_start"
}
```

Tracks how bounds tighten as reference alignments accumulate.

### GlobalBoundsSnapshot

```json
{
  "num_references": 3,
  "num_remaining": 42,
  "mean_lower_bound": 1.5,
  "mean_upper_bound": 4.2,
  "mean_gap": 2.7,
  "min_gap": 0.3,
  "max_gap": 5.8,
  "num_skippable": 8
}
```

Snapshot of bounds across all remaining variants at a point in time. Used for convergence visualization.

---

## Error Responses

All endpoints may return:

```json
{
  "status": "error",
  "message": "Description of what went wrong"
}
```

HTTP status codes:
- `200` - Success
- `404` - Resource not found (benchmark pending or expired)
- `500` - Server error