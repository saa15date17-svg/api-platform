import time
import uuid
import secrets
import logging
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from sqlalchemy import Column, String, BigInteger, Float, Boolean, select

from open_webui.internal.db import Base, get_async_db_context

log = logging.getLogger(__name__)

class ApiKey(Base):
    __tablename__ = 'api_keys'
    id = Column(String, primary_key=True, unique=True)
    user_id = Column(String, nullable=False)
    api_key = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    spending_limit = Column(Float, nullable=True)  # USD limit
    created_at = Column(BigInteger)

class ApiKeyModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    api_key: str
    name: str
    is_active: bool
    spending_limit: Optional[float] = None
    created_at: int

class ApiKeysTable:
    @classmethod
    async def create_api_key(
        cls, 
        user_id: str, 
        name: str, 
        spending_limit: Optional[float] = None, 
        db=None
    ) -> Optional[ApiKeyModel]:
        async with get_async_db_context(db) as session:
            try:
                key_id = str(uuid.uuid4())
                # Generate a secure key prefixing with 'op-' for Optamus
                raw_key = f"op-{secrets.token_urlsafe(32)}"
                
                new_key = ApiKey(
                    id=key_id,
                    user_id=user_id,
                    api_key=raw_key,
                    name=name,
                    spending_limit=spending_limit,
                    is_active=True,
                    created_at=int(time.time()),
                )
                session.add(new_key)
                await session.commit()
                await session.refresh(new_key)
                return ApiKeyModel.model_validate(new_key)
            except Exception as e:
                log.error(f"Error creating API key: {e}")
                return None

    @classmethod
    async def get_key_by_string(cls, api_key: str, db=None) -> Optional[ApiKeyModel]:
        async with get_async_db_context(db) as session:
            try:
                stmt = select(ApiKey).where(ApiKey.api_key == api_key)
                result = await session.execute(stmt)
                key_obj = result.scalar_one_or_none()
                if key_obj:
                    return ApiKeyModel.model_validate(key_obj)
                return None
            except Exception as e:
                log.error(f"Error getting API key: {e}")
                return None

    @classmethod
    async def get_keys_by_user(cls, user_id: str, db=None) -> List[ApiKeyModel]:
        async with get_async_db_context(db) as session:
            try:
                stmt = select(ApiKey).where(ApiKey.user_id == user_id)
                result = await session.execute(stmt)
                keys = result.scalars().all()
                return [ApiKeyModel.model_validate(k) for k in keys]
            except Exception:
                return []

    @classmethod
    async def get_all_keys(cls, db=None) -> List[ApiKeyModel]:
        async with get_async_db_context(db) as session:
            try:
                stmt = select(ApiKey)
                result = await session.execute(stmt)
                keys = result.scalars().all()
                return [ApiKeyModel.model_validate(k) for k in keys]
            except Exception as e:
                log.error(f"Error getting all keys: {e}")
                return []

    @classmethod
    async def get_key_by_id(cls, key_id: str, db=None):
        """Get a single API key by its ID."""
        async with get_async_db_context(db) as session:
            try:
                stmt = select(ApiKey).where(ApiKey.id == key_id)
                result = await session.execute(stmt)
                key_obj = result.scalar_one_or_none()
                if key_obj:
                    return ApiKeyModel.model_validate(key_obj)
                return None
            except Exception as e:
                log.error(f"Error getting key by id {key_id}: {e}")
                return None

    @classmethod
    async def delete_key_by_id(cls, key_id: str, db=None) -> bool:
        async with get_async_db_context(db) as session:
            try:
                stmt = select(ApiKey).where(ApiKey.id == key_id)
                result = await session.execute(stmt)
                key_obj = result.scalar_one_or_none()
                if key_obj:
                    await session.delete(key_obj)
                    await session.commit()
                    return True
                return False
            except Exception as e:
                log.error(f"Error deleting key {key_id}: {e}")
                return False

ApiKeys = ApiKeysTable()
