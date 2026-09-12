from fastapi import APIRouter

from engine.plugins.plugin_manager import PluginManager

router = APIRouter(prefix="/api/v1/plugins", tags=["Plugins"])


@router.get("")
async def list_plugins():
    plugins = PluginManager.list_installed_plugins()
    return {"plugins": plugins}
