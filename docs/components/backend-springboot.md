# Backend: Spring Boot

## Overview

Java REST API for benchmark orchestration. Handles ILP/SPLITPOINT alignments directly via ProM, delegates PTALIGN to Python servers.

## Package Structure

```
com.benchmarktool.api/
├── controller/
│   └── BenchmarkingController.java
├── service/
│   ├── BenchmarkExecutor.java
│   ├── BenchmarkResultExporter.java
│   └── ResultCache.java
└── util/strategy/
    ├── AlignmentStrategy.java
    ├── ILPAlignmentStrategy.java
    ├── SplitPointAlignmentStrategy.java
    ├── ProcessTreeAlignmentStrategy.java
    └── ptalign/
        ├── PythonServerManager.java
        ├── AlignmentClient.java
        └── ResponseParser.java
```

## Key Classes

### BenchmarkExecutor
Orchestrates benchmark runs. Loops over log files, calls strategy, collects results.

### ProcessTreeAlignmentStrategy
Manages Python server lifecycle and delegates alignment computation.

### PythonServerManager
Starts/stops Python processes. Handles health checks. One server per thread.

### AlignmentClient
HTTP client for Python servers. Sends alignment requests, receives JSON responses.

## Configuration

```properties
# application.properties
server.port=8080
server.servlet.context-path=/api
benchmark.data.directory=../data
```

## Adding a New Algorithm

1. Create `NewAlgorithmStrategy.java` implementing `AlignmentStrategy`
2. Annotate with `@Component`
3. Register automatically via `AlignmentStrategyRegistry`