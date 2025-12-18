# Multi-stage build for optimized production image
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

# Copy dependency files first for better caching
COPY pyproject.toml uv.lock ./

# Install dependencies only (not the project itself yet)
# This layer will be cached unless dependencies change
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# Copy only necessary source files (excluding .venv, __pycache__, etc. via .dockerignore)
COPY *.py ./
COPY prompts.yaml ./
COPY utils/ ./utils/

# Install the project itself (fast since deps already installed)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# Final production image
FROM python:3.13-slim-bookworm

WORKDIR /app

# Copy only the virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy application code
COPY --from=builder /app/*.py /app/
COPY --from=builder /app/prompts.yaml /app/
COPY --from=builder /app/utils/ /app/utils/

# Set PATH to use the virtual environment
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

# Expose API port
EXPOSE 8001

# Run the FastAPI application
CMD ["uvicorn", "api:api", "--host", "0.0.0.0", "--port", "8001"]