// lib/api.ts
// fetch() wrappers for all FastAPI endpoints.
// NEXT_PUBLIC_API_URL env var → falls back to localhost:8000 for local dev.

import type { GradingReport, RoutingResult, DealItem, HealthCard } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Grading ──────────────────────────────────────────────────────────────────

export async function gradeProduct(formData: FormData): Promise<GradingReport> {
  const resp = await fetch(`${BASE_URL}/api/grade`, {
    method: "POST",
    body: formData, // multipart — do NOT set Content-Type header manually
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
