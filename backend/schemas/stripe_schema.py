from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class StripeWebhookEventRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: Optional[str] = None
    idempotency_key: Optional[str] = None


class StripeWebhookEventData(BaseModel):
    model_config = ConfigDict(extra="allow")

    object: dict[str, Any]


class StripeWebhookEvent(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    type: str
    created: int
    livemode: bool
    data: StripeWebhookEventData

    api_version: Optional[str] = None
    pending_webhooks: Optional[int] = None
    request: Optional[StripeWebhookEventRequest] = None


class CreateCheckoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cita_id: Optional[str] = None
    servicio_id: Optional[str] = None
