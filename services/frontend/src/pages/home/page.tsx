import { useCallback, useEffect, useState } from "react";
import { fetchServiceHealth, fetchServices } from "@/api/health";
import type { ServiceWithHealth } from "@/types/project";

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

type DisplayStatus = "healthy" | "unhealthy" | "unknown" | "loading";

function StatusDot({ status }: { status: DisplayStatus }) {
  const color = {
    healthy: "bg-emerald-500",
    unhealthy: "bg-red-500",
    unknown: "bg-zinc-300",
    loading: "bg-yellow-400",
  }[status];
  const label = {
    healthy: "Operational",
    unhealthy: "Down",
    unknown: "Unknown",
    loading: "Checking",
  }[status];
  const text = {
    healthy: "text-emerald-700",
    unhealthy: "text-red-700",
    unknown: "text-zinc-400",
    loading: "text-yellow-700",
  }[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-xs ${text}`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function ServiceRow({ service }: { service: ServiceWithHealth }) {
  const { healthData, loading } = service;
  const status: DisplayStatus = loading
    ? "loading"
    : (healthData?.status ?? "unknown");
  const h = healthData?.health;

  return (
    <div className="border-b border-zinc-100 last:border-0">
      {/* Main row */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-3 py-2 hover:bg-zinc-50 transition-colors">
        <div className="min-w-0">
          <span className="font-mono text-xs font-medium text-zinc-800">
            {service.name}
          </span>
          {service.description && (
            <span className="text-xs text-zinc-400 ml-2">
              {service.description}
            </span>
          )}
        </div>
        <StatusDot status={status} />
        <span className="font-mono text-xs text-zinc-400 tabular-nums w-16 text-right">
          {healthData?.responseTimeMs != null
            ? `${healthData.responseTimeMs}ms`
            : "—"}
        </span>
        <span className="font-mono text-xs text-zinc-400 tabular-nums w-14 text-right">
          {healthData?.statusCode != null
            ? `HTTP ${healthData.statusCode}`
            : "—"}
        </span>
        <span className="font-mono text-xs text-zinc-300 w-20 text-right">
          {service.type === "health_endpoint" ? "health" : "ping"}
        </span>
      </div>

      {/* Extra health data row */}
      {h && (
        <div className="px-3 pb-2 flex gap-4 flex-wrap">
          <span className="font-mono text-xs text-zinc-400">
            <span className="text-zinc-300">up</span>{" "}
            {formatUptime(h.uptimeSeconds)}
          </span>
          <span className="font-mono text-xs text-zinc-400">
            <span className="text-zinc-300">v</span>
            {h.version}
          </span>
          <span className="font-mono text-xs text-zinc-400">
            <span className="text-zinc-300">env</span> {h.environment}
          </span>
          <span className="font-mono text-xs text-zinc-400">
            <span className="text-zinc-300">db</span> {h.database.poolAvailable}
            /{h.database.poolMax} avail · {h.database.status}
          </span>
        </div>
      )}

      {/* Error row */}
      {healthData?.error && (
        <div className="px-3 pb-2">
          <span className="font-mono text-xs text-red-500">
            {healthData.error}
          </span>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [services, setServices] = useState<ServiceWithHealth[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await fetchServices();
    setServices(list.map((s) => ({ ...s, healthData: null, loading: true })));

    const results = await Promise.all(
      list.map((s) => fetchServiceHealth(s.id)),
    );

    setServices(
      list.map((s, i) => ({ ...s, healthData: results[i], loading: false })),
    );
    setLastUpdated(new Date());
    setInitialLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const allHealthy =
    services.length > 0 &&
    services.every((s) => s.healthData?.status === "healthy");
  const anyUnhealthy = services.some(
    (s) => !s.loading && s.healthData?.status === "unhealthy",
  );
  const anyLoading = services.some((s) => s.loading);
  const overallStatus: DisplayStatus = anyUnhealthy
    ? "unhealthy"
    : anyLoading
      ? "loading"
      : allHealthy
        ? "healthy"
        : "unknown";

  const healthy = services.filter(
    (s) => s.healthData?.status === "healthy",
  ).length;
  const total = services.length;

  return (
    <div className="min-h-screen bg-white text-zinc-800 p-6 md:p-10 font-mono">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-zinc-800 tracking-tight uppercase">
              Status
            </h1>
            <StatusDot status={overallStatus} />
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-xs text-zinc-300 hidden sm:block">
                updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={refresh}
              className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
            >
              ↻ refresh
            </button>
          </div>
        </div>

        {/* Summary line */}
        {!initialLoading && (
          <p className="text-xs text-zinc-400 mb-4">
            {healthy}/{total} services operational · auto-refresh 30s
          </p>
        )}

        {/* Table */}
        <div className="border border-zinc-200 rounded-md overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-3 py-1.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-xs text-zinc-400 uppercase tracking-wider">
              Service
            </span>
            <span className="text-xs text-zinc-400 uppercase tracking-wider">
              Status
            </span>
            <span className="text-xs text-zinc-400 uppercase tracking-wider w-16 text-right">
              Latency
            </span>
            <span className="text-xs text-zinc-400 uppercase tracking-wider w-14 text-right">
              Code
            </span>
            <span className="text-xs text-zinc-400 uppercase tracking-wider w-20 text-right">
              Type
            </span>
          </div>

          {initialLoading ? (
            <div className="px-3 py-4 text-xs text-zinc-400">
              Loading services...
            </div>
          ) : services.length === 0 ? (
            <div className="px-3 py-4 text-xs text-zinc-400">
              No services configured.
            </div>
          ) : (
            services.map((s) => <ServiceRow key={s.id} service={s} />)
          )}
        </div>
      </div>
    </div>
  );
}
