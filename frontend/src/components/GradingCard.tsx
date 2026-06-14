// src/components/GradingCard.tsx
// Displays a GradingReport from POST /api/grade.
// Ported from ReRoute — adapted to Tailwind v4.

import type { GradingReport } from "../lib/types";

const CONDITION_COLOR: Record<string, string> = {
  "Like New": "bg-emerald-600",
  Good: "bg-blue-600",
  Fair: "bg-orange-600",
  Poor: "bg-red-700",
};

const CONDITION_TEXT: Record<string, string> = {
  "Like New": "text-emerald-600",
  Good: "text-blue-600",
  Fair: "text-orange-600",
  Poor: "text-red-700",
};

const SEVERITY_COLOR: Record<string, string> = {
  minor: "bg-yellow-500",
  moderate: "bg-orange-600",
  major: "bg-red-700",
};

interface Props {
  report: GradingReport;
}

export default function GradingCard({ report }: Props) {
  const condBg = CONDITION_COLOR[report.condition_grade] ?? "bg-gray-500";
  const condText = CONDITION_TEXT[report.condition_grade] ?? "text-gray-500";
  const confPct = Math.round(report.confidence * 100);

  return (
    <div className="border border-gray-200 rounded p-3.5 bg-white text-[13px]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-white px-2 py-0.5 rounded font-bold text-[13px] ${condBg}`}>
          {report.condition_grade}
        </span>
        <span className="text-xs text-gray-500">{confPct}% confident</span>
        {report.manual_review_recommended && (
          <span className="bg-yellow-50 border border-yellow-400 px-1.5 py-0.5 rounded text-[11px] text-yellow-800">
            Manual Review Suggested
          </span>
        )}
      </div>

      {/* Category + Brand */}
      <div className="mb-1">
        <span className="font-semibold text-gray-700">Category: </span>
        <span>{report.product_category}</span>
        {report.brand_guess && (
          <>
            <span className="mx-1">·</span>
            <span className="font-semibold text-gray-700">Brand: </span>
            <span>{report.brand_guess}</span>
          </>
        )}
      </div>

      {/* Price band */}
      <div className="mb-1">
        <span className="font-semibold text-gray-700">Retail: </span>
        <span>₹{report.estimated_retail_inr.toFixed(0)}</span>
        <span className="mx-1">·</span>
        <span className="font-semibold text-gray-700">Resale band: </span>
        <span>₹{report.suggested_resale_band_inr[0].toFixed(0)} – ₹{report.suggested_resale_band_inr[1].toFixed(0)}</span>
      </div>

      {/* Completeness */}
      <div className="mb-1">
        <span className="font-semibold text-gray-700">Completeness: </span>
        <span>{report.completeness.replace("_", " ")}</span>
      </div>

      {/* Confidence bar */}
      <div className="h-1.5 bg-gray-200 rounded-full mt-1 mb-2">
        <div
          className={`h-full rounded-full transition-all duration-300 ${condBg}`}
          style={{ width: `${confPct}%` }}
        />
      </div>

      {/* Defects */}
      {report.defects.length > 0 && (
        <div className="mt-2">
          <span className="font-semibold text-gray-700">Defects:</span>
          <ul className="mt-1 space-y-0.5">
            {report.defects.map((d, i) => (
              <li key={i} className="flex items-center gap-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${SEVERITY_COLOR[d.severity] ?? "bg-gray-400"}`} />
                <strong>{d.defect_type}</strong>
                <span className="text-gray-500">({d.severity})</span>
                <span>— {d.location}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Route suggestion */}
      {report.recommended_route && (
        <div className="mt-2.5 p-2 bg-gray-50 border-l-3 border-amzn-orange rounded-sm">
          <span className="font-semibold text-gray-700">Suggested route: </span>
          <strong>{report.recommended_route.replace(/_/g, " ")}</strong>
          <div className="text-[12px] text-gray-500 mt-0.5">{report.routing_reason}</div>
        </div>
      )}

      {/* Rekognition labels */}
      {report.rekognition_labels.length > 0 && (
        <div className="mt-1.5 text-[11px] text-gray-400">
          Labels: {report.rekognition_labels.join(", ")}
        </div>
      )}
    </div>
  );
}
