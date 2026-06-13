"use client";
// app/deals/page.tsx — ReRoute Deals marketplace
// Shows floating-discount listings from GET /api/deals

import { useState, useEffect } from "react";
import { getDeals } from "@/lib/api";
import type { DealItem } from "@/lib/types";
import DealCard from "@/components/DealCard";

const HUB_FILTERS = [
  { id: "", name: "All Hubs" },
  { id: "MUM_H1", name: "Andheri" },
  { id: "MUM_H2", name: "Thane" },
  { id: "MUM_H3", name: "Kalyan" },
];

export default function DealsPage() {
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [count, setCount] = useState(0);
  const [hubFilter, setHubFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bought, setBought] = useState<string | null>(null); // listing_id

  async function fetchDeals(hub: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await getDeals(hub || undefined);
      setDeals(data.deals);
      setCount(data.count);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load deals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDeals(hubFilter);
  }, [hubFilter]);

  function handleBuy(deal: DealItem) {
    setBought(deal.listing_id);
    // Demo: mark bought visually — no real payment
  }

  return (
    <div className="page-wrap">
      <div className="section-title">ReRoute Deals</div>
      <p style={{ color: "#555", fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Returned items intercepted mid-transit. Buy now — price rises as item approaches
        warehouse.
      </p>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Filter by hub:</span>
        {HUB_FILTERS.map((h) => (
          <button
            key={h.id}
            onClick={() => setHubFilter(h.id)}
            style={{
              padding: "4px 12px",
              borderRadius: 20,
              border: "1px solid",
              borderColor: hubFilter === h.id ? "#ff9900" : "#ccc",
              background: hubFilter === h.id ? "#ff9900" : "#fff",
              color: hubFilter === h.id ? "#000" : "#333",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: hubFilter === h.id ? 700 : 400,
            }}
          >
            {h.name}
          </button>
        ))}

        <button
          onClick={() => fetchDeals(hubFilter)}
          style={{ marginLeft: "auto", padding: "4px 14px", cursor: "pointer", fontSize: 12 }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Status */}
      {loading && <div style={{ color: "#555", fontSize: 13 }}>Loading deals…</div>}
      {error && <div className="error-box">{error}</div>}
      {!loading && !error && (
        <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
          {count} active listing{count !== 1 ? "s" : ""}
        </div>
      )}

      {/* Bought confirmation */}
      {bought && (
        <div className="success-box">
          ✓ Purchase confirmed! Listing {bought} — item will ship from current hub.{" "}
          <button
            style={{ background: "none", border: "none", color: "#0066c0", cursor: "pointer" }}
            onClick={() => setBought(null)}
          >
            Close
          </button>
        </div>
      )}

      {/* Deal grid */}
      {!loading && deals.length === 0 && (
        <div style={{ color: "#888", fontSize: 13 }}>
          No active deals. Try running the seed script or initiate a return from the Return
          Center.
        </div>
      )}

      <div className="card-grid">
        {deals.map((deal) => (
          <DealCard key={deal.listing_id} deal={deal} onBuy={handleBuy} />
        ))}
      </div>
    </div>
  );
}
