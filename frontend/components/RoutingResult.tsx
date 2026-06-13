"use client";
// components/RoutingResult.tsx
// Displays a RoutingResult from POST /api/evaluate-route.

import type { RoutingResult } from "@/lib/types";

const ROUTE_LABEL: Record<string, { label: string; color: string }> = {
  reroute_deals: { label: "ReRoute Deals", color: "#007600" },
  amazon_renewed: { label: "Amazon Renewed", color: "#0066c0" },
  relist: { label: "ReList (C2C)", color: "#c45500" },
  donate: { label: "Donate", color: "#888" },
  recycle: { label: "Recycle", color: "#b12704" },
  standard_return: { label: "Standard Return", color: "#555" },
};

interface Props {
  result: RoutingResult;
}

export default function RoutingResultCard({ result }: Props) {
  const route = ROUTE_LABEL[result.final_route] ?? {
    label: result.final_route,
    color: "#555",
  };
  const overheadPct = (result.overhead_ratio * 100).toFixed(1);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={{ ...styles.routeBadge, background: route.color }}>{route.label}</span>
        {result.entered_reroute && (
          <span style={styles.interceptBadge}>✓ ReRoute Intercept</span>
        )}
      </div>

      <div style={styles.grid}>
        <Cell label="Sale Price" value={`₹${result.sale_price_inr.toFixed(0)}`} />
        <Cell label="MVSP" value={`₹${result.mvsp_inr.toFixed(0)}`} />
        <Cell label="Overhead" value={`${overheadPct}%`} />
        <Cell label="Radius" value={`${result.profitable_radius_km.toFixed(1)} km`} />
        <Cell label="Ring" value={`Ring ${result.ring_index}`} />
      </div>

      <div style={styles.reason}>{result.routing_reason}</div>

      {result.listing_id && (
        <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
          Listing ID: {result.listing_id}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "#888" }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    border: "1px solid #ddd",
    borderRadius: 4,
    padding: 14,
    background: "#fff",
    fontSize: 13,
  },
  header: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  routeBadge: {
    color: "#fff",
    padding: "3px 10px",
    borderRadius: 3,
    fontWeight: 700,
    fontSize: 14,
  },
  interceptBadge: {
    background: "#d4edda",
    border: "1px solid #28a745",
    color: "#155724",
    padding: "1px 6px",
    borderRadius: 3,
    fontSize: 11,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 8,
    padding: "8px 0",
    borderTop: "1px solid #eee",
    borderBottom: "1px solid #eee",
    marginBottom: 8,
  },
  reason: { color: "#555", fontSize: 12 },
};
