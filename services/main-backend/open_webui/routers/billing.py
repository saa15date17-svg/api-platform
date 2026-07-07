from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from open_webui.utils.auth import get_admin_user
from open_webui.models.users import UserModel

router = APIRouter()


class Plan(BaseModel):
    key: str
    name: str
    price: str
    rpm: int | str
    tpm: str
    tpd: str


class BillingPlansResponse(BaseModel):
    plans: list[Plan]


@router.get("/plans", response_model=BillingPlansResponse)
async def get_billing_plans(user: UserModel = Depends(get_admin_user)):
    return BillingPlansResponse(
        plans=[
            Plan(key="1", name="Free", price="$0", rpm=60, tpm="100K", tpd="1M"),
            Plan(key="2", name="Starter", price="$20/mo", rpm=500, tpm="500K", tpd="5M"),
            Plan(key="3", name="Pro", price="$100/mo", rpm=2000, tpm="2M", tpd="20M"),
            Plan(
                key="4",
                name="Enterprise",
                price="Custom",
                rpm="Unlimited",
                tpm="Unlimited",
                tpd="Unlimited",
            ),
        ]
    )
