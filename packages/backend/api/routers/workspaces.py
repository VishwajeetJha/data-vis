from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db.repositories.workspace_repo import WorkspaceRepository

router = APIRouter(prefix="/api/v1/workspaces", tags=["Workspaces"])


class CreateWorkspaceRequest(BaseModel):
    name: str
    description: str | None = None


class UpdateWorkspaceLayoutRequest(BaseModel):
    layout: dict[str, Any]


@router.post("", status_code=201)
async def create_workspace(req: CreateWorkspaceRequest):
    return await WorkspaceRepository.create(req.name, req.description)


@router.get("")
async def list_workspaces():
    return await WorkspaceRepository.list_all()


@router.get("/{ws_id}")
async def get_workspace(ws_id: str):
    ws = await WorkspaceRepository.get_by_id(ws_id)
    if not ws:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "WORKSPACE_NOT_FOUND", "message": "Workspace not found"}},
        )
    return ws


@router.put("/{ws_id}/layout")
async def update_layout(ws_id: str, req: UpdateWorkspaceLayoutRequest):
    success = await WorkspaceRepository.update_layout(ws_id, req.layout)
    if not success:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "WORKSPACE_NOT_FOUND", "message": "Workspace not found"}},
        )
    return {"status": "ok"}


@router.delete("/{ws_id}")
async def delete_workspace(ws_id: str):
    success = await WorkspaceRepository.delete(ws_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "WORKSPACE_NOT_FOUND", "message": "Workspace not found"}},
        )
    return {"status": "ok"}
