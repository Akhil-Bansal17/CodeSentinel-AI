import React from "react";
import { Server, Database, RefreshCw, Settings, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { HealthState } from "../hooks/useHealth";
import { StatusBadge } from "../components/common/StatusBadge";
import { Card } from "../components/common/Card";
import { Button } from "../components/common/Button";

interface SettingsPageProps {
  healthState: HealthState;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ healthState }) => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-default">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-subtle border border-accent-border text-accent shrink-0 mt-0.5 sm:mt-0">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-text-primary tracking-tight">
                Platform Settings
              </h1>
              <StatusBadge label="Configuration" variant="info" isMono />
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Environment parameters and service connectivity diagnostics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => healthState.refetch()}
            disabled={healthState.isLoading}
            leftIcon={
              <RefreshCw className={`w-3.5 h-3.5 ${healthState.isLoading ? "animate-spin" : ""}`} />
            }
          >
            <span>{healthState.isLoading ? "Connecting..." : "Test Connection"}</span>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* API Backend Card */}
        <Card padding="md" className="space-y-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Server className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Backend API Connection</h3>
                <p className="text-[11px] text-text-muted">FastAPI REST service endpoint diagnostics</p>
              </div>
            </div>
            <StatusBadge
              label={healthState.isAvailable ? "HEALTHY" : "OFFLINE"}
              variant={healthState.isAvailable ? "success" : "danger"}
              isMono
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-surface-base border border-border-default">
              <span className="text-text-muted block mb-1 font-sans text-[11px]">API Endpoint</span>
              <span className="text-text-primary font-medium">/api/health</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-base border border-border-default flex items-center justify-between">
              <div>
                <span className="text-text-muted block mb-1 font-sans text-[11px]">Connection Status</span>
                <span className={healthState.isAvailable ? "text-emerald-400 font-medium" : "text-rose-400 font-medium"}>
                  {healthState.isAvailable ? "HTTP 200 OK (Connected)" : "Offline / Unreachable"}
                </span>
              </div>
              {healthState.isAvailable ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
            </div>
          </div>
        </Card>

        {/* Database Configuration Card */}
        <Card padding="md" className="space-y-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Database className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Database Engine</h3>
                <p className="text-[11px] text-text-muted">PostgreSQL storage layer with SQLAlchemy ORM and Alembic migrations</p>
              </div>
            </div>
            <StatusBadge
              label={healthState.data?.database === "connected" ? "CONNECTED" : "OFFLINE"}
              variant={healthState.data?.database === "connected" ? "success" : "neutral"}
              isMono
            />
          </div>

          <div className="p-3.5 rounded-lg bg-surface-base border border-border-default space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-text-muted font-sans text-[11px]">Reported DB Status</span>
              <span className="text-text-primary font-medium capitalize">
                {healthState.data?.database || "Disconnected / Offline"}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed pt-1 border-t border-border-subtle">
              CodeSentinel AI operates with PostgreSQL for production workloads and persistent storage.
              In development or headless testing, tests utilize memory SQLite with strict ACID isolation.
            </p>
          </div>
        </Card>

        {/* System Runtime Security Card */}
        <Card padding="md" className="space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-accent-subtle border border-accent-border flex items-center justify-center text-accent">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Deterministic Isolation &amp; Security</h3>
              <p className="text-[11px] text-text-muted">Read-only code ingestion boundary guarantees</p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface-base border border-border-default text-xs text-text-secondary space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Snapshot isolation prevents write mutations to user repositories</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>All AST parsing, SCA scans, and architectural metrics run strictly in-process</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
