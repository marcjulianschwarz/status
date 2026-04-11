from services.services_model import Service, ServiceType

_SERVICES: list[Service] = [
    Service(
        id="backend",
        name="Backend API",
        url="http://localhost:8000",
        type=ServiceType.ping,
        description="This backend service",
    ),
    Service(
        id="sammlung",
        name="Sammlung",
        url="https://sammlung.app/api/health",
        type=ServiceType.health_endpoint,
        description="Sammlung app",
    ),
]


class ServicesRepo:
    def get_all(self) -> list[Service]:
        return _SERVICES

    def get_by_id(self, service_id: str) -> Service | None:
        return next((s for s in _SERVICES if s.id == service_id), None)
