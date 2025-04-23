FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY embedding/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY embedding ./embedding

# Create models directory
RUN mkdir -p /app/models

# Expose port
EXPOSE 8000

# Start server
CMD ["python", "embedding/app.py"]