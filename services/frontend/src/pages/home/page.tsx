import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

function ServiceModal({
  service,
  onClose,
}: {
  service: ServiceWithHealth;
  onClose: () => void;
}) {
  const [entered, setEntered] = useState(false);
  const { healthData, loading } = service;
  const status: DisplayStatus = loading
    ? "loading"
    : (healthData?.status ?? "unknown");
  const h = healthData?.health;

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const orig = window.getComputedStyle(document.body).overflow;
    const sw = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${sw}px`;
    return () => {
      document.body.style.overflow = orig;
      document.body.style.paddingRight = "";
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
      style={{ opacity: entered ? 1 : 0, transition: "opacity 0.12s ease" }}
    >
      <div
        className="bg-white w-full max-w-lg max-h-[90vh] rounded-xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: entered ? "scale(1)" : "scale(0.92)",
          transition: "transform 0.15s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-sm font-semibold text-zinc-800">
              {service.name}
            </h2>
            <StatusDot status={status} />
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 transition-colors text-lg leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {service.description && (
            <p className="font-mono text-xs text-zinc-500">
              {service.description}
            </p>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            {service.serviceKind && (
              <div className="bg-zinc-50 rounded-lg px-3 py-2">
                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-0.5">
                  Type
                </div>
                <div className="font-mono text-xs text-zinc-800">
                  {service.serviceKind}
                </div>
              </div>
            )}
            {service.portRange && (
              <div className="bg-zinc-50 rounded-lg px-3 py-2">
                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-0.5">
                  Port Range
                </div>
                <div className="font-mono text-xs text-zinc-800">
                  {service.portRange}
                </div>
              </div>
            )}
            {service.containerName && (
              <div className="bg-zinc-50 rounded-lg px-3 py-2">
                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-0.5">
                  Container
                </div>
                <div className="font-mono text-xs text-zinc-800">
                  {service.containerName}
                </div>
              </div>
            )}
            {service.port != null && (
              <div className="bg-zinc-50 rounded-lg px-3 py-2">
                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-0.5">
                  Port
                </div>
                <div className="font-mono text-xs text-zinc-800">
                  {service.port}
                </div>
              </div>
            )}
            {service.internalPort != null && (
              <div className="bg-zinc-50 rounded-lg px-3 py-2">
                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-0.5">
                  Internal Port
                </div>
                <div className="font-mono text-xs text-zinc-800">
                  {service.internalPort}
                </div>
              </div>
            )}
            {healthData?.responseTimeMs != null && (
              <div className="bg-zinc-50 rounded-lg px-3 py-2">
                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-0.5">
                  Latency
                </div>
                <div className="font-mono text-xs text-zinc-800">
                  {healthData.responseTimeMs}ms
                </div>
              </div>
            )}
            {healthData?.statusCode != null && (
              <div className="bg-zinc-50 rounded-lg px-3 py-2">
                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-0.5">
                  HTTP Code
                </div>
                <div className="font-mono text-xs text-zinc-800">
                  {healthData.statusCode}
                </div>
              </div>
            )}
          </div>

          {/* Health endpoint details */}
          {h && (
            <div className="bg-zinc-50 rounded-lg px-3 py-2 space-y-1">
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">
                Health
              </div>
              <div className="flex gap-4 flex-wrap">
                <span className="font-mono text-xs text-zinc-600">
                  <span className="text-zinc-400">up</span>{" "}
                  {formatUptime(h.uptimeSeconds)}
                </span>
                <span className="font-mono text-xs text-zinc-600">
                  <span className="text-zinc-400">v</span>
                  {h.version}
                </span>
                <span className="font-mono text-xs text-zinc-600">
                  <span className="text-zinc-400">env</span> {h.environment}
                </span>
                <span className="font-mono text-xs text-zinc-600">
                  <span className="text-zinc-400">db</span>{" "}
                  {h.database.poolAvailable}/{h.database.poolMax} avail ·{" "}
                  {h.database.status}
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {healthData?.error && (
            <div className="bg-red-50 rounded-lg px-3 py-2">
              <span className="font-mono text-xs text-red-500">
                {healthData.error}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-zinc-100">
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center font-mono text-xs bg-zinc-800 text-white rounded-lg px-3 py-2 hover:bg-zinc-700 transition-colors"
          >
            ↗ Open
          </a>
          {service.github && (
            <a
              href={service.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center font-mono text-xs bg-zinc-100 text-zinc-700 rounded-lg px-3 py-2 hover:bg-zinc-200 transition-colors"
            >
              ⌥ GitHub
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ServiceRow({
  service,
  onClick,
}: {
  service: ServiceWithHealth;
  onClick: () => void;
}) {
  const { healthData, loading } = service;
  const status: DisplayStatus = loading
    ? "loading"
    : (healthData?.status ?? "unknown");
  const h = healthData?.health;

  return (
    <div className="border-b border-zinc-100 last:border-0">
      {/* Main row */}
      <div
        className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 px-3 py-2 hover:bg-zinc-50 transition-colors cursor-pointer"
        onClick={onClick}
      >
        <div className="min-w-0">
          <span className="font-mono text-xs font-medium text-zinc-800">
            {service.name}
          </span>
          {service.description && (
            <span className="text-xs text-zinc-400 ml-2">
              {service.description}
            </span>
          )}
          <div className="flex gap-3 mt-0.5 sm:hidden">
            <span className="font-mono text-xs text-zinc-400 tabular-nums">
              {healthData?.responseTimeMs != null
                ? `${healthData.responseTimeMs}ms`
                : "—"}
            </span>
            <span className="font-mono text-xs text-zinc-400 tabular-nums">
              {healthData?.statusCode != null
                ? `HTTP ${healthData.statusCode}`
                : "—"}
            </span>
            <span className="font-mono text-xs text-zinc-300">
              {service.type === "health_endpoint" ? "health" : "ping"}
            </span>
          </div>
        </div>
        <StatusDot status={status} />
        <span className="hidden sm:block font-mono text-xs text-zinc-400 tabular-nums w-16 text-right">
          {healthData?.responseTimeMs != null
            ? `${healthData.responseTimeMs}ms`
            : "—"}
        </span>
        <span className="hidden sm:block font-mono text-xs text-zinc-400 tabular-nums w-14 text-right">
          {healthData?.statusCode != null
            ? `HTTP ${healthData.statusCode}`
            : "—"}
        </span>
        <span className="hidden sm:block font-mono text-xs text-zinc-300 w-20 text-right">
          {service.type === "health_endpoint" ? "health" : "ping"}
        </span>
        <a
          href={service.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-zinc-300 hover:text-zinc-600 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          ↗
        </a>
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

type Tab = "services" | "ports";

function PortRangesTab({ services }: { services: ServiceWithHealth[] }) {
  const servicesWithPorts = services.filter((s) => s.portRange);

  const grouped = servicesWithPorts.reduce<Record<string, ServiceWithHealth[]>>(
    (acc, s) => {
      const key = s.portRange;
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    },
    {},
  );

  const sortedRanges = Object.keys(grouped).sort(
    (a, b) => Number(a) - Number(b),
  );

  if (sortedRanges.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-zinc-400">
        No port ranges configured.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedRanges.map((range) => {
        const group = grouped[range];
        const ports = group
          .map((s) => s.port)
          .filter((p): p is number => p != null)
          .sort((a, b) => a - b);
        const minPort = ports[0];
        const maxPort = ports[ports.length - 1];
        const portLabel =
          ports.length === 0
            ? "—"
            : ports.length === 1
              ? String(ports[0])
              : `${minPort}–${maxPort}`;

        return (
          <div
            key={range}
            className="border border-zinc-200 rounded-md overflow-hidden"
          >
            {/* Range header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 border-b border-zinc-200">
              <span className="font-mono text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                Range {range}xx
              </span>
              <span className="font-mono text-xs text-zinc-400">
                {portLabel}
              </span>
            </div>

            {/* Services in range */}
            {group.map((s) => (
              <div
                key={s.id + s.port}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-3 py-2 border-b border-zinc-100 last:border-0"
              >
                <div className="min-w-0">
                  <span className="font-mono text-xs font-medium text-zinc-800">
                    {s.name}
                  </span>
                  {s.containerName && (
                    <span className="font-mono text-xs text-zinc-400 ml-2">
                      {s.containerName}
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs text-zinc-500 tabular-nums">
                  {s.port != null ? `:${s.port}` : "—"}
                </span>
                {s.internalPort != null && (
                  <span className="font-mono text-xs text-zinc-300 tabular-nums">
                    → :{s.internalPort}
                  </span>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

const DEMO_SERVICES: ServiceWithHealth[] = [
  {
    id: "demo-api",
    name: "Demo API",
    url: "https://example.com/api",
    type: "health_endpoint",
    description: "A sample REST API",
    github: "",
    serviceKind: "FastAPI",
    portRange: "90",
    port: 8090,
    internalPort: 8000,
    containerName: "demo-api-1",
    healthData: {
      serviceId: "demo-api",
      status: "healthy",
      statusCode: 200,
      responseTimeMs: 42,
      error: null,
      health: {
        status: "ok",
        uptimeSeconds: 86400,
        environment: "dev",
        version: "1.0.0",
        database: { status: "ok", poolMin: 2, poolMax: 10, poolAvailable: 8 },
      },
    },
    loading: false,
  },
  {
    id: "demo-frontend",
    name: "Demo Frontend",
    url: "https://example.com",
    type: "ping",
    description: "A sample frontend",
    github: "",
    serviceKind: "Vite",
    portRange: "90",
    port: 8091,
    internalPort: 3000,
    containerName: "demo-frontend-1",
    healthData: {
      serviceId: "demo-frontend",
      status: "healthy",
      statusCode: 200,
      responseTimeMs: 18,
      error: null,
      health: null,
    },
    loading: false,
  },
  {
    id: "demo-broken",
    name: "Demo Broken",
    url: "https://example.com/broken",
    type: "ping",
    description: "A sample failing service",
    github: "",
    serviceKind: "Node",
    portRange: "91",
    port: 8910,
    internalPort: 3000,
    containerName: "demo-broken-1",
    healthData: {
      serviceId: "demo-broken",
      status: "unhealthy",
      statusCode: 503,
      responseTimeMs: null,
      error: "Connection refused",
      health: null,
    },
    loading: false,
  },
];

export default function HomePage() {
  const [services, setServices] = useState<ServiceWithHealth[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selected, setSelected] = useState<ServiceWithHealth | null>(null);
  const [tab, setTab] = useState<Tab>("services");
  const [demoActive, setDemoActive] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await fetchServices();
      setServices(list.map((s) => ({ ...s, healthData: null, loading: true })));

      const results = await Promise.all(
        list.map((s) => fetchServiceHealth(s.id)),
      );

      setServices(
        list.map((s, i) => ({ ...s, healthData: results[i], loading: false })),
      );
      setLastUpdated(new Date());
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const [search, setSearch] = useState("");

  const displayed = demoActive ? [...services, ...DEMO_SERVICES] : services;

  const allHealthy =
    displayed.length > 0 &&
    displayed.every((s) => s.healthData?.status === "healthy");
  const anyUnhealthy = displayed.some(
    (s) => !s.loading && s.healthData?.status === "unhealthy",
  );
  const anyLoading = displayed.some((s) => s.loading);
  const overallStatus: DisplayStatus = anyUnhealthy
    ? "unhealthy"
    : anyLoading
      ? "loading"
      : allHealthy
        ? "healthy"
        : "unknown";
  const healthy = displayed.filter(
    (s) => s.healthData?.status === "healthy",
  ).length;
  const total = displayed.length;
  const filtered = search
    ? displayed.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()),
      )
    : displayed;

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
            {import.meta.env.DEV && (
              <button
                onClick={() => setDemoActive((v) => !v)}
                className={`text-xs transition-colors cursor-pointer ${demoActive ? "text-amber-600 hover:text-amber-800" : "text-zinc-400 hover:text-zinc-600"}`}
              >
                {demoActive ? "✦ demo" : "✦ demo"}
              </button>
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

        {/* Tabs */}
        <div className="flex gap-3 mb-3 border-b border-zinc-200">
          {(["services", "ports"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-1.5 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                tab === t
                  ? "border-b-2 border-zinc-800 text-zinc-800"
                  : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {t === "services" ? "Services" : "Port Ranges"}
            </button>
          ))}
        </div>

        {tab === "services" && (
          <>
            {/* Search */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
              className="w-full mb-3 px-3 py-1.5 text-xs font-mono bg-white border border-zinc-200 rounded-md text-zinc-800 placeholder-zinc-300 outline-none focus:border-zinc-400 transition-colors"
            />

            {/* Table */}
            <div className="border border-zinc-200 rounded-md overflow-hidden">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 px-3 py-1.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-xs text-zinc-400 uppercase tracking-wider">
                  Service
                </span>
                <span className="text-xs text-zinc-400 uppercase tracking-wider">
                  Status
                </span>
                <span className="hidden sm:block text-xs text-zinc-400 uppercase tracking-wider w-16 text-right">
                  Latency
                </span>
                <span className="hidden sm:block text-xs text-zinc-400 uppercase tracking-wider w-14 text-right">
                  Code
                </span>
                <span className="hidden sm:block text-xs text-zinc-400 uppercase tracking-wider w-20 text-right">
                  Type
                </span>
                <span className="text-xs text-zinc-400 w-4" />
              </div>

              {initialLoading ? (
                <div className="px-3 py-4 text-xs text-zinc-400">
                  Loading services...
                </div>
              ) : displayed.length === 0 ? (
                <div className="px-3 py-4 text-xs text-zinc-400">
                  No services configured.
                </div>
              ) : (
                filtered.map((s) => (
                  <ServiceRow
                    key={s.id}
                    service={s}
                    onClick={() => setSelected(s)}
                  />
                ))
              )}
            </div>
          </>
        )}

        {tab === "ports" && <PortRangesTab services={displayed} />}
      </div>

      {selected && (
        <ServiceModal service={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
