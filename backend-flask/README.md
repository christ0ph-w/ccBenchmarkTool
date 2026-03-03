# Flask Clustering REST API

Trace variant clustering service using Levenshtein distance.

## Quick Start

### Windows

```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Linux/macOS

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### Docker

```bash
docker build -t flask-clustering .
docker run -p 5000:5000 flask-clustering
```

Or from the root directory:

```bash
docker-compose up flask-backend
```

## API

**Base URL:** `http://localhost:5000/api`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/cluster/traces` | POST | Cluster variants from XES file |

### Example Request

```json
POST /api/cluster/traces

{
  "file_path": "path/to/EventLog.xes",
  "clustering_algorithm": "hierarchical",
  "algorithm_params": {
    "n_clusters": 3,
    "linkage": "average"
  }
}
```

**Available algorithms:** `dbscan`, `hierarchical`

## Configuration

Copy `.env.example` to `.env` and adjust as needed.

## Documentation

For detailed documentation including:
- How the clustering pipeline works
- Adding new clustering algorithms
- Parameter explanations

See [docs/components/backend-flask.md](../docs/components/backend-flask.md)