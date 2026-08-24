# LOA-ESS Quick Start Guide

## What You Need to Get Running

### Step 1 — Get a Gemini API Key (Free)

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API key"**
4. Copy the key

### Step 2 — Set Your API Key

Open `backend/.env` and replace:
```
GOOGLE_API_KEY=YOUR_GEMINI_KEY_HERE
```
with your actual key. That's the only required change.

> **Note:** The system is pre-configured to use:
> - **Gemini 2.5 Flash** for text generation (free tier covers development)
> - **Local all-MiniLM-L6-v2** for embeddings (completely free, runs on CPU)

---

### Step 3 — Start Infrastructure (Docker)

```bash
cd /Users/kavindugayashan/Desktop/Rp-AI\ summarzior/loa-ess
docker compose up -d
```

This starts:
- **PostgreSQL** on port 5432
- **Qdrant** (vector DB) on port 6333
- **Redis** (task queue) on port 6379
- **MinIO** (file storage) on port 9000

---

### Step 4 — Install Backend Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

### Step 5 — Start the Backend API

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Visit [http://localhost:8000/docs](http://localhost:8000/docs) to see the Swagger UI.

---

### Step 6 — Start the Frontend

```bash
cd frontend
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Cost Estimates (Per Research Session)

| Provider | Usage | Estimated Cost |
|----------|-------|---------------|
| Gemini 2.5 Flash | 100 summaries | ~$0.05 (often free) |
| OpenAI embeddings | 500 documents | ~$0.01 |
| Local embeddings | Unlimited | **Free** |

## If You Also Want OpenAI

Optionally add your OpenAI key to `backend/.env` for:
- Higher quality embeddings (`text-embedding-3-small`)
- GPT-4o-mini as LLM fallback

Get key at: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
