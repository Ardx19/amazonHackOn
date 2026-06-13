// lib/types.ts
// TypeScript interfaces matching backend Pydantic schemas exactly.

export interface Defect {
  defect_type: string;
  severity: "minor" | "moderate" | "major";
  location: string;
}

export interface GradingReport {
  report_id: string;
  item_id: string;
  product_category: string;
  brand_guess: string | null;
  condition_grade: "Like New" | "Good" | "Fair" | "Poor";
  defects: Defect[];
  completeness: "complete" | "incomplete" | "accessories_missing";
  confidence: number;
  estimated_retail_inr: number;
  suggested_resale_band_inr: [number, number];
  recommended_route: string;
  routing_reason: string;
  manual_review_recommended: boolean;
  graded_at: string;
  rekognition_labels: string[];
}

export interface RoutingResult {
  item_id: string;
  final_route: string;
  ring_index: number;
  sale_price_inr: number;
  profitable_radius_km: number;
  listing_id: string;
  routing_reason: string;
  mvsp_inr: number;
  overhead_ratio: number;
  entered_reroute: boolean;
}

export interface DealItem {
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

export interface HealthCard {
  card_id: string;
  item_id: string;
  card_uuid: string;
  card_url: string;
  condition_grade: string;
  defects: Defect[];
  brand_guess: string | null;
  product_category: string;
  confidence: number;
  seller_name: string;
  seller_city: string;
  amazon_guarantee: boolean;
  generated_at: string;
  grading_model_version: string;
}
