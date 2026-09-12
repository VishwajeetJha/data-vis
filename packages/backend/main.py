import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import advisor, ai, datasets, health, ingest, plugins, query, system, workspaces
from db.connection import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Execute SQLite migrations on boot
    await init_db()
    yield


app = FastAPI(
    title="data-vis analytical engine",
    version="1.0.0-rc",
    description="Local-first analytical engine and persistence service",
    lifespan=lifespan,
)

# CORS restricted strictly to localhost and Tauri origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "tauri://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(system.router)
app.include_router(ingest.router)
app.include_router(query.router)
app.include_router(workspaces.router)
app.include_router(advisor.router)
app.include_router(ai.router)
app.include_router(datasets.router)
app.include_router(plugins.router)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    host = os.environ.get("HOST", "127.0.0.1")
    uvicorn.run("main:app", host=host, port=port, reload=True)
