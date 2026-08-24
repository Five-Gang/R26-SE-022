# LOA-ESS: Learning Outcome-Aware Educational Summarization System

A research-grade AI-powered educational summarization system that produces learning outcome-aligned summaries using a novel LO-RAG (Learning Outcome-Guided Retrieval-Augmented Generation) architecture.

## Research Project

**Hypothesis**: Providing module outlines, course learning outcomes, and educational context to an LLM through Retrieval-Augmented Generation (RAG) results in summaries that are more aligned with intended learning outcomes than generic summarization systems.

## Architecture

- **Backend**: FastAPI (Python 3.12)
- **Frontend**: Next.js 15 (React, TypeScript)
- **Vector Database**: Qdrant
- **Relational Database**: PostgreSQL 16
- **Task Queue**: Celery + Redis
- **Object Storage**: MinIO (S3-compatible)
- **LLM**: Google Gemini 2.5 Flash / OpenAI GPT-4o-mini
- **Embeddings**: OpenAI text-embedding-3-small / all-MiniLM-L6-v2
- **Monitoring**: Langfuse

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Python 3.12+
- Node.js 20+
- pnpm

### Development Setup

```bash
# Clone the repository
git clone <repo-url>
cd loa-ess

# Copy environment variables
cp .env.example .env

# Start infrastructure services
docker compose up -d

# Backend setup
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Frontend setup (in another terminal)
cd frontend
pnpm install
pnpm dev
```

## Project Structure

```
loa-ess/
├── backend/          # FastAPI backend
├── frontend/         # Next.js frontend
├── evaluation/       # Research evaluation scripts & notebooks
├── docs/             # Documentation
└── infra/            # Kubernetes & deployment configs
```

## License

MIT
