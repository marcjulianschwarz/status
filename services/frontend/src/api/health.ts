import type { HealthData, Service } from "@/types/project";
import { authHeaders, clearToken } from "@/api/auth";

function handleUnauth(r: Response) {
  if (r.status === 401) {
    clearToken();
    window.location.reload();
  }
}

export async function fetchServices(): Promise<Service[]> {
  const r = await fetch("/api/services", { headers: authHeaders() });
  if (!r.ok) {
    handleUnauth(r);
    return [];
  }
  return r.json();
}

export async function fetchServiceHealth(
  serviceId: string,
): Promise<HealthData | null> {
  const r = await fetch(`/api/services/${serviceId}/health`, {
    headers: authHeaders(),
  });
  if (!r.ok) {
    handleUnauth(r);
    return null;
  }
  return r.json();
}
