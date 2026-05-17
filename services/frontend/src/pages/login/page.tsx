import { useState } from "react";
import { login } from "@/api/auth";

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const ok = await login(username, password);
    setLoading(false);
    if (ok) {
      onLogin();
    } else {
      setError(true);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 font-mono">
      <div className="w-full max-w-xs">
        <h1 className="text-sm font-bold text-zinc-800 tracking-tight uppercase mb-6">
          Status
        </h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            required
            className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md text-zinc-800 placeholder-zinc-300 outline-none focus:border-zinc-400 transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
            className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md text-zinc-800 placeholder-zinc-300 outline-none focus:border-zinc-400 transition-colors"
          />
          {error && <p className="text-xs text-red-500">Invalid credentials</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-3 py-2 text-xs bg-zinc-800 text-white rounded-md hover:bg-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
