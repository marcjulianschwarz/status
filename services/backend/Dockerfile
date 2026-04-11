FROM python:3.11-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Set working directory
WORKDIR /app

# Copy uv configuration files
COPY pyproject.toml uv.lock* ./

# Install dependencies
RUN uv sync --frozen --no-cache

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application using uv
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
