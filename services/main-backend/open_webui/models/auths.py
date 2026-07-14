import logging
from typing import Optional
from pydantic import BaseModel, ConfigDict
from sqlalchemy import Column, String, Boolean, select
from open_webui.internal.db import Base, get_async_db_context

log = logging.getLogger(__name__)

class Auth(Base):
    __tablename__ = 'auth'
    id = Column(String, primary_key=True, unique=True)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    active = Column(Boolean, default=True)

class AuthModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    password: str
    active: bool

class AuthsTable:
    @classmethod
    async def insert_new_auth(
        cls,
        id: str,
        email: str,
        password: str,
        active: bool = True,
        db=None
    ) -> Optional[AuthModel]:
        async with get_async_db_context(db) as session:
            try:
                new_auth = Auth(
                    id=id,
                    email=email.lower(),
                    password=password,
                    active=active
                )
                session.add(new_auth)
                await session.commit()
                await session.refresh(new_auth)
                return AuthModel.model_validate(new_auth)
            except Exception as e:
                log.error(f"Error creating auth record: {e}")
                return None

    @classmethod
    async def get_auth_by_email(cls, email: str, db=None) -> Optional[AuthModel]:
        async with get_async_db_context(db) as session:
            try:
                stmt = select(Auth).where(Auth.email == email.lower())
                result = await session.execute(stmt)
                auth_obj = result.scalar_one_or_none()
                if auth_obj:
                    return AuthModel.model_validate(auth_obj)
                return None
            except Exception as e:
                log.error(f"Error getting auth by email: {e}")
                return None

    @classmethod
    async def update_auth_password_by_id(cls, id: str, password: str, db=None) -> bool:
        async with get_async_db_context(db) as session:
            try:
                stmt = select(Auth).where(Auth.id == id)
                result = await session.execute(stmt)
                auth_obj = result.scalar_one_or_none()
                if auth_obj:
                    auth_obj.password = password
                    await session.commit()
                    return True
                return False
            except Exception as e:
                log.error(f"Error updating auth password: {e}")
                return False

    @classmethod
    async def get_auth_by_id(cls, id: str, db=None) -> Optional[AuthModel]:
        async with get_async_db_context(db) as session:
            try:
                stmt = select(Auth).where(Auth.id == id)
                result = await session.execute(stmt)
                auth_obj = result.scalar_one_or_none()
                if auth_obj:
                    return AuthModel.model_validate(auth_obj)
                return None
            except Exception as e:
                log.error(f"Error getting auth by id: {e}")
                return None

Auths = AuthsTable()
