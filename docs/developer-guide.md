# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Electron)                       │
│                    Port 5173 (dev)                          │
└──────────────┬─────────────────────────┬────────────────────┘
               │                         │
               ▼                         ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│   Spring Boot API        │  │   Flask Clustering           │
│   Port 8080              │  │   Port 5000                  │
│   /api/benchmark/*       │  │   /api/cluster/*             │
└──────────────┬───────────┘  └──────────────────────────────┘
               │
               ▼
┌──────────────────────────┐
│   Python Alignment       │
│   Ports 5001-5016        │
│   (spawned by Spring)    │
└──────────────────────────┘
```

## Components

| Component | Tech Stack | Port | Purpose |
|-----------|------------|------|---------|
| frontend-electron | Electron + React + TS | 5173 | Desktop UI |
| backend-springboot | Java 21 + Spring Boot | 8080 | Benchmark orchestration |
| backend-flask | Python + Flask | 5000 | Trace clustering |
| backend-alignment | Python + Gurobi | 5001+ | PTALIGN alignment |

## Alignment Algorithms

| Algorithm | Model | Implementation |
|-----------|-------|----------------|
| ILP | Petri Net (.pnml) | Java/ProM |
| SPLITPOINT | Petri Net (.pnml) | Java/ProM |
| PTALIGN | Process Tree (.ptml) | Python/Gurobi |

## Data Flow

```
Input: Model + EventLog.xes
         ↓
   [Clustering] → cluster_0.xes, cluster_1.xes, ...
         ↓
   [Alignment] → alignments per variant
         ↓
Output: results/benchmark_{id}_{algo}_{model}_{log}.json
```

See component docs for details:
- [backend-springboot](components/backend-springboot.md)
- [backend-alignment](components/backend-alignment.md)
- [backend-flask](components/backend-flask.md)
- [frontend-electron](components/frontend-electron.md)