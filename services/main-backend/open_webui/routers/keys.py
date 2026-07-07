from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from open_webui.models.api_keys import ApiKeys, ApiKeyModel
from open_webui.utils.auth import get_admin_user, get_verified_user
from open_webui.models.users import UserModel

router = APIRouter()

class CreateKeyForm(BaseModel):
    name: str
    user_id: str
    spending_limit: Optional[float] = None

class CreateKeyResponse(BaseModel):
    id: str
    user_id: str
    name: str
    key: str
    is_active: bool
    spending_limit: Optional[float]
    created_at: int

class ApiKeyResponse(BaseModel):
    id: str
    user_id: str
    name: str
    key_prefix: str
    is_active: bool
    spending_limit: Optional[float]
    created_at: int

class ApiKeyListResponse(BaseModel):
    keys: List[ApiKeyResponse]

@router.get("/", response_model=ApiKeyListResponse)
async def get_keys(user: UserModel = Depends(get_admin_user)):
    keys = await ApiKeys.get_all_keys()

    resp = []
    for k in keys:
        resp.append(ApiKeyResponse(
            id=k.id,
            user_id=k.user_id,
            name=k.name,
            key_prefix=k.api_key[:10],
            is_active=k.is_active,
            spending_limit=k.spending_limit,
            created_at=k.created_at
        ))
    return ApiKeyListResponse(keys=resp)

@router.post("/", response_model=CreateKeyResponse)
async def create_key(form: CreateKeyForm, user: UserModel = Depends(get_admin_user)):
    k = await ApiKeys.create_api_key(
        user_id=form.user_id,
        name=form.name,
        spending_limit=form.spending_limit
    )
    if not k:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate API Key"
        )
    return CreateKeyResponse(
        id=k.id,
        user_id=k.user_id,
        name=k.name,
        key=k.api_key,
        is_active=k.is_active,
        spending_limit=k.spending_limit,
        created_at=k.created_at
    )

@router.delete("/{key_id}")
async def delete_key(key_id: str, user: UserModel = Depends(get_admin_user)):
    success = await ApiKeys.delete_key_by_id(key_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API Key not found"
        )
    return {"status": "success"}
