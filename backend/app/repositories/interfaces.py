"""Base repository pattern interface for database persistence operations."""

from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Generic interface for data-access repositories."""

    async def get(self, id: Any) -> Optional[ModelType]:
        raise NotImplementedError

    async def list(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        raise NotImplementedError

    async def create(self, obj_in: CreateSchemaType) -> ModelType:
        raise NotImplementedError

    async def update(self, db_obj: ModelType, obj_in: UpdateSchemaType) -> ModelType:
        raise NotImplementedError

    async def delete(self, id: Any) -> Optional[ModelType]:
        raise NotImplementedError
