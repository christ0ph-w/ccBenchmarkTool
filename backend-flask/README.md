# Flask Clustering REST API

Clustering and pipeline service for benchmark tool.

## Setup

### Local Development (Windows)

```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```

### Docker

```powershell
# Build and run
docker build -t flask-clustering .
docker run -p 5000:5000 flask-clustering

# Or use docker-compose from root directory
cd ..
docker-compose up flask-backend
```

## API Structure

- `/api/clustering` - Clustering endpoints
- Controller: `app/controllers/clustering_controller.py`
- Service: `app/services/pipeline_service.py`

## Environment Variables

Copy `.env.example` to `.env` and configure as needed.

## Project Structure

```
backend-flask/
├── app/
│   ├── controllers/
│   ├── services/
│   └── utils/
├── tests/
├── app.py
├── config.py
└── requirements.txt
```