# Spring Boot Benchmark API

Benchmark orchestration service for conformance checking algorithms.

## Quick Start

### Windows

```powershell
.\gradlew.bat bootRun
```

### Linux/macOS

```bash
./gradlew bootRun
```

### Docker

```bash
docker build -t springboot-benchmark .
docker run -p 8080:8080 springboot-benchmark
```

Or from the root directory:

```bash
docker-compose up springboot-backend
```

## API

**Base URL:** `http://localhost:8080/api/benchmark`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/algorithms` | GET | List available algorithms |
| `/run` | POST | Start async benchmark |
| `/run/{id}` | GET | Get cached results |
| `/run-sync` | POST | Run benchmark synchronously |
| `/restart-ptalign-servers` | POST | Restart Python alignment servers |

### Example Request

```json
POST /api/benchmark/run-sync

{
  "algorithm": "ILP",
  "pnmlModelPath": "path/to/model.pnml",
  "logDirectory": "path/to/logs/"
}
```

**Available algorithms:** `ILP`, `SPLITPOINT`, `PTALIGN`

## Configuration

Edit `src/main/resources/application.properties`:

```properties
server.port=8080
server.servlet.context-path=/api
benchmark.data.directory=../data
```

## Documentation

For detailed documentation including:
- How the benchmark pipeline works
- Adding new alignment algorithms
- PTALIGN Python server integration

See [docs/components/backend-springboot.md](../docs/components/backend-springboot.md)