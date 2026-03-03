# ccBenchmarkTool Architecture

## Overview

ccBenchmarkTool is a desktop application for conformance checking benchmarks in process mining. It measures time and memory usage for alignments. Fitness is used as a quality measure.

## System Components

```mermaid
flowchart TB
    subgraph Frontend
        E[Electron + React + TypeScript<br/>frontend-electron/]
    end
    
    subgraph Backend Services
        S[Spring Boot API<br/>backend-springboot/<br/>Port 8080]
        F[Flask Clustering<br/>backend-flask/<br/>Port 5000]
        A[PTALIGN Service<br/>backend-alignment/<br/>Port 5001+]
    end
    
    subgraph Data
        D[(data/)]
    end
    
    E -->|REST API| S
    E -->|REST API| F
    S -->|Spawns & HTTP| A
    S -->|Read/Write| D
    F -->|Read/Write| D
    A -->|Read| D
```

## Component Responsibilities

| Component | Technology | Purpose |
|-----------|------------|---------|
| **frontend-electron** | Electron + React + TypeScript | File management, configuration UI, results visualization |
| **backend-springboot** | Java 21 + Spring Boot 3 | Benchmark orchestration, ILP/SplitPoint alignment, result export |
| **backend-flask** | Python + Flask | Trace variant clustering (DBSCAN, Hierarchical) |
| **backend-alignment** | Python + Flask + Gurobi | Process tree alignment (PTALIGN) with warm start optimization |

## Alignment Algorithms

| Algorithm | Model Type | Implementation | Description |
|-----------|------------|----------------|-------------|
| **ILP** | Petri Net (.pnml) | Java (ProM) | Integer Linear Programming - optimal but slower |
| **SPLITPOINT** | Petri Net (.pnml) | Java (ProM) | Split-point heuristic - faster approximation |
| **PTALIGN** | Process Tree (.ptml) | Python (Gurobi) | Warm start + bounds optimization |

---

## Key Workflows

### Benchmark Execution

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant API as Spring Boot
    participant Exec as BenchmarkExecutor
    participant Strategy as AlignmentStrategy
    participant Server as PTALIGN Server
    
    UI->>API: POST /benchmark/run
    API-->>UI: {benchmarkId, statusUrl}
    
    API->>Exec: executeBenchmark()
    
    alt PTALIGN
        Exec->>Strategy: ensureServersRunning()
        Strategy->>Server: Start Python process(es)
        Strategy->>Server: POST /load-model
        loop For each XES file
            Exec->>Strategy: computeAlignmentFromFile()
            Strategy->>Server: POST /align
            Server-->>Strategy: JSON response
        end
    else ILP or SPLITPOINT
        loop For each XES file
            Exec->>Strategy: computeAlignment()
            Note right of Strategy: In-process via ProM
        end
    end
    
    Exec->>Exec: Export results to JSON
    
    UI->>API: GET /benchmark/run/{id}
    API-->>UI: BenchmarkResult
```

### Clustering Flow

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant Flask as Flask Clustering
    participant FS as File System
    
    UI->>Flask: POST /cluster/traces
    Flask->>FS: Read XES file
    Flask->>Flask: Extract variants
    Flask->>Flask: Compute Levenshtein distance matrix
    Flask->>Flask: Run clustering algorithm
    Flask->>FS: Write cluster XES files
    Flask-->>UI: {clusters, exported_files}
```

### PTALIGN Server Lifecycle

```mermaid
stateDiagram-v2
    [*] --> NoServers
    NoServers --> Starting: ensureServersRunning(n)
    Starting --> Ready: Health checks pass
    Ready --> Ready: Same server count
    Ready --> Stopping: Different count requested
    Stopping --> Starting: Start new count
    Ready --> LoadingModel: New model path
    LoadingModel --> Ready: Model loaded
    Ready --> [*]: Shutdown
```

---

## Data Flow

### Input Files

```
data/{timestamp}_data/
├── Model.pnml              # Petri net model
├── Model.ptml              # Process tree model
└─��� EventLog.xes            # Original event log
```

### After Clustering

```
data/{timestamp}_data/
├── EventLog_hierarchical_{timestamp}_clusters/
│   ├── cluster_0.xes
│   ├── cluster_1.xes
│   └── cluster_2.xes
└── distance_matrix/
    └── EventLog_distance_nosub.json
```

### After Benchmark

```
data/{timestamp}_data/
└── results/
    └── benchmark_{id}_{algo}_{model}_{log}.json
```

---

## Port Allocation

| Service | Port | Notes |
|---------|------|-------|
| Spring Boot API | 8080 | Context path `/api` |
| Flask Clustering | 5000 | Single instance |
| PTALIGN Servers | 5001+ | One per thread (max 16) |
| Vite Dev Server | 5173 | Frontend development |

---

## Configuration

### Spring Boot

`backend-springboot/src/main/resources/application.properties`:

```properties
server.port=8080
server.servlet.context-path=/api
benchmark.data.directory=../data
```

### PTALIGN Options

| Option | Default | Description |
|--------|---------|-------------|
| `useBounds` | true | Enable bounds computation |
| `useWarmStart` | true | Use reference alignments |
| `boundThreshold` | 1.0 | Gap threshold for skipping |
| `boundedSkipStrategy` | "upper" | Cost estimation strategy |
| `propagateCostsAcrossClusters` | false | Share costs across clusters |

---

## Starting the Application

### Development

```bash
# Terminal 1: Spring Boot
cd backend-springboot
./gradlew bootRun

# Terminal 2: Frontend
cd frontend-electron
npm run dev

# Terminal 3 (optional): Flask clustering
cd backend-flask
python app.py
```

### Docker

```bash
docker-compose up
```

---

## Further Reading

- [API Reference](api-reference.md) - All endpoints and data types
- [Developer Guide](developer-guide.md) - Quick reference
- Component docs:
  - [backend-springboot](components/backend-springboot.md)
  - [backend-alignment](components/backend-alignment.md)
  - [backend-flask](components/backend-flask.md)