# Adaptive Study Reminder System (ARS3) - Backend

Complete FastAPI backend implementation for the Adaptive Study Reminder System.

## Architecture

- **Backend**: FastAPI 0.111.0 + Motor 3.4.0 (async MongoDB driver)
- **Database**: MongoDB Atlas (free tier M0)
- **ML**: SM-2 algorithm + session-aware ReadinessFusion + LinUCB bandit
- **Scheduling**: APScheduler (every 60 seconds)
- **Authentication**: JWT + bcrypt

## Quick Start (Day 1 - Backend Scaffolding)

### Step 1: Create MongoDB Atlas Cluster

1. Go to https://cloud.mongodb.com
2. Create account (free tier)
3. Create M0 free cluster in **Singapore** region
4. Create database user:
   - Username: `reminder_user`
   - Password: (auto-generate, copy it)
5. Allow network access: `0.0.0.0/0` (for development)
6. Copy connection string (looks like):
   ```
   mongodb+srv://reminder_user:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 2: Set Up Python Environment

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Or (macOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Configure Environment

```bash
# Copy example config
cp .env.example .env

# Edit .env with your MongoDB credentials
# Replace:
# - MONGODB_URL with your connection string
# - JWT_SECRET with a random 32+ character string
```

Example `.env`:

```env
MONGODB_URL=mongodb+srv://reminder_user:mypassword@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=reminder_db
JWT_SECRET=your-super-secret-32-char-key-12345678
JWT_EXPIRE_MINUTES=1440
ENV=dev
EMOTION_PROVIDER=mock
EMOTION_SERVICE_URL=
```

### Step 4: Run Tests

```bash
# Verify SM-2 algorithm (5 test cases)
pytest tests/test_sm2.py -v
#or
python -m pytest tests/ -v --tb=short 2>&1 | Select-Object -First 50

# Expected output:
# test_grade_below_3_resets PASSED
# test_grade_3_or_higher_increments PASSED
# test_difficulty_reduces_interval PASSED
# test_retention_probability_decays PASSED
# test_review_priority_weights_difficulty PASSED
```

### Step 5: Populate Demo Data

```bash
# Run seed script
python -m scripts.seed

# Expected output:
# ✓ Created demo student: kavya@demo.com (ID: uuid...)
# ✓ Created 8 demo review items
# ✓ Seeding complete
```

### Utility Scripts

- `scripts/seed.py` - populate demo students and review items
- `scripts/export_datasets.py` - export training datasets used for the ML models
- `scripts/test_mongodb_connection.py` - verify MongoDB connectivity during setup

### Step 6: Start Backend Server

```bash
# Run development server
uvicorn app.main:app --reload --port 8001
#or
python -m uvicorn app.main:app --reload --port 8001

# Expected output:
# INFO:     Uvicorn running on http://0.0.0.0:8001
# INFO:     Application startup complete
```

### Step 7: Verify Health Endpoint

```bash
# In another terminal:
curl http://localhost:8001/api/v1/dev/health

# Expected response:
# {"status":"ok","env":"dev","emotion_provider":"mock"}
```

### Step 8: Open Signal Lab

Before Mihiraj's component is integrated, you can manually control its future payload shape through the standalone lab UI:

```bash
# From repo root
python run_frontend.py

