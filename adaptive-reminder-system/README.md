# Adaptive Reminder System

This workspace now follows a simple two-part structure:

- `frontend/` - React + Vite + Tailwind web client
- `backend/` - FastAPI backend with the AI/ML logic from the proposal

## Backend structure

The backend is already split in a proposal-friendly way:

- `app/main.py` - FastAPI app entry point
- `app/core/` - config, security, jobs
- `app/db/` - MongoDB connection layer
- `app/api/` - REST routes
- `app/schemas/` - request and response schemas
- `app/services/` - scheduler and emotion input providers
- `app/models/` - core AI logic and decision models
- `app/ml/` - model training pipeline and artifact generation
- `app/artifacts/` - saved model files
- `tests/` - unit tests for model and service logic
- `scripts/` - helper scripts such as data seeding

## Proposal-aligned AI models

The backend currently maps to the three core models from the proposal:

1. Emotion and readiness fusion model
2. Memory decay / SM-2 review model
3. Reinforcement-learning scheduling model

## Current progress

From the chat history, the project has already reached a strong prototype stage:

- the dataset was created and used for early experimentation
- backend API, auth, MongoDB, and scheduling logic were implemented
- AI model artifacts were trained and saved
- a frontend web client was scaffolded and moved into this project

The next clean-up step is to keep only the source folders and remove temporary artifacts such as logs, caches, and other generated files when they are no longer needed.
