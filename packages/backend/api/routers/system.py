import os
import sys

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/system", tags=["System"])


class SystemConfigResponse(BaseModel):
    version: str = "1.0.0-rc"
    python_version: str = sys.version
    platform: str = sys.platform
    app_data_dir: str
    theme: str = "dark"


@router.get("/config", response_model=SystemConfigResponse)
async def get_system_config():
    data_dir = os.environ.get("DATA_VIS_DATA_DIR", os.path.expanduser("~/.config/data-vis"))
    return SystemConfigResponse(app_data_dir=data_dir, theme="dark")
