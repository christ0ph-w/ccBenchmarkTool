# Backend: Flask Clustering

## Overview

Python service for trace variant clustering using Levenshtein distance.

## Structure

```
backend-flask/
├── app.py                 # Main Flask app
├── clustering/
│   ├── hierarchical.py    # Agglomerative clustering
│   └── dbscan.py          # Density-based clustering
├── requirements.txt
└── Dockerfile
```

## Endpoints

### POST /api/cluster/traces

Cluster an event log into separate XES files.

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

## Running

```bash
cd backend-flask
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```