import type { HealthData, Service } from "@/types/project";

export async function fetchServices(): Promise<Service[]> {
  const r = await fetch("/api/services");
  if (!r.ok) return [];
  return r.json();
}

export async function fetchServiceHealth(serviceId: string): Promise<HealthData | null> {
  const r = await fetch(`/api/services/${serviceId}/health`);
  if (!r.ok) return null;
  return r.json();
}
