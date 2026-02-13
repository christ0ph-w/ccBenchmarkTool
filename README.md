# CC Benchmark Tool

Multi-service benchmark application with Flask clustering backend, Spring Boot orchestration, alignment service, and Electron frontend.

## Project Structure

```
ccBenchmarkTool/
├── backend-flask/          # Clustering REST API (Python/Flask)
├── backend-alignment/      # Process tree alignment service (Python/Gurobi)
├── backend-springboot/     # Orchestration backend (Java/Spring Boot)
├── frontend-electron/      # Desktop UI (Electron)
├── docs/                   # Documentation
├── docker-compose.yml      # Docker orchestration
└── README.md              # This file
```

## Quick Start

### Using Docker (Recommended)

```powershell
# Start all services
docker-compose up

# Or in detached mode
docker-compose up -d

# Stop all services
docker-compose down
```

### Manual Setup

See individual component README files:
- [Flask Clustering Backend](./backend-flask/README.md)
- Spring Boot Backend (coming soon)
- Alignment Service (coming soon)
- Electron Frontend (coming soon)

## Development

### Prerequisites
- Docker Desktop for Windows
- Python 3.11+
- Java 17+
- Node.js 18+
- Gurobi 13.0.0 (for alignment service)

## Migration Notes

Restructured repository with:
- Improved organization (monorepo structure)
- Docker support for easy deployment
- Better separation of concerns
- Independent service scaling

## Components Status

-  Flask Clustering Backend - Migrated
-  Alignment Service - Pending
-  Spring Boot Backend - Pending
-  Electron Frontend - Pending