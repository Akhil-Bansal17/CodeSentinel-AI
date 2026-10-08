import { HealthResponse } from "../types/api";
import { request } from "./api";

/**
 * Fetches the backend health status from GET /api/health.
 */
export async function getHealthStatus(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}
