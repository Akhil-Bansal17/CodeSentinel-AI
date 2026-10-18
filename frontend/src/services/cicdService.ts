/**
 * Phase 8 CI/CD, Audit, and PR Synthesis Service Client.
 */

import { request } from "./api";
import {
  AuditRunListResponse,
  AuditRunResponse,
  PrPrepareRequest,
  PrPrepareResponse,
  WorkflowGenerateRequest,
  WorkflowGenerateResponse,
} from "../types/cicd";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const cicdService = {
  /**
   * Synthesize a hardened, least-privilege GitHub Actions workflow.
   */
  async generateWorkflow(payload: WorkflowGenerateRequest): Promise<WorkflowGenerateResponse> {
    return request<WorkflowGenerateResponse>("/v1/cicd/workflows/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Trigger and execute a 6-pillar codebase security audit.
   */
  async executeAudit(repositoryId: string, snapshotId?: string): Promise<AuditRunResponse> {
    return request<AuditRunResponse>("/v1/cicd/audits/run", {
      method: "POST",
      body: JSON.stringify({
        repository_id: repositoryId,
        snapshot_id: snapshotId,
      }),
    });
  },

  /**
   * List historical audit runs for a repository.
   */
  async listAudits(repositoryId?: string): Promise<AuditRunListResponse> {
    const query = repositoryId ? `?repository_id=${encodeURIComponent(repositoryId)}` : "";
    return request<AuditRunListResponse>(`/v1/cicd/audits${query}`);
  },

  /**
   * Fetch single audit run details.
   */
  async getAudit(auditId: string): Promise<AuditRunResponse> {
    return request<AuditRunResponse>(`/v1/cicd/audits/${encodeURIComponent(auditId)}`);
  },

  /**
   * Fetch SARIF 2.1.0 standard report.
   */
  async getSarif(auditId: string): Promise<Record<string, any>> {
    return request<Record<string, any>>(`/v1/cicd/audits/${encodeURIComponent(auditId)}/sarif`);
  },

  /**
   * Download Markdown report string.
   */
  async getMarkdownReport(auditId: string): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/v1/cicd/audits/${encodeURIComponent(auditId)}/markdown`);
    if (!res.ok) {
      throw new Error(`Failed to download report: ${res.statusText}`);
    }
    return res.text();
  },

  /**
   * Prepare, conflict-check, and synthesize a multi-patch PR change set.
   */
  async preparePr(payload: PrPrepareRequest): Promise<PrPrepareResponse> {
    return request<PrPrepareResponse>("/v1/cicd/pr/prepare", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetch single PR preparation record.
   */
  async getPr(prId: string): Promise<PrPrepareResponse> {
    return request<PrPrepareResponse>(`/v1/cicd/pr/${encodeURIComponent(prId)}`);
  },

  /**
   * Download unified git patch bundle string.
   */
  async getPatchBundle(prId: string): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/v1/cicd/pr/${encodeURIComponent(prId)}/patch`);
    if (!res.ok) {
      throw new Error(`Failed to download patch bundle: ${res.statusText}`);
    }
    return res.text();
  },
};
