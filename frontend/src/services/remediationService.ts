/**
 * API client service for Phase 7 Automated Remediation & Safe Code Patch Synthesis.
 */

import { request } from "./api";
import {
  RemediationApplyResponse,
  RemediationAuditItem,
  RemediationAvailability,
  RemediationProposal,
  RemediationProposalCreateRequest,
  RemediationProposalListResponse,
  RemediationRule,
} from "../types/remediation";

export const remediationService = {
  /** List all supported remediation rules in the catalog */
  async getRules(): Promise<RemediationRule[]> {
    return request<RemediationRule[]>("/v1/remediation/rules");
  },

  /** Check automated remediation availability for a finding */
  async checkAvailability(findingId: string): Promise<RemediationAvailability> {
    return request<RemediationAvailability>(`/v1/remediation/findings/${findingId}/availability`);
  },

  /** Synthesize a new patch proposal with in-memory validation */
  async createProposal(payload: RemediationProposalCreateRequest): Promise<RemediationProposal> {
    return request<RemediationProposal>("/v1/remediation/proposals", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** List patch proposals matching optional filters */
  async listProposals(params?: {
    repositoryId?: string;
    findingId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<RemediationProposalListResponse> {
    const query = new URLSearchParams();
    if (params?.repositoryId) query.append("repository_id", params.repositoryId);
    if (params?.findingId) query.append("finding_id", params.findingId);
    if (params?.status) query.append("status", params.status);
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.offset) query.append("offset", params.offset.toString());

    const qs = query.toString();
    return request<RemediationProposalListResponse>(`/v1/remediation/proposals${qs ? `?${qs}` : ""}`);
  },

  /** Get proposal details and unified diff */
  async getProposal(proposalId: string): Promise<RemediationProposal> {
    return request<RemediationProposal>(`/v1/remediation/proposals/${proposalId}`);
  },

  /** Re-run in-memory validation checks against current source */
  async validateProposal(proposalId: string): Promise<RemediationProposal> {
    return request<RemediationProposal>(`/v1/remediation/proposals/${proposalId}/validate`, {
      method: "POST",
    });
  },

  /** Explicitly approve a validated proposal for application */
  async approveProposal(proposalId: string, notes?: string): Promise<RemediationProposal> {
    return request<RemediationProposal>(`/v1/remediation/proposals/${proposalId}/approve`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },

  /** Explicitly reject a proposal */
  async rejectProposal(proposalId: string, reason: string): Promise<RemediationProposal> {
    return request<RemediationProposal>(`/v1/remediation/proposals/${proposalId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  /** Safely apply an approved proposal to repository workspace */
  async applyProposal(proposalId: string): Promise<RemediationApplyResponse> {
    return request<RemediationApplyResponse>(`/v1/remediation/proposals/${proposalId}/apply`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  /** Get proposal state transition audit history */
  async getProposalHistory(proposalId: string): Promise<RemediationAuditItem[]> {
    return request<RemediationAuditItem[]>(`/v1/remediation/proposals/${proposalId}/history`);
  },
};
