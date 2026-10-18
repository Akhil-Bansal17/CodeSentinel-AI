# Stage 1: Build dependencies in an isolated build environment
FROM python:3.12-slim-bookworm AS builder

WORKDIR /build

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies to user directory
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt


# Stage 2: Minimal, hardened production runtime
FROM python:3.12-slim-bookworm AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PATH="/home/codesentinel/.local/bin:${PATH}"

# Apply security patches and install only minimal runtime libraries
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged non-root service user
RUN groupadd --gid 10001 codesentinel \
    && useradd --uid 10001 --gid codesentinel --create-home --shell /bin/bash codesentinel

# Copy installed Python packages from builder
COPY --from=builder --chown=codesentinel:codesentinel /root/.local /home/codesentinel/.local

# Copy application source code
COPY --chown=codesentinel:codesentinel . .

# Switch to non-root user
USER codesentinel

# Expose API port
EXPOSE 8000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run uvicorn server
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
