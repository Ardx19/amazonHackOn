"use client";
// app/relist/page.tsx — ReList C2C
// Rahul's flow: upload → grade → generate health card

import { useState } from "react";
import { gradeProduct, generateHealthCard } from "@/lib/api";
import type { GradingReport, HealthCard } from "@/lib/types";
import GradingCard from "@/components/GradingCard";
import HealthCardView from "@/components/HealthCardView";

// Preset C2C products (non-trajectory items from seed)
const C2C_PRODUCTS = [
  { id: "PROD_004", name: "Peter England Formal Shirt", category: "clothing", price: 899 },
  { id: "PROD_005", name: "Prestige Mixer Grinder", category: "home_goods", price: 3499 },
  { id: "PROD_006", name: "Puma Smash Sneakers", category: "footwear", price: 2999 },
  { id: "PROD_007", name: "boAt Airdopes Earbuds", category: "electronics", price: 1499 },
  { id: "PROD_009", name: "Ray-Ban Aviator Sunglasses", category: "clothing", price: 8999 },
  { id: "PROD_002", name: "Philips Avent Baby Monitor", category: "baby_products", price: 2499 },
];

const DEMO_SELLERS = [
  { id: "USER_RAHUL", name: "Rahul Mehta", city: "Mumbai" },
  { id: "USER_PRIYA", name: "Priya Sharma", city: "Mumbai" },
];

export default function RelistPage() {
  const [selectedProduct, setSelectedProduct] = useState(C2C_PRODUCTS[0]);
  const [selectedSeller, setSelectedSeller] = useState(DEMO_SELLERS[0]);
  const [files, setFiles] = useState<FileList | null>(null);

  const [gradingReport, setGradingReport] = useState<GradingReport | null>(null);
  const [healthCard, setHealthCard] = useState<HealthCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "grading" | "card" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files || files.length === 0) {
      setError("Please select at least one image.");
      return;
    }
    setError(null);
    setGradingReport(null);
    setHealthCard(null);
    setLoading(true);

    try {
      // ── Grade ─────────────────────────────────────────────────
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

      // ── Health Card ────────────────────────────────────────────
      setStep("card");
      const card = await generateHealthCard({
        item_id: selectedProduct.id,
        seller_id: selectedSeller.id,
        seller_name: selectedSeller.name,
        seller_city: selectedSeller.city,
      });
      setHealthCard(card);
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
      <div className="section-title">ReList — Sell with Amazon</div>
      <p style={{ color: "#555", fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        AI-grade your item. Get a tamper-proof Health Card. List for nearby buyers.
        (Demo: select product + seller, upload any image.)
      </p>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* ── Form ──────────────────────────────────────────── */}
        <div style={styles.formCard}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label htmlFor="c2c-product">Your Product</label>
              <select
                id="c2c-product"
                value={selectedProduct.id}
                onChange={(e) =>
                  setSelectedProduct(
                    C2C_PRODUCTS.find((p) => p.id === e.target.value) ?? C2C_PRODUCTS[0]
                  )
                }
                style={{ marginTop: 4 }}
              >
                {C2C_PRODUCTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{p.price}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="seller">Seller (Demo)</label>
              <select
                id="seller"
                value={selectedSeller.id}
                onChange={(e) =>
                  setSelectedSeller(
                    DEMO_SELLERS.find((s) => s.id === e.target.value) ?? DEMO_SELLERS[0]
                  )
                }
                style={{ marginTop: 4 }}
              >
                {DEMO_SELLERS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="c2c-images">Product Photos (up to 3)</label>
              <input
                id="c2c-images"
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
                  ? "Grading…"
                  : "Generating Health Card…"
                : "Grade & List"}
            </button>
          </form>
        </div>

        {/* ── Results ───────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 16 }}>
          {gradingReport && (
            <div>
              <div style={styles.resultLabel}>AI Grading Report</div>
              <GradingCard report={gradingReport} />
            </div>
          )}

          {healthCard && (
            <div>
              <div style={styles.resultLabel}>Product Health Card</div>
              <HealthCardView card={healthCard} qrBase64={healthCard.qr_code_base64 ?? undefined} />
            </div>
          )}

          {step === "done" && (
            <div className="success-box">
              ✓ Listed on ReList! Health Card is live at{" "}
              <a href={healthCard?.card_url} target="_blank" rel="noreferrer">
                {healthCard?.card_url}
              </a>
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
