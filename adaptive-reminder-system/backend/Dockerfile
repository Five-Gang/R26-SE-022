FROM python:3.12-slim

# install uv (fast python package manager)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# install deps first for better layer caching
COPY pyproject.toml ./
RUN uv pip install --system --no-cache '.[dev]'

# copy app code (overridden by volume mount in dev, but needed for prod)
COPY app ./app
COPY tests ./tests

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
