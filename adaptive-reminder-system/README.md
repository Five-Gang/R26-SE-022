# Adaptive Reminder System

Emotion- and progress-aware adaptive study reminder system.
Component 4 of R26-SE-022 (Smart Study Assistant).

## Quick start

```powershell
# 1. copy env file
copy .env.example .env

# 2. start postgres + backend
docker compose up --build

# 3. open API docs
# http://localhost:8000/docs
```

## Project layout

```
backend/        FastAPI app, services, tests
frontend/       React + Vite + TypeScript (added day 6)
docker-compose.yml
.env.example    template; copy to .env
```

## Daily workflow

```powershell
docker compose up         # start
docker compose down       # stop
docker compose logs -f api  # follow logs
docker compose exec api pytest  # run tests
```

## Tech stack

- Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2
- PostgreSQL 16
- pytest, ruff, mypy
- Docker Compose
- React 18 + Vite + TypeScript (frontend)
