# Developer Guide

## Prerequisites

- **Java 21** - For Spring Boot backend
- **Python 3.10+** - For alignment and clustering services
- **Gurobi 13.0+** - For PTALIGN optimization (requires license)
- **Node.js 18+** - For frontend development

---

## Project Setup

### 1. Clone and Navigate

```bash
git clone <repository-url>
cd ccBenchmarkTool
```

### 2. Backend: Spring Boot

```bash
cd backend-springboot
./gradlew build
./gradlew bootRun
```

### 3. Backend: Python Alignment

```bash
cd backend-alignment

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\Activate.ps1

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Verify Gurobi license
python -c "import gurobipy as gp; print(f'Gurobi {gp.gurobi.version()}')"
```

### 4. Frontend

```bash
cd frontend-electron
npm install
npm run dev
```

---

## Adding a New Alignment Algorithm

### Step 1: Create Strategy Class

Create a new file in `backend-springboot/src/main/java/com/benchmarktool/api/util/strategy/`:

```java
package com.benchmarktool.api.util.strategy;

import org.springframework.stereotype.Component;

@Component
public class MyNewAlignmentStrategy implements AlignmentStrategy {
    
    @Override
    public ModelType getModelType() {
        return ModelType.PETRI_NET;  // or PROCESS_TREE
    }
    
    @Override
    public String getName() {
        return "MYALGO";
    }
    
    @Override
    public String getDescription() {
        return "My new alignment algorithm";
    }
    
    @Override
    public AlignmentResult computeAlignment(AlignmentInput input) throws Exception {
        // Your implementation here
        long startTime = System.currentTimeMillis();
        
        // ... compute alignment ...
        
        long executionTime = System.currentTimeMillis() - startTime;
        
        return AlignmentResult.builder()
            .avgFitness(fitness)
            .avgCost(cost)
            .totalTraces(traceCount)
            .totalVariants(variantCount)
            .successfulAlignments(variantCount)
            .failedAlignments(0)
            .executionTimeMs(executionTime)
            .alignments(alignmentDetails)
            .build();
    }
}
```

### Step 2: Auto-Registration

The `AlignmentStrategyRegistry` automatically discovers all `@Component` classes implementing `AlignmentStrategy`. No manual registration needed.

### Step 3: Add Model Type (if needed)

If your algorithm uses a new model format, update `ModelType.java`:

```java
public enum ModelType {
    PETRI_NET("pnml"),
    PROCESS_TREE("ptml"),
    MY_NEW_FORMAT("xyz");  // Add this
    
    private final String fileExtension;
    
    ModelType(String fileExtension) {
        this.fileExtension = fileExtension;
    }
    
    public String getFileExtension() {
        return fileExtension;
    }
}
```

And update `BenchmarkRequest.java` to add the new model path field.

---

## Adding PTALIGN Configuration Options

### Step 1: Add to BenchmarkRequest

```java
// In BenchmarkRequest.java
private Boolean myNewOption = false;

public Boolean getMyNewOption() {
    return myNewOption != null ? myNewOption : false;
}
public void setMyNewOption(Boolean myNewOption) {
    this.myNewOption = myNewOption;
}
```

### Step 2: Pass to Strategy

```java
// In BenchmarkExecutor.java, inside the PTALIGN configuration block
ptStrategy.setMyNewOption(request.getMyNewOption());
```

### Step 3: Add to ProcessTreeAlignmentStrategy

```java
// Field
private boolean myNewOption = false;

// Setter
public void setMyNewOption(boolean myNewOption) {
    this.myNewOption = myNewOption;
}
```

### Step 4: Pass to AlignmentClient

```java
// In AlignmentClient.AlignmentRequest record, add the field
public record AlignmentRequest(
    String logPath,
    boolean useBounds,
    boolean useWarmStart,
    double boundThreshold,
    String boundedSkipStrategy,
    String distanceMatrixPath,
    Map<String, Double> priorCosts,
    boolean myNewOption  // Add this
) {}

// In AlignmentClient.align(), add to request body
requestBody.put("my_new_option", request.myNewOption());
```

### Step 5: Handle in Python

