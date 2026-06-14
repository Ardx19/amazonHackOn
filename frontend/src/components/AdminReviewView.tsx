// src/components/AdminReviewView.tsx
// Internal ops view — review queue for confidence-gated C2C listings.
// Accessible via subtle "Admin" link in Header. No auth for demo.

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { fetchReviewQueue, submitReviewDecision } from '../lib/api';

export default function AdminReviewView() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const loadQueue = () => {
    setLoading(true);
    fetchReviewQueue()
      .then(setItems)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadQueue(); }, []);

  const handleDecision = async (cardUuid: string, decision: string) => {
    setActing(cardUuid);
    try {
      await submitReviewDecision(cardUuid, decision);
      setItems(prev => prev.filter(i => i.card_uuid !== cardUuid));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="min-h-screen bg-amzn-bg p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Review Queue <span className="text-amzn-orange text-lg">(Admin)</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Items where AI confidence fell below 85% threshold — requires human decision.
            </p>
          </div>
          <button
            onClick={loadQueue}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white border-2 border-black px-3 py-2 text-xs font-bold hover:bg-gray-50 transition-colors shadow-[2px_2px_0px_#000]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-400 p-3 text-xs text-red-800 mb-4">{error}</div>
        )}

        {loading ? (
          <div className="bg-white border-3 border-black p-12 text-center text-gray-500 font-mono font-bold flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading review queue...
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border-3 border-black p-12 text-center text-gray-500 font-mono font-bold">
            No items pending review.
          </div>
        ) : (
          <div className="bg-white border-3 border-black overflow-hidden shadow-[4px_4px_0px_#000]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100 border-b-3 border-black text-left font-black text-gray-700 uppercase tracking-wider">
                  <th className="p-3">Product</th>
                  <th className="p-3">Seller</th>
                  <th className="p-3">Trust</th>
                  <th className="p-3">Confidence</th>
                  <th className="p-3">Condition</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Declaration</th>
                  <th className="p-3 text-center w-[160px]">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.card_uuid} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-bold text-black">{item.item_id}</td>
                    <td className="p-3">
                      <div className="font-semibold">{item.seller_name}</div>
                      <div className="text-[10px] text-gray-400">{item.seller_city}</div>
                    </td>
                    <td className="p-3">
                      {item.seller_trust_score != null ? (
                        <span className="flex items-center gap-0.5">
                          <span className="text-amber-500 text-[10px]">⭐</span>
                          <span className="font-bold">{item.seller_trust_score}</span>
                          <span className="text-[10px] text-gray-400">({item.seller_trust_count})</span>
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1 py-0.5 border border-amber-400">NEW</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full">
                          <div
                            className={`h-full rounded-full ${(item.confidence * 100) < 70 ? 'bg-red-500' : (item.confidence * 100) < 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.round(item.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-[11px]">{(item.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="p-3 font-bold">{item.condition_grade}</td>
                    <td className="p-3 text-[10px] text-gray-600 max-w-[200px] truncate">{item.review_reason}</td>
                    <td className="p-3 text-[10px] text-gray-500 font-mono">
                      {item.declaration_timestamp ? new Date(item.declaration_timestamp).toLocaleString('en-IN') : 'N/A'}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1.5 justify-center">
                        <button
                          onClick={() => handleDecision(item.card_uuid, 'approved')}
                          disabled={acting === item.card_uuid}
                          className="flex items-center gap-1 bg-emerald-500 border-2 border-black text-white text-[10px] font-bold px-2.5 py-1.5 hover:bg-emerald-600 disabled:opacity-40 shadow-[2px_2px_0px_#000] transition-colors"
                        >
                          {acting === item.card_uuid ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleDecision(item.card_uuid, 'rejected')}
                          disabled={acting === item.card_uuid}
                          className="flex items-center gap-1 bg-red-500 border-2 border-black text-white text-[10px] font-bold px-2.5 py-1.5 hover:bg-red-600 disabled:opacity-40 shadow-[2px_2px_0px_#000] transition-colors"
                        >
                          {acting === item.card_uuid ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-[10px] text-gray-400 font-mono text-right">
          Admin Review Queue · Amazon ReRoute v3 · Demo Only (no auth)
        </div>
      </div>
    </div>
  );
}