# Then open
http://localhost:3000/signal-lab.html
```

The lab uses dev endpoints to:

- inject manual values for `valence`, `arousal`, `attention`
- control `activity_type`, `session_active`, and `content_in_focus`
- simulate cue-level inputs like `blink_rate`, `fatigue`, and `head_tilt_degrees`
- preview readiness, bandit output, and scheduler decisions without the real integration

## API Documentation

### Authentication

**POST /api/v1/auth/signup**

```json
{
  "email": "user@example.com",
  "password": "secure123",
  "name": "User Name"
}
```

**POST /api/v1/auth/login**

```json
{
  "email": "user@example.com",
  "password": "secure123"
}
```

Response:

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

### Reminders

**GET /api/v1/reminders**

- Get all SENT reminders for current student
- Requires: Authorization header with JWT token

**POST /api/v1/reminders/{reminder_id}/feedback**

```json
{
  "status": "ACCEPTED",
  "grade": 5
}
```

### Schedule (Dev/Testing)

**POST /api/v1/schedule/tick**

- Manually trigger a scheduling tick
- Reads activity + affective cues -> computes readiness -> only sends during active learning sessions
- Requires: Authorization header

### Dev Signal Control

- `GET /api/v1/dev/students` - list available students for the signal lab
- `GET /api/v1/dev/signal-control/options` - get default lab values and activity types
- `GET /api/v1/dev/signal-control/{student_id}` - inspect current manual override
- `POST /api/v1/dev/signal-control/{student_id}` - apply a manual override payload
- `DELETE /api/v1/dev/signal-control/{student_id}` - clear the manual override
- `GET /api/v1/dev/signal-control/{student_id}/preview` - inspect readiness, bandit, and scheduler outputs
- `POST /api/v1/dev/signal-control/{student_id}/tick` - run one scheduler tick without frontend auth

### Push Notifications

**POST /api/v1/push/subscribe**

```json
{
  "endpoint": "https://...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

## Validation Checkpoints

- ✅ `/api/v1/dev/health` returns `{"status": "ok", ...}`
- ✅ pytest passes all 5 SM-2 test cases
- ✅ Demo student created in MongoDB
- ✅ Scheduling tick creates reminder (check MongoDB)
- ✅ Login returns JWT token

## Core Models

### SM-2 (Spaced Repetition)

- **File**: `app/models/sm2.py`
- **Features**:
  - Grade-based interval adjustment (0-5)
  - Difficulty EMA tracking
  - Exponential forgetting curve
  - Review priority weighting

### ReadinessFusion

- **File**: `app/models/readiness_fusion.py`
- **Input**: Valence, arousal, attention, activity context, blink rate, fatigue, head tilt
- **Output**: Effective readiness score, engagement score, recommendation gate, and tier (HIGH/MEDIUM/LOW)
- **Content mapping**:
  - HIGH → ACTIVE_RECALL
  - MEDIUM → GUIDED_REVIEW
  - LOW → PASSIVE_READING
- **Practical gate**:
  - reminders are blocked when no learning session is active
  - reminders are blocked for non-study contexts such as idle or break states
  - lecture, video, and reading sessions are capped to lower-disruption content types

### LinUCB Bandit

- **File**: `app/models/bandit.py`
- **Context dim**: 9 (readiness, priority, hour cyclical, time since reminder, accept rate, engagement, activity score, bias)
- **Actions**: SEND, DELAY, SKIP
- **Reward mapping**: ACCEPTED=1.0, SNOOZED=0.0, DISMISSED=-1.0

## Development Commands

```bash
# Run with auto-reload
uvicorn app.main:app --reload --port 8001

# Run tests
pytest -v

# Run specific test
pytest tests/test_sm2.py::TestSM2::test_grade_below_3_resets -v

# Seed database
python -m scripts.seed

# Check code style (optional)
flake8 app/

# Format code (optional)
black app/
```

## Environment Variables

| Variable            | Default     | Description                                                                                      |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| MONGODB_URL         | -           | MongoDB connection string                                                                        |
| MONGODB_DB          | reminder_db | Database name                                                                                    |
| JWT_SECRET          | -           | JWT signing secret (32+ chars)                                                                   |
| JWT_EXPIRE_MINUTES  | 1440        | Token expiration (minutes)                                                                       |
| ENV                 | dev         | dev or production                                                                                |
| EMOTION_PROVIDER    | mock        | mock, replay, or http                                                                            |
| EMOTION_SERVICE_URL | -           | URL for Mihiraj's service. See `docs/api-contract.md` for the expected cue and activity payload. |

## Next Steps (Day 2)

1. Implement dashboard stats endpoint
2. Wire frontend React app to backend
3. Test end-to-end flow
4. Prepare demo data and rehearsal

## Troubleshooting

**MongoDB connection error**

- Check MONGODB_URL in .env
- Verify network access in MongoDB Atlas (0.0.0.0/0)
- Ensure credentials are correct

**JWT errors**

- Ensure JWT_SECRET is 32+ characters
- Check token format: `Authorization: Bearer <token>`

**Tests failing**

- Run `pip install -r requirements.txt` again
- Ensure you're in virtual environment
- Check Python version (3.11+)

## File Structure

```
ml-service/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app entry point
│   ├── api/
│   │   ├── deps.py              # Dependency injection (JWT auth)
│   │   └── routes/
│   │       ├── auth.py          # Login/signup
│   │       ├── reminders.py     # Reminder queue + feedback
│   │       ├── schedule.py      # Scheduling tick (dev)
│   │       ├── push.py          # Push subscriptions
│   │       └── dev.py           # Health check
│   ├── core/
│   │   ├── config.py            # Settings from .env
│   │   ├── security.py          # JWT + password hashing
│   │   └── jobs.py              # Scheduler setup
│   ├── db/
│   │   └── mongo.py             # MongoDB connection + indexes
│   ├── models/
│   │   ├── sm2.py               # Spaced repetition algorithm
│   │   ├── readiness_fusion.py  # Emotion to readiness
│   │   └── bandit.py            # LinUCB contextual bandit
│   ├── schemas/
│   │   └── schemas.py           # Pydantic models
│   ├── services/
│   │   ├── emotion_provider.py  # Mock/Replay/Http emotion reading
│   │   └── scheduler.py         # Main scheduling logic
│   └── artifacts/               # ML models & data
├── scripts/
│   └── seed.py                  # Demo data population
├── tests/
│   └── test_sm2.py              # SM-2 algorithm tests (5 cases)
├── requirements.txt             # Python dependencies
├── .env.example                 # Config template
└── README.md                    # This file
```
