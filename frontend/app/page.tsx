"use client";
// app/page.tsx — Return Center
// Priya's flow: upload photos → grade → evaluate route → see listing

import { useState } from "react";
import { gradeProduct, evaluateRoute } from "@/lib/api";
import type { GradingReport, RoutingResult } from "@/lib/types";
import GradingCard from "@/components/GradingCard";
import RoutingResultCard from "@/components/RoutingResult";

// ─── Demo presets from seed data ──────────────────────────────────────────────
const DEMO_PRODUCTS = [
  { id: "PROD_001", name: "Nike Revolution 6 Running Shoes", category: "footwear", price: 599 },
  { id: "PROD_002", name: "Philips Avent Baby Monitor", category: "baby_products", price: 2499 },
  { id: "PROD_003", name: "Spigen Phone Case", category: "electronics", price: 349 },
  { id: "PROD_005", name: "Prestige Mixer Grinder", category: "home_goods", price: 3499 },
  { id: "PROD_009", name: "Ray-Ban Aviator Sunglasses", category: "clothing", price: 8999 },
];

const HUBS = [
  { id: "MUM_H1", name: "Andheri Hub", km: 48 },
  { id: "MUM_H2", name: "Thane Hub", km: 30 },
  { id: "MUM_H3", name: "Kalyan Hub", km: 12 },
];

export default function ReturnCenter() {
  // Form state
  const [selectedProduct, setSelectedProduct] = useState(DEMO_PRODUCTS[0]);
  const [selectedHub, setSelectedHub] = useState(HUBS[0]);
  const [files, setFiles] = useState<FileList | null>(null);

  // Result state
  const [gradingReport, setGradingReport] = useState<GradingReport | null>(null);
  const [routingResult, setRoutingResult] = useState<RoutingResult | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "grading" | "routing" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files || files.length === 0) {
      setError("Please select at least one image.");
      return;
    }
    setError(null);
    setGradingReport(null);
    setRoutingResult(null);
    setLoading(true);

    try {
      // ── Step 1: Grade ──────────────────────────────────────────
      setStep("grading");
      const formData = new FormData();
      formData.append("item_id", selectedProduct.id);
      formData.append("product_name", selectedProduct.name);
      formData.append("category", selectedProduct.category);
      formData.append("original_price_inr", String(selectedProduct.price));
      for (let i = 0; i < Math.min(files.length, 3); i++) {
        formData.append("images", files[i]);
      }

      const report = await gradeProduct(formData);
      setGradingReport(report);

      // ── Step 2: Evaluate Route ─────────────────────────────────
      setStep("routing");
      const result = await evaluateRoute({
        item_id: selectedProduct.id,
        original_price_inr: selectedProduct.price,
        category: selectedProduct.category,
        current_location: {
          hub_id: selectedHub.id,
          distance_to_home_warehouse_km: selectedHub.km,
        },
        ring_index: 0,
      });
      setRoutingResult(result);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStep("idle");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-wrap">
      <div className="section-title">Return Center</div>
      <p style={{ color: "#555", fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Upload product photos to get an AI grade and routing decision.
        (Demo: select a preset product, then upload any image.)
      </p>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* ── Form ──────────────────────────────────────────── */}
        <div style={styles.formCard}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Product selector */}
            <div>
              <label htmlFor="product">Product</label>
              <select
                id="product"
                value={selectedProduct.id}
                onChange={(e) =>
                  setSelectedProduct(
                    DEMO_PRODUCTS.find((p) => p.id === e.target.value) ?? DEMO_PRODUCTS[0]
                  )
                }
                style={{ marginTop: 4 }}
              >
                {DEMO_PRODUCTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{p.price}
                  </option>
                ))}
              </select>
            </div>

            {/* Hub selector */}
            <div>
              <label htmlFor="hub">Current Hub (return location)</label>
              <select
                id="hub"
                value={selectedHub.id}
                onChange={(e) =>
                  setSelectedHub(HUBS.find((h) => h.id === e.target.value) ?? HUBS[0])
                }
                style={{ marginTop: 4 }}
              >
                {HUBS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.km} km to warehouse)
                  </option>
                ))}
              </select>
            </div>

            {/* Image upload */}
            <div>
              <label htmlFor="images">Product Photos (up to 3)</label>
              <input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                style={{ marginTop: 4, padding: 0, border: "none", background: "transparent" }}
              />
            </div>

            {error && <div className="error-box">{error}</div>}

            <button className="btn" type="submit" disabled={loading}>
              {loading
                ? step === "grading"
                  ? "Grading with AI…"
                  : "Evaluating route…"
                : "Grade & Route"}
            </button>
          </form>
        </div>

        {/* ── Results ───────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 14 }}>
          {gradingReport && (
            <div>
              <div style={styles.resultLabel}>AI Grading Report</div>
              <GradingCard report={gradingReport} />
            </div>
          )}

          {routingResult && (
            <div>
              <div style={styles.resultLabel}>Routing Decision</div>
              <RoutingResultCard result={routingResult} />
            </div>
          )}

          {step === "done" && routingResult?.final_route === "reroute_deals" && (
            <div className="success-box">
              ✓ Item listed on ReRoute Deals!{" "}
              <a href="/deals">View on Deals page →</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  formCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 4,
    padding: 18,
    width: 320,
    flexShrink: 0,
  },
  resultLabel: {
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 6,
    color: "#333",
  },
};
