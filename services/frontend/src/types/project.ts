export type ServiceType = "health_endpoint" | "ping";

export type Service = {
  id: string;
  name: string;
  url: string;
  type: ServiceType;
  description: string;
  github: string;
  port: number | null;
  internalPort: number | null;
  serviceKind: string;
  portRange: string;
  containerName: string;
};

export type HealthStatus = "healthy" | "unhealthy" | "unknown";

export type DatabaseHealth = {
  status: string;
  poolMin: number;
  poolMax: number;
  poolAvailable: number;
};

export type HealthEndpointResponse = {
  status: string;
  uptimeSeconds: number;
  database: DatabaseHealth;
  environment: string;
  version: string;
};

export type HealthData = {
  serviceId: string;
  status: HealthStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  error: string | null;
  health: HealthEndpointResponse | null;
};

export type ServiceWithHealth = Service & {
  healthData: HealthData | null;
  loading: boolean;
};
