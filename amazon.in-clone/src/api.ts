// src/api.ts
// Thin client for the ReRoute backend. The only place this frontend talks to
// the backend. Base URL comes from VITE_API_URL (see .env), defaults to local.

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, '') ||
  'http://localhost:8000';

// ─── Backend response shapes (subset we use) ─────────────────────────────────

export interface BackendDefect {
  defect_type: string;
  severity: string;
  location: string;
}

export interface BackendGradingReport {
  report_id: string;
  item_id: string;
  product_category: string;
  brand_guess: string | null;
  condition_grade: string;
  defects: BackendDefect[];
  completeness: string;
  confidence: number;
  estimated_retail_inr: number;
  suggested_resale_band_inr: [number, number];
  recommended_route: string;
  routing_reason: string;
}

export interface BackendDeal {
  listing_id: string;
  item_id: string;
  product_name: string | null;
  current_hub_id: string | null;
  current_hub_name: string | null;
  ring_index: number;
  original_price_inr: number;
  current_sale_price_inr: number;
  discount_pct: number;
  radius_km: number;
  status: string;
}

// ─── Calls ───────────────────────────────────────────────────────────────────

/** POST /api/grade — uploads real image bytes, returns the AI grading report. */
export async function gradeProduct(params: {
  itemId: string;
  productName: string;
  category: string;
  originalPriceInr: number;
  files: File[];
  flow?: string;
}): Promise<BackendGradingReport> {
  const fd = new FormData();
  fd.append('item_id', params.itemId);
  fd.append('product_name', params.productName);
  fd.append('category', params.category);
  fd.append('original_price_inr', String(params.originalPriceInr));
  fd.append('flow', params.flow ?? 'relist');
  params.files.slice(0, 3).forEach((f) => fd.append('images', f));

  const resp = await fetch(`${API_BASE}/api/grade`, { method: 'POST', body: fd });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Grade failed (${resp.status}): ${detail}`);
  }
  const data = await resp.json();
  return data.report as BackendGradingReport;
}

/** GET /api/deals — active floating-discount listings. */
export async function getDeals(): Promise<BackendDeal[]> {
  const resp = await fetch(`${API_BASE}/api/deals`);
  if (!resp.ok) throw new Error(`Deals fetch failed (${resp.status})`);
  const data = await resp.json();
  return (data.deals ?? []) as BackendDeal[];
}
