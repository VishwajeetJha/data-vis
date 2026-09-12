import json
import os
from typing import Any


class PluginManager:
    @staticmethod
    def get_plugins_dir() -> str:
        data_dir = os.environ.get("DATA_VIS_DATA_DIR", os.path.expanduser("~/.config/data-vis"))
        plugins_dir = os.path.join(data_dir, "plugins")
        os.makedirs(plugins_dir, exist_ok=True)
        return plugins_dir

    @classmethod
    def list_installed_plugins(cls) -> list[dict[str, Any]]:
        plugins_dir = cls.get_plugins_dir()
        plugins = []

        if not os.path.exists(plugins_dir):
            return plugins

        for folder in os.listdir(plugins_dir):
            folder_path = os.path.join(plugins_dir, folder)
            manifest_path = os.path.join(folder_path, "plugin.json")

            if os.path.isdir(folder_path) and os.path.exists(manifest_path):
                try:
                    with open(manifest_path, encoding="utf-8") as f:
                        manifest = json.load(f)
                        manifest["installed_path"] = folder_path
                        manifest["status"] = "active"
                        plugins.append(manifest)
                except Exception:
                    continue

        return plugins
