from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from services.services_model import HealthData, Service
from services.services_service import ServicesService, get_services_service

router = APIRouter(prefix="/services", tags=["Services"])


@router.get("")
def get_all_services(
    services_service: Annotated[ServicesService, Depends(get_services_service)],
) -> list[Service]:
    return services_service.get_all_services()


@router.get("/{service_id}/health")
def get_service_health(
    service_id: str,
    services_service: Annotated[ServicesService, Depends(get_services_service)],
) -> HealthData:
    health = services_service.get_health(service_id)
    if health is None:
        raise HTTPException(status_code=404, detail=f"Service '{service_id}' not found")
    return health
