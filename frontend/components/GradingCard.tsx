"use client";
// components/GradingCard.tsx
// Displays a GradingReport from POST /api/grade.

import type { GradingReport } from "@/lib/types";

const CONDITION_COLOR: Record<string, string> = {
  "Like New": "#007600",
  Good: "#0066c0",
  Fair: "#c45500",
  Poor: "#b12704",
};

const SEVERITY_BADGE: Record<string, string> = {
  minor: "#f0ad4e",
  moderate: "#c45500",
  major: "#b12704",
};

interface Props {
  report: GradingReport;
}

export default function GradingCard({ report }: Props) {
  const condColor = CONDITION_COLOR[report.condition_grade] ?? "#555";
  const confPct = Math.round(report.confidence * 100);

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <span style={{ ...styles.condBadge, background: condColor }}>
          {report.condition_grade}
        </span>
        <span style={styles.confidence}>{confPct}% confident</span>
        {report.manual_review_recommended && (
          <span style={styles.reviewBadge}>⚠ Manual Review Suggested</span>
        )}
      </div>

      {/* Category + Brand */}
      <div style={styles.row}>
        <span style={styles.label}>Category:</span>
        <span>{report.product_category}</span>
        {report.brand_guess && (
          <>
            &nbsp;·&nbsp;
            <span style={styles.label}>Brand:</span>&nbsp;<span>{report.brand_guess}</span>
          </>
        )}
      </div>

      {/* Price band */}
      <div style={styles.row}>
        <span style={styles.label}>Retail:</span>&nbsp;
        <span>₹{report.estimated_retail_inr.toFixed(0)}</span>&nbsp;·&nbsp;
        <span style={styles.label}>Resale band:</span>&nbsp;
        <span>
          ₹{report.suggested_resale_band_inr[0].toFixed(0)} –{" "}
          ₹{report.suggested_resale_band_inr[1].toFixed(0)}
        </span>
      </div>

      {/* Completeness */}
      <div style={styles.row}>
        <span style={styles.label}>Completeness:</span>&nbsp;
        <span>{report.completeness.replace("_", " ")}</span>
      </div>

      {/* Confidence bar */}
      <div style={styles.barBg}>
        <div style={{ ...styles.barFill, width: `${confPct}%`, background: condColor }} />
      </div>

      {/* Defects */}
      {report.defects.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <span style={styles.label}>Defects:</span>
          <ul style={styles.defectList}>
            {report.defects.map((d, i) => (
              <li key={i} style={styles.defectItem}>
                <span
                  style={{
                    ...styles.severityDot,
                    background: SEVERITY_BADGE[d.severity] ?? "#999",
                  }}
                />
                <strong>{d.defect_type}</strong> ({d.severity}) — {d.location}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Route suggestion */}
      <div style={styles.routeBox}>
        <span style={styles.label}>Suggested route:</span>&nbsp;
        <strong>{report.recommended_route.replace(/_/g, " ")}</strong>
        <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{report.routing_reason}</div>
      </div>

      {/* Rekognition labels (debug) */}
      {report.rekognition_labels.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#888" }}>
          Labels: {report.rekognition_labels.join(", ")}
        </div>
      )}
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
  header: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  condBadge: {
    color: "#fff",
    padding: "2px 8px",
    borderRadius: 3,
    fontWeight: 700,
    fontSize: 13,
  },
  confidence: { fontSize: 12, color: "#555" },
  reviewBadge: {
    background: "#fff3cd",
    border: "1px solid #ffc107",
    padding: "1px 6px",
    borderRadius: 3,
    fontSize: 11,
    color: "#856404",
  },
  row: { marginBottom: 4 },
  label: { fontWeight: 600, color: "#333" },
  barBg: { height: 6, background: "#eee", borderRadius: 3, marginTop: 4 },
  barFill: { height: "100%", borderRadius: 3, transition: "width 0.3s" },
  defectList: { margin: "4px 0 0 0", padding: "0 0 0 16px", listStyle: "none" },
  defectItem: { display: "flex", alignItems: "center", gap: 6, marginBottom: 2 },
  severityDot: { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },
  routeBox: {
    marginTop: 10,
    padding: "6px 10px",
    background: "#f5f5f5",
    borderLeft: "3px solid #ff9900",
    borderRadius: 2,
  },
};
