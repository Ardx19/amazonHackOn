// src/lib/api.ts
// fetch() wrappers for all FastAPI endpoints.
// VITE_API_URL env var — falls back to localhost:8000 for local dev.

import type { GradingReport, RoutingResult, DealItem, HealthCard } from "./types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── Grading ──────────────────────────────────────────────────────────────────

export async function gradeProduct(formData: FormData): Promise<GradingReport> {
  const resp = await fetch(`${BASE_URL}/api/grade`, {
    method: "POST",
    body: formData,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `Grade failed: ${resp.status}`);
  }
  const data = await resp.json();
  return data.report as GradingReport;
}

// ─── Routing ─────────────────────────────────────────────────────────────────

export interface RoutePayload {
  item_id: string;
  original_price_inr: number;
  category: string;
  current_location: {
    hub_id: string;
    distance_to_home_warehouse_km: number;
  };
  ring_index?: number;
}

export async function evaluateRoute(payload: RoutePayload): Promise<RoutingResult> {
  const resp = await fetch(`${BASE_URL}/api/evaluate-route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `Route eval failed: ${resp.status}`);
  }
  const data = await resp.json();
  return data.result as RoutingResult;
}

// ─── Deals ───────────────────────────────────────────────────────────────────

export async function getDeals(hubId?: string): Promise<{ count: number; deals: DealItem[] }> {
  const url = hubId
    ? `${BASE_URL}/api/deals?hub_id=${encodeURIComponent(hubId)}`
    : `${BASE_URL}/api/deals`;
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) throw new Error(`Deals fetch failed: ${resp.status}`);
  return resp.json();
}

// ─── Health Card ──────────────────────────────────────────────────────────────

export interface HealthCardPayload {
  item_id: string;
  seller_id: string;
  seller_name: string;
  seller_city: string;
  seller_usage_description?: string;
}

export async function generateHealthCard(payload: HealthCardPayload): Promise<HealthCard> {
  const resp = await fetch(`${BASE_URL}/api/health-card`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `Health card failed: ${resp.status}`);
  }
  const data = await resp.json();
  return data.card as HealthCard;
}

export async function getHealthCardByUuid(cardUuid: string): Promise<HealthCard> {
  const resp = await fetch(`${BASE_URL}/api/health-card/${encodeURIComponent(cardUuid)}`);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `Health card fetch failed: ${resp.status}`);
  }
  const data = await resp.json();
  return data.card as HealthCard;
}

// ─── Admin Review Queue ─────────────────────────────────────────────────────

export async function fetchReviewQueue(): Promise<any[]> {
  const resp = await fetch(`${BASE_URL}/api/admin/review-queue`);
  if (!resp.ok) throw new Error(`Review queue fetch failed: ${resp.status}`);
  const data = await resp.json();
  return data.items || [];
}

export async function submitReviewDecision(cardUuid: string, decision: string, note?: string): Promise<any> {
  const resp = await fetch(`${BASE_URL}/api/admin/review-queue/${encodeURIComponent(cardUuid)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, note }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `Review decision failed: ${resp.status}`);
  }
  return resp.json();
}

// ─── Transaction Rating ─────────────────────────────────────────────────────

export async function rateTransaction(transactionId: string, rating: number): Promise<any> {
  const resp = await fetch(`${BASE_URL}/api/transactions/${encodeURIComponent(transactionId)}/rate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `Rating failed: ${resp.status}`);
  }
  return resp.json();
}
