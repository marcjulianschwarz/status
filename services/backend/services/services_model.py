from enum import Enum
from typing import ClassVar

from pydantic import BaseModel, ConfigDict
from pydantic.v1.utils import to_lower_camel


class ServiceType(str, Enum):
    health_endpoint = "health_endpoint"
    ping = "ping"


class Service(BaseModel):
    id: str
    name: str
    url: str
    type: ServiceType
    description: str = ""
    github: str = ""
    port: int | None = None
    internal_port: int | None = None
    service_kind: str = ""
    port_range: str = ""
    container_name: str = ""

    model_config: ClassVar[ConfigDict] = ConfigDict(
        alias_generator=to_lower_camel, populate_by_name=True, from_attributes=True
    )


class HealthStatus(str, Enum):
    healthy = "healthy"
    unhealthy = "unhealthy"
    unknown = "unknown"


class DatabaseHealth(BaseModel):
    status: str
    pool_min: int
    pool_max: int
    pool_available: int

    model_config: ClassVar[ConfigDict] = ConfigDict(
        alias_generator=to_lower_camel, populate_by_name=True, from_attributes=True
    )


class HealthEndpointResponse(BaseModel):
    status: str
    uptime_seconds: float
    database: DatabaseHealth
    environment: str
    version: str

    model_config: ClassVar[ConfigDict] = ConfigDict(
        alias_generator=to_lower_camel, populate_by_name=True, from_attributes=True
    )


class HealthData(BaseModel):
    service_id: str
    status: HealthStatus
    status_code: int | None = None
    response_time_ms: float | None = None
    error: str | None = None
    health: HealthEndpointResponse | None = None

    model_config: ClassVar[ConfigDict] = ConfigDict(
        alias_generator=to_lower_camel, populate_by_name=True, from_attributes=True
    )
