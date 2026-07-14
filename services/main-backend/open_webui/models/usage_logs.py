import time
import uuid
import logging
from typing import Optional, List
from pydantic import BaseModel
from sqlalchemy import Column, String, BigInteger, Integer, Float, text

from open_webui.internal.db import Base, get_async_db_context

log = logging.getLogger(__name__)

class UsageLog(Base):
    __tablename__ = 'usage_logs'
    id = Column(String, primary_key=True, unique=True)
    user_id = Column(String, nullable=False)
    api_key_id = Column(String, nullable=True)
    model = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    created_at = Column(BigInteger)

class UsageLogModel(BaseModel):
    id: str
    user_id: str
    api_key_id: Optional[str] = None
    model: str
    provider: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost: float
    created_at: int

class UsageLogsTable:
    @classmethod
    async def insert_new_log(
        cls, 
        user_id: str, 
        model: Optional[str] = None, 
        provider: str = "openai", 
        prompt_tokens: int = 0, 
        completion_tokens: int = 0, 
        cost: Optional[float] = None,
        api_key_id: Optional[str] = None, 
        model_id: Optional[str] = None,
        total_tokens: Optional[int] = None,
        db=None
    ) -> Optional[UsageLogModel]:
        async with get_async_db_context(db) as session:
            try:
                log_id = str(uuid.uuid4())
                model_name = model or model_id or "default"
                if total_tokens is None:
                    total_tokens = prompt_tokens + completion_tokens
                if cost is None:
                    cost = cls.calculate_cost(model_name, prompt_tokens, completion_tokens)
                new_log = UsageLog(
                    id=log_id,
                    user_id=user_id,
                    api_key_id=api_key_id,
                    model=model_name,
                    provider=provider,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=total_tokens,
                    cost=cost,
                    created_at=int(time.time()),
                )
                session.add(new_log)
                await session.commit()
                await session.refresh(new_log)
                return UsageLogModel.model_validate(new_log)
            except Exception as e:
                log.error(f"Error inserting usage log: {e}")
                return None

    @classmethod
    def calculate_cost(cls, model: str, prompt_tokens: int, completion_tokens: int) -> float:
        model = model.lower()
        if "gpt-4o" in model:
            prompt_rate, completion_rate = 5.0 / 1000000.0, 15.0 / 1000000.0
        elif "gpt-4-turbo" in model or "gpt-4" in model:
            prompt_rate, completion_rate = 30.0 / 1000000.0, 60.0 / 1000000.0
        elif "gpt-3.5-turbo" in model:
            prompt_rate, completion_rate = 0.50 / 1000000.0, 1.50 / 1000000.0
        elif "claude-3-opus" in model:
            prompt_rate, completion_rate = 15.0 / 1000000.0, 75.0 / 1000000.0
        elif "claude-3-5-sonnet" in model or "claude-3-sonnet" in model:
            prompt_rate, completion_rate = 3.0 / 1000000.0, 15.0 / 1000000.0
        elif "claude-3-haiku" in model:
            prompt_rate, completion_rate = 0.25 / 1000000.0, 1.25 / 1000000.0
        else:
            prompt_rate, completion_rate = 2.0 / 1000000.0, 2.0 / 1000000.0

        return (prompt_tokens * prompt_rate) + (completion_tokens * completion_rate)

    @classmethod
    async def get_usage_stats_by_api_key(cls, api_key_id: str, db=None) -> dict:
        """Get usage stats for a specific API key."""
        async with get_async_db_context(db) as session:
            try:
                from sqlalchemy import func, select
                stmt = select(
                    func.count(UsageLog.id).label("total_requests"),
                    func.sum(UsageLog.total_tokens).label("total_tokens"),
                    func.sum(UsageLog.cost).label("total_cost")
                ).where(UsageLog.api_key_id == api_key_id)
                result = await session.execute(stmt)
                row = result.one()
                return {
                    "total_requests": row.total_requests or 0,
                    "total_tokens": row.total_tokens or 0,
                    "total_cost": row.total_cost or 0.0
                }
            except Exception as e:
                log.error(f"Error getting usage stats for key {api_key_id}: {e}")
                return {"total_requests": 0, "total_tokens": 0, "total_cost": 0.0}

    @classmethod
    async def get_usage_stats(cls, db=None) -> dict:
        async with get_async_db_context(db) as session:
            try:
                from sqlalchemy import func
                stmt = select(
                    func.count(UsageLog.id).label("total_requests"),
                    func.sum(UsageLog.total_tokens).label("total_tokens"),
                    func.sum(UsageLog.cost).label("total_cost")
                )
                result = await session.execute(stmt)
                row = result.one()
                return {
                    "total_requests": row.total_requests or 0,
                    "total_tokens": row.total_tokens or 0,
                    "total_cost": row.total_cost or 0.0
                }
            except Exception as e:
                log.error(f"Error getting usage stats: {e}")
                return {
                    "total_requests": 0,
                    "total_tokens": 0,
                    "total_cost": 0.0
                }

    @classmethod
    async def get_logs(cls, user_id: Optional[str] = None, limit: int = 100, db=None) -> List[UsageLogModel]:
        """Get recent usage log records. If user_id is provided, filter to that user."""
        async with get_async_db_context(db) as session:
            try:
                from sqlalchemy import select
                stmt = select(UsageLog).order_by(UsageLog.created_at.desc()).limit(limit)
                if user_id:
                    stmt = stmt.where(UsageLog.user_id == user_id)
                result = await session.execute(stmt)
                rows = result.scalars().all()
                return [UsageLogModel.model_validate(r) for r in rows]
            except Exception as e:
                log.error(f"Error fetching usage logs: {e}")
                return []

UsageLogs = UsageLogsTable()
