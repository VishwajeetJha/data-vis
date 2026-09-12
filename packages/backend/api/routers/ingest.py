import os
import shutil
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from db.repositories.dataset_repo import DatasetRepository
from engine.ingest.parser_factory import ParserFactory

router = APIRouter(prefix="/api/v1/ingest", tags=["Ingestion"])


class IngestFileRequest(BaseModel):
    workspace_id: str
    file_path: str
    sheet_name: str | None = None
    delimiter: str | None = None


class ColumnSchemaDTO(BaseModel):
    name: str
    data_type: str
    nullable: bool = True
    sample_values: list[Any] = []


class IngestDatasetResponse(BaseModel):
    dataset_id: str
    workspace_id: str
    file_name: str
    file_path: str
    file_format: str
    file_size_bytes: int
    row_count: int
    column_count: int
    fingerprint: str
    columns: list[ColumnSchemaDTO]


@router.post("/file", response_model=IngestDatasetResponse)
async def ingest_file(req: IngestFileRequest):
    if not os.path.exists(req.file_path):
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "DATASET_NOT_FOUND",
                    "message": f"Source file does not exist at path: {req.file_path}",
                }
            },
        )

    try:
        metadata, _ = ParserFactory.parse_file(
            req.file_path, sheet_name=req.sheet_name, delimiter=req.delimiter
        )

        dataset = await DatasetRepository.create(
            workspace_id=req.workspace_id,
            file_path=metadata["file_path"],
            file_name=metadata["file_name"],
            file_format=metadata["file_format"],
            file_size_bytes=metadata["file_size_bytes"],
            row_count=metadata["row_count"],
            column_count=metadata["column_count"],
            fingerprint=metadata["fingerprint"],
            schema=metadata["schema"],
        )

        return IngestDatasetResponse(
            dataset_id=dataset["id"],
            workspace_id=dataset["workspace_id"],
            file_name=dataset["file_name"],
            file_path=dataset["file_path"],
            file_format=dataset["file_format"],
            file_size_bytes=dataset["file_size_bytes"],
            row_count=dataset["row_count"],
            column_count=dataset["column_count"],
            fingerprint=dataset["fingerprint"],
            columns=[ColumnSchemaDTO(**c) for c in dataset["schema"]],
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "FILE_READ_FAILED",
                    "message": f"Failed to ingest file: {str(e)}",
                }
            },
        )


@router.post("/upload", response_model=IngestDatasetResponse)
async def upload_file(
    file: UploadFile = File(...),
    workspace_id: str = Form(...),
    sheet_name: str | None = Form(None),
    delimiter: str | None = Form(None),
):
    try:
        data_dir = os.environ.get("DATA_VIS_DATA_DIR", os.path.expanduser("~/.config/data-vis"))
        upload_dir = os.path.join(data_dir, "uploads", workspace_id)
        os.makedirs(upload_dir, exist_ok=True)

        target_file_path = os.path.join(upload_dir, file.filename)
        with open(target_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        metadata, _ = ParserFactory.parse_file(
            target_file_path, sheet_name=sheet_name, delimiter=delimiter
        )

        dataset = await DatasetRepository.create(
            workspace_id=workspace_id,
            file_path=metadata["file_path"],
            file_name=metadata["file_name"],
            file_format=metadata["file_format"],
            file_size_bytes=metadata["file_size_bytes"],
            row_count=metadata["row_count"],
            column_count=metadata["column_count"],
            fingerprint=metadata["fingerprint"],
            schema=metadata["schema"],
        )

        return IngestDatasetResponse(
            dataset_id=dataset["id"],
            workspace_id=dataset["workspace_id"],
            file_name=dataset["file_name"],
            file_path=dataset["file_path"],
            file_format=dataset["file_format"],
            file_size_bytes=dataset["file_size_bytes"],
            row_count=dataset["row_count"],
            column_count=dataset["column_count"],
            fingerprint=dataset["fingerprint"],
            columns=[ColumnSchemaDTO(**c) for c in dataset["schema"]],
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "FILE_UPLOAD_FAILED",
                    "message": f"Failed to upload and ingest file: {str(e)}",
                }
            },
        )


@router.delete("/{dataset_id}")
async def delete_dataset(dataset_id: str):
    success = await DatasetRepository.delete(dataset_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "DATASET_NOT_FOUND", "message": "Dataset not found"}},
        )
    return {"status": "success", "dataset_id": dataset_id}

