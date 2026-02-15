# Backend: Python Alignment (PTALIGN)

## Overview

Flask server providing Process Tree alignment via Gurobi optimization.

## Structure

```
backend-alignment/
├── process-tree-alignment/
│   ├── alignment_server.py      # Flask endpoints
│   ├── alignment_logic.py       # Main alignment algorithm
│   ├── process_tree_alignment_opt.py  # Gurobi model
│   ├── bounds.py                # Lower/upper bound computation
│   ├── distance_matrix.py       # Variant distance calculation
│   └── models.py                # Data classes
├── requirements.txt
└── Dockerfile
```

## Endpoints

### POST /load-model
Load a PTML file into memory.

### POST /align
Compute alignment for a single variant.

### GET /health
Server health check.

## Running Manually

```bash
cd backend-alignment
.\venv\Scripts\Activate.ps1
python process-tree-alignment/alignment_server.py --port 5001
```

## Gurobi License

Requires valid Gurobi license. Options:
- Local license file
- WLS (Web License Service) via environment variables