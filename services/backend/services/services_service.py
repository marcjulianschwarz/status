import time

import httpx

from config.config import settings
from logging_config import create_logger
from services.services_model import (
    HealthData,
    HealthEndpointResponse,
    HealthStatus,
    Service,
    ServiceType,
)
from services.services_repo import ServicesRepo

logger = create_logger(__name__)

_HTTP_TIMEOUT = 5.0


def _check_ping(service: Service) -> HealthData:
    try:
        start = time.monotonic()
        response = httpx.get(service.url, timeout=_HTTP_TIMEOUT, follow_redirects=True)
        elapsed_ms = (time.monotonic() - start) * 1000

        status = HealthStatus.healthy if response.is_success else HealthStatus.unhealthy
        return HealthData(
            service_id=service.id,
            status=status,
            status_code=response.status_code,
            response_time_ms=round(elapsed_ms, 2),
        )
    except Exception as e:
        logger.warning(f"Ping failed for {service.id}: {e}")
        return HealthData(
            service_id=service.id,
            status=HealthStatus.unhealthy,
            error=str(e),
        )


def _check_health_endpoint(service: Service) -> HealthData:
    headers = {"X-API-Key": settings.HEALTH_API_KEY} if settings.HEALTH_API_KEY else {}

    try:
        start = time.monotonic()
        response = httpx.get(
            service.url,
            headers=headers,
            timeout=_HTTP_TIMEOUT,
            follow_redirects=True,
        )
        elapsed_ms = (time.monotonic() - start) * 1000

        status = HealthStatus.healthy if response.is_success else HealthStatus.unhealthy

        health = None
        if response.is_success:
            try:
                health = HealthEndpointResponse.model_validate(response.json())
            except Exception:
                pass

        return HealthData(
            service_id=service.id,
            status=status,
            status_code=response.status_code,
            response_time_ms=round(elapsed_ms, 2),
            health=health,
        )
    except Exception as e:
        logger.warning(f"Health check failed for {service.id}: {e}")
        return HealthData(
            service_id=service.id,
            status=HealthStatus.unhealthy,
            error=str(e),
        )


class ServicesService:
    def __init__(self, repo: ServicesRepo):
        self.repo: ServicesRepo = repo

    def get_all_services(self) -> list[Service]:
        return self.repo.get_all()

    def get_health(self, service_id: str) -> HealthData | None:
        service = self.repo.get_by_id(service_id)
        if service is None:
            return None

        if service.type == ServiceType.health_endpoint:
            return _check_health_endpoint(service)

        return _check_ping(service)


def get_services_service() -> ServicesService:
    repo = ServicesRepo()
    return ServicesService(repo=repo)
