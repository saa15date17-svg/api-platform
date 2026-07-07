from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from open_webui.models.usage_logs import UsageLogs, UsageLogModel
from open_webui.utils.auth import get_admin_user, get_verified_user
from open_webui.models.users import UserModel

router = APIRouter()

class UsageStatsResponse(BaseModel):
    total_requests: int
    total_tokens: int
    total_cost: float

@router.get("/stats", response_model=UsageStatsResponse)
async def get_usage_stats(user: UserModel = Depends(get_admin_user)):
    stats = await UsageLogs.get_usage_stats()
    return UsageStatsResponse(
        total_requests=stats["total_requests"],
        total_tokens=stats["total_tokens"],
        total_cost=stats["total_cost"]
    )

@router.get("/logs", response_model=List[UsageLogModel])
async def get_usage_logs(
    limit: int = 100,
    user: UserModel = Depends(get_verified_user)
):
    """Return the most recent AI usage logs. Admins see all; regular users see their own."""
    logs = await UsageLogs.get_logs(user_id=None if user.role == "admin" else user.id, limit=limit)
    return logs
