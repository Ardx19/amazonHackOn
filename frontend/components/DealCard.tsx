"use client";
// components/DealCard.tsx
// A single ReRoute Deals listing card.

import type { DealItem } from "@/lib/types";

const HUB_LABELS: Record<string, string> = {
  MUM_H1: "Andheri Hub",
  MUM_H2: "Thane Hub",
  MUM_H3: "Kalyan Hub",
  MUM_W: "Bhiwandi Warehouse",
};

interface Props {
  deal: DealItem;
  onBuy: (deal: DealItem) => void;
}

export default function DealCard({ deal, onBuy }: Props) {
  const discount = Math.round(deal.discount_pct);
  const hubLabel =
    deal.current_hub_name ?? HUB_LABELS[deal.current_hub_id ?? ""] ?? deal.current_hub_id;

  return (
    <div style={styles.card}>
      {/* Discount badge */}
      <div style={styles.discountBadge}>{discount}% off</div>

      {/* Product name / item id */}
      <div style={styles.name}>{deal.product_name ?? deal.item_id}</div>

      {/* Ring indicator */}
      <div style={styles.hubRow}>
        <span style={styles.dot} />
        <span style={{ fontSize: 12, color: "#555" }}>
          Ring {deal.ring_index} · {hubLabel}
        </span>
      </div>

      {/* Price */}
      <div style={styles.priceRow}>
        <span style={styles.salePrice}>₹{Math.round(deal.current_sale_price_inr)}</span>
        <span style={styles.strikePrice}>₹{Math.round(deal.original_price_inr)}</span>
      </div>

      <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
        Available within {deal.radius_km.toFixed(0)} km
      </div>

      <div style={styles.urgency}>Price increases at next hub checkpoint.</div>

      <button style={styles.buyBtn} onClick={() => onBuy(deal)}>
        Buy Now
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    border: "1px solid #ddd",
    borderRadius: 4,
    padding: 14,
    background: "#fff",
    position: "relative",
    fontSize: 13,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  discountBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    background: "#b12704",
    color: "#fff",
    padding: "2px 7px",
    borderRadius: 3,
    fontWeight: 700,
    fontSize: 12,
  },
  name: { fontWeight: 600, fontSize: 14, marginBottom: 2, paddingRight: 60 },
  hubRow: { display: "flex", alignItems: "center", gap: 4 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#ff9900",
    display: "inline-block",
  },
  priceRow: { display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 },
  salePrice: { fontSize: 20, fontWeight: 700, color: "#111" },
  strikePrice: { fontSize: 13, color: "#999", textDecoration: "line-through" },
  urgency: {
    fontSize: 11,
    color: "#c45500",
    fontStyle: "italic",
  },
  buyBtn: {
    marginTop: 8,
    background: "#ff9900",
    border: "1px solid #e47911",
    borderRadius: 20,
    padding: "6px 14px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
    width: "100%",
  },
};
