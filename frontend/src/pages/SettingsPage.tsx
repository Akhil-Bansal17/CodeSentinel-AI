import React from "react";
import { Server, Database, RefreshCw } from "lucide-react";
import { HealthState } from "../hooks/useHealth";
import { StatusBadge } from "../components/common/StatusBadge";

interface SettingsPageProps {
  healthState: HealthState;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ healthState }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#21262d]">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            Platform Settings
            <StatusBadge label="Configuration" variant="info" />
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Environment parameters and service connectivity diagnostics
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* API Backend Card */}
        <div className="p-5 rounded-lg border border-[#21262d] bg-[#161b22] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">Backend API Connection</h3>
            </div>
            <button
              type="button"
              onClick={() => healthState.refetch()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-slate-200 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${healthState.isLoading ? "animate-spin" : ""}`} />
              <span>Test Connection</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 rounded bg-[#0d1117] border border-[#21262d]">
              <span className="text-slate-400 block mb-1 font-sans">API Endpoint</span>
              <span className="text-slate-200">/api/health</span>
            </div>
            <div className="p-3 rounded bg-[#0d1117] border border-[#21262d]">
              <span className="text-slate-400 block mb-1 font-sans">Connection Status</span>
              <span className={healthState.isAvailable ? "text-emerald-400" : "text-rose-400"}>
                {healthState.isAvailable ? "HTTP 200 OK (Connected)" : "Offline / Unreachable"}
              </span>
            </div>
          </div>
        </div>

        {/* Database Configuration Card */}
        <div className="p-5 rounded-lg border border-[#21262d] bg-[#161b22] space-y-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-200">Database Engine</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            CodeSentinel AI uses PostgreSQL with SQLAlchemy ORM and Alembic migrations.
            In development without Docker, tests utilize memory SQLite or local postgres.
          </p>
          <div className="p-3 rounded bg-[#0d1117] border border-[#21262d] text-xs font-mono">
            <span className="text-slate-400 block mb-1 font-sans">Reported DB Status</span>
            <span className="text-slate-200 capitalize">
              {healthState.data?.database || "Disconnected / Offline"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
