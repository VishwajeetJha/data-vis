import os

import polars as pl
from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": "1.0.0-rc",
        "polars_version": pl.__version__,
        "pid": os.getpid(),
    }
