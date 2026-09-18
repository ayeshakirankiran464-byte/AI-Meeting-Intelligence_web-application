
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.upload import upload_router
from routes.query import query_router
from routes.meeting import meeting_router


app = FastAPI(
    title="AI Meeting Intelligence API",
    description="Backend API for AI Meeting Intelligence",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
         "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register routers
app.include_router(upload_router)
app.include_router(query_router)
app.include_router(meeting_router)


@app.get("/")
def home():
    return {
        "success": True,
        "message": "AI Meeting Intelligence FastAPI is running"
    }


@app.get("/api/test")
def api_test():
    return {
        "success": True,
        "message": "React frontend connected to FastAPI backend!"
    }