```python
# In alignment_server.py, /align endpoint
my_new_option = data.get('my_new_option', False)

# Pass to alignment logic
result = run_alignment(
    log_path=log_path,
    # ...
    my_new_option=my_new_option
)
```

---

## Modifying JSON Export Format

Edit `BenchmarkResultExporter.java`:

```java
// In buildLogResultNode()
logNode.put("my_new_field", logResult.getMyNewField());

// For nested objects
ObjectNode myNode = objectMapper.createObjectNode();
myNode.put("sub_field", value);
logNode.set("my_section", myNode);

// For arrays
ArrayNode myArray = objectMapper.createArrayNode();
for (Item item : items) {
    myArray.add(buildItemNode(item));
}
logNode.set("my_items", myArray);
```

---

## Understanding the PTALIGN Subpackage

The `ptalign/` subpackage separates concerns for the Python-based alignment:

```
util/strategy/ptalign/
├── PythonServerManager.java   # Server lifecycle (start, stop, health checks)
├── AlignmentClient.java       # HTTP communication with Python servers
└── ResponseParser.java        # JSON response parsing into domain objects
```

### PythonServerManager

Responsibilities:
- Start/stop Python server processes
- Health check polling
- Port allocation (5001, 5002, ...)
- Load balancing via round-robin

Key methods:
- `ensureServersRunning(int count)` - Returns `true` if servers were restarted
- `stopAllServers()` - Clean shutdown
- `getNextServerUrl()` - Round-robin server selection

### AlignmentClient

Responsibilities:
- HTTP POST to `/load-model` and `/align` endpoints
- Request serialization
- Response status checking

### ResponseParser

Responsibilities:
- Parse JSON response into `AlignmentResult`
- Extract timing breakdown
- Parse optimization stats
- Parse per-variant alignment details

---

## Running Tests

### Spring Boot

```bash
cd backend-springboot
./gradlew test
```

### Python

```bash
cd backend-alignment
.\venv\Scripts\Activate.ps1
python -m pytest  # if tests exist
```

### Manual Integration Test

```bash
# Start Spring Boot (Terminal 1)
cd backend-springboot
./gradlew bootRun

# Test endpoint (Terminal 2)
curl -X POST http://localhost:8080/api/benchmark/run \
  -H "Content-Type: application/json" \
  -d '{
    "algorithm": "PTALIGN",
    "ptmlModelPath": "20250915_data/Model.ptml",
    "logDirectory": "20250915_data/EventLog.xes",
    "numThreads": 1
  }'
```

---

## Debugging

### Enable Verbose Logging

In `application.properties`:
```properties
logging.level.com.benchmarktool=DEBUG
logging.level.org.springframework.web=DEBUG
```

### Check Python Server Health

```bash
curl http://localhost:5001/health
```

### View Gurobi Logs

Check `gurobi.log` in the Python working directory. To suppress:
```python
env.setParam('LogFile', '')
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "No model loaded" | Servers restarted but model not reloaded | Fixed in `ensureServersRunning()` - returns boolean |
| Path not found | Relative path resolution | Check `PathResolver` and working directory |
| Gurobi license error | License file not found | Set `GRB_LICENSE_FILE` or check default paths |
| Port already in use | Previous server didn't shut down | Kill Python processes on ports 5001+ |

---

## Key Classes Reference

| Class | Location | Purpose |
|-------|----------|---------|
| `BenchmarkExecutor` | service/ | Orchestrates benchmark execution |
| `ProcessTreeAlignmentStrategy` | util/strategy/ | PTALIGN entry point, delegates to ptalign/ |
| `PythonServerManager` | util/strategy/ptalign/ | Python process lifecycle |
| `AlignmentClient` | util/strategy/ptalign/ | HTTP communication |
| `ResponseParser` | util/strategy/ptalign/ | JSON parsing |
| `AlignmentResult` | util/strategy/ | Unified result format |
| `BenchmarkResultExporter` | service/ | JSON file export |
| `PathResolver` | util/ | Path resolution to data directory |
| `AlignmentStrategyRegistry` | util/strategy/ | Auto-discovers strategies |