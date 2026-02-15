FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for Gurobi
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 5001

CMD ["python", "process-tree-alignment/alignment_server.py", "--port", "5001"]