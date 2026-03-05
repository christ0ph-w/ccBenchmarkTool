# Getting Started

This guide walks you through setting up the ccBenchmarkTool for local development.

## Prerequisites

Before you begin, install the following:

- Java 21 (OpenJDK recommended)
- Python 3.11 or higher
- Node.js 18 or higher
- Gurobi Optimizer with a valid license

Verify your installations:

```powershell
java --version
python --version
node --version
gurobi_cl --version
```

## Required Files

### Gurobi License

Place your gurobi.lic file in the root directory of the project. The alignment server will not work without it.

You can get a free academic license at gurobi.com if you have a university email.

### LPSolve Libraries

The ILP and SplitPoint algorithms require LPSolve libraries. These should already be in the repository under backend-springboot/lib/:

```
lib/
├─ linux/
│  ├─ liblpsolve55.so
│  └─ liblpsolve55j.so
├─ liblpsolve55.lib
├─ liblpsolve55d.lib
├─ lp_Hash.h
├─ lp_lib.h
├─ lp_matrix.h
├─ lp_mipbb.h
├─ lp_SOS.h
├─ lp_types.h
├─ lp_utils.h
├─ lpsolve55.dll
├─ lpsolve55.lib
└─ lpsolve55j.dll
```

The Windows files (dll, lib) are used for local development. The linux directory is used for Docker images.

## Manual Setup

### 1. Clone the repository

```bash
git clone https://github.com/christ0ph-w/ccBenchmarkTool.git
cd ccBenchmarkTool
```

### 2. Flask backend

```powershell
cd backend-flask
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
deactivate
```

This may take a few minutes.

### 3. Alignment backend

```powershell
cd ..\backend-alignment
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
deactivate
```

This may take a few minutes.

### 4. Frontend

```powershell
cd ..\frontend
npm install
```

### 5. Spring Boot backend

```powershell
cd ..\backend-springboot
.\gradlew.bat build
```

This downloads Gradle, fetches dependencies, and compiles the project.

## Running the Application

Open 3 terminals and run the following:

Terminal 1 - Flask backend:
```powershell
cd backend-flask
.\venv\Scripts\activate
python app.py
```

Terminal 2 - Spring Boot backend:
```powershell
cd backend-springboot
.\gradlew.bat bootRun
```

Terminal 3 - Frontend:
```powershell
cd frontend
npm run dev
```

The alignment server is started automatically by Spring Boot when you run a PTALIGN benchmark.

Once everything is running:
- Frontend: http://localhost:5173
- Spring Boot API: http://localhost:8080/api
- Flask API: http://localhost:5000

## Docker Setup

If you prefer not to install dependencies locally, use Docker. You only need:
- Docker Desktop installed and running
- Gurobi license file (gurobi.lic) in the root directory

### Step 1: Build the images

```bash
docker-compose build
```

This builds two images:
- `flask-backend`: Python clustering API (~335MB)
- `springboot-backend`: Java API with alignment server (~472MB)

First build takes several minutes as it downloads base images and dependencies.

For a clean build without cache:

```bash
docker-compose build --no-cache
```

### Step 2: Start the services

```bash
docker-compose up
```

This starts:
- Flask clustering API on port 5000
- Spring Boot API on port 8080 (alignment server managed internally)

Add `-d` to run in detached mode (background):

```bash
docker-compose up -d
```

### Step 3: Start the frontend

The frontend is not included in docker-compose. Run it separately:

```powershell
cd frontend
npm install
npm run dev
```

### Step 4: Verify services are running

```bash
docker-compose ps
```

You should see both containers with status "Up".

Test the APIs:
- Flask: http://localhost:5000
- Spring Boot: http://localhost:8080/api

### Managing containers

Stop all services:

```bash
docker-compose down
```

View logs:

```bash
docker-compose logs -f
```

View logs for a specific service:

```bash
docker-compose logs -f flask-backend
```

Rebuild a single service:

```bash
docker-compose build flask-backend
docker-compose up flask-backend
```

## Verifying the Setup

1. Open the frontend at http://localhost:5173
2. Load a dataset from the data directory
3. Run clustering on a log file
4. Run an alignment benchmark

If all steps complete without errors, your setup is working.

## Troubleshooting

### Gurobi license not found

Make sure gurobi.lic is in the root directory of the project, not inside a subdirectory.

### Python module not found

Make sure you activated the virtual environment before running the application:

```powershell
.\venv\Scripts\activate
```

### Spring Boot build fails

Check that Java 21 is installed and on your PATH. Run `java --version` to verify.

### Port already in use

Another application is using the port. Either stop that application or change the port in the configuration files.

