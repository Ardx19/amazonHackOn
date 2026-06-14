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

export async function getDeals(hubId?: string, pincode?: string, excludeItemId?: string): Promise<{ count: number; deals: DealItem[] }> {
  const params = new URLSearchParams();
  if (hubId) params.set('hub_id', hubId);
  if (pincode) params.set('pincode', pincode);
  if (excludeItemId) params.set('exclude_item_id', excludeItemId);
  const qs = params.toString();
  const url = qs ? `${BASE_URL}/api/deals?${qs}` : `${BASE_URL}/api/deals`;
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
  declaration_all_checked?: boolean;
  declaration_timestamp?: string;
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

// ─── Returns ─────────────────────────────────────────────────────────────────

export interface InitiateReturnResult {
  grading: {
    condition_grade: string;
    confidence: number;
    defects: Array<{ defect_type: string; severity: string; location: string }>;
  };
  route: {
    item_id: string;
    final_route: string;
    entered_reroute: boolean;
    sale_price_inr: number;
    profitable_radius_km: number;
    discount_pct: number;
    ring_index: number;
    listing_id: string;
    routing_reason: string;
  };
  trajectory_id: string;
  checkpoints: Array<{
    index: number;
    hub_id: string;
    hub_name: string;
    lat: number;
    lng: number;
    remaining_distance_km: number;
    hours_from_start: number;
  }>;
  total_distance_km: number;
}

/** POST /api/initiate-return — upload photos + initiate the full return pipeline */
export async function initiateReturn(formData: FormData): Promise<InitiateReturnResult> {
  const resp = await fetch(`${BASE_URL}/api/initiate-return`, {
    method: "POST",
    body: formData,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `Return initiation failed: ${resp.status}`);
  }
  const data = await resp.json();
  return data as InitiateReturnResult;
}

// ─── Simulation ──────────────────────────────────────────────────────────────

export interface AdvanceRingResult {
  item_id: string;
  listing_id: string;
  ring_index: number;
  sale_price_inr: number;
  radius_km: number;
  discount_pct: number;
  hub_id: string;
  hub_name: string | null;
  reached_rc: boolean;
}

/** POST /api/advance-ring — move the item to the next checkpoint */
export async function advanceRing(itemId: string, category: string): Promise<AdvanceRingResult> {
  const resp = await fetch(`${BASE_URL}/api/advance-ring`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_id: itemId, category }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `Advance ring failed: ${resp.status}`);
  }
  const data = await resp.json();
  return data as AdvanceRingResult;
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
