FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY vector_store/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY vector_store ./vector_store

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 8001

# Start server
CMD ["python", "vector_store/app.py"]