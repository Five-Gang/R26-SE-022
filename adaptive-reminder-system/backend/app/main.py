from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.config import settings
from app.core.jobs import start_scheduler, stop_scheduler
from app.db.mongo import connect_db, disconnect_db
from app.api.routes import auth, reminders, schedule, push, dev, readiness, sm2, scheduler, content

# Create app
app = FastAPI(
    title="Adaptive Reminder System",
    version="0.1.0",
    docs_url="/docs" if settings.ENV == "dev" else None,
)

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# Include routes
app.include_router(auth.router)
app.include_router(reminders.router)
app.include_router(sm2.router)
app.include_router(scheduler.router)
app.include_router(content.router)
app.include_router(schedule.router)
app.include_router(push.router)
app.include_router(dev.router)
app.include_router(readiness.router)

# Lifecycle
@app.on_event("startup")
async def startup():
    await connect_db()
    start_scheduler()

@app.on_event("shutdown")
async def shutdown():
    stop_scheduler()
    await disconnect_db()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
