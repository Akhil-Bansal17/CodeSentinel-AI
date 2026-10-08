import { ApiErrorResponse } from "../types/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export class ApiClientError extends Error {
  public code: string;
  public status: number;
  public details?: unknown;

  constructor(message: string, status: number, code: string = "API_ERROR", details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: ApiErrorResponse | null = null;
      try {
        errorData = await response.json();
      } catch {
        // Fallback for non-JSON responses
      }

      const errorMessage =
        errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      const errorCode = errorData?.error?.code || `HTTP_${response.status}`;
      const errorDetails = errorData?.error?.details;

      throw new ApiClientError(errorMessage, response.status, errorCode, errorDetails);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    // Network / connectivity error (e.g. server offline)
    throw new ApiClientError(
      error instanceof Error ? error.message : "Failed to connect to backend service.",
      0,
      "NETWORK_ERROR"
    );
  }
}
