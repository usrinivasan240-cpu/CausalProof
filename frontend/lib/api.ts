// Lightweight typed API client for CausalProof.

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

const BASE = "/api";

async function request<T>(path: string, opts?: RequestInit): Promise<ApiResponse<T>> {
  const token = typeof window !== "undefined" ? localStorage.getItem("cp_token") : null;
  const headers: Record<string, string> = {
    ...(opts?.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? `HTTP ${res.status}` };
  return { data: json as T };
}

export function loadDemo() {
  return request<{
    investigation: { id: string; name: string; status: string };
    report: { executiveSummary: string; hypotheses: unknown[]; divergences: unknown[]; evidence: unknown[]; counterfactuals: unknown[]; recommendations: unknown[] };
    note: string;
  }>("/demo", { method: "POST" });
}

export function listInvestigations() {
  return request<{ investigations: { id: string; name: string; domain: string; status: string; isDemo?: boolean }[] }>("/investigations");
}

export function getInvestigation(id: string) {
  return request<{ investigation: { id: string; name: string; status: string } }>(`/investigations/${id}`);
}

export function createInvestigation(data: Record<string, unknown>) {
  return request<{ investigation: { id: string } }>("/investigations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function getGraph(investigationId: string) {
  return request<{ intended: unknown[]; observed: unknown[]; edges: unknown[]; divergences: unknown[] }>(
    `/graph/${investigationId}`
  );
}

export function getEvidence(investigationId: string) {
  return request<{ evidence: unknown[]; count: number }>(`/evidence?investigationId=${investigationId}`);
}

export function getReport(investigationId: string) {
  return request<{ report: { executiveSummary: string; hypotheses: unknown[]; divergences: unknown[]; evidence: unknown[]; counterfactuals: unknown[]; recommendations: unknown[]; confidence: number; missingInformation: string[]; limitations: string[]; intendedPathway: unknown[]; observedPathway: unknown[]; pathwayEdges: unknown[]; dataSources: unknown[] } }>(
    `/graph/${investigationId}`
  );
}
