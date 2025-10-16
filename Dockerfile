# Dockerfile for LLM Game Python Server
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code and static files
COPY server/ ./server/
COPY static/ ./static/

# Expose port (will be overridden by PORT env var)
EXPOSE 8080

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the server
CMD ["python", "server/game_server.py"]
