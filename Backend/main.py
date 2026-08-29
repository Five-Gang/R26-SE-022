from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from routes import emotion, health

app = FastAPI(
    title="Affect and Attention-Aware Emotion Detection API",
    description="Backend for the real-time privacy-preserving emotion detection module.",
    version="1.0.0"
)

# Configure CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"], # Allows all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(emotion.router, prefix="/api", tags=["Emotion Detection"])

if __name__ == "__main__":
    print("=" * 50)
    print("Starting Affect and Attention-Aware Emotion Detection API")
    print("=" * 50)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
