import React, { useState, useEffect } from 'react';
import { ArrowRight, MapPin, TrendingUp, RefreshCw, PackageCheck } from 'lucide-react';
import { getDeals, advanceRing } from '../lib/api';
import type { DealItem } from '../lib/types';
import type { AdvanceRingResult } from '../lib/api';

interface SimulationViewProps {
  onGoHome: () => void;
}

export default function SimulationView({ onGoHome }: SimulationViewProps) {
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<DealItem | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [history, setHistory] = useState<AdvanceRingResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDeals()
      .then((data) => setDeals(data.deals))
      .catch((err) => setError(err.message));
  }, []);

  const handleAdvance = async () => {
    if (!selectedDeal) return;
    setAdvancing(true);
    setError(null);
    try {
      const category = guessCategory(selectedDeal.product_name || '');
      const result = await advanceRing(selectedDeal.item_id, category);
      setHistory((prev) => [...prev, result]);

      // Update the selected deal's display values
      setSelectedDeal({
        ...selectedDeal,
        ring_index: result.ring_index,
        current_sale_price_inr: result.sale_price_inr,
        radius_km: result.radius_km,
        discount_pct: result.discount_pct,
        current_hub_id: result.hub_id,
        current_hub_name: result.hub_name,
        status: result.reached_rc ? 'expired' : 'active',
      });

      // Also update the deals list
      setDeals((prev) =>
        prev.map((d) =>
          d.item_id === selectedDeal.item_id
            ? {
                ...d,
                ring_index: result.ring_index,
                current_sale_price_inr: result.sale_price_inr,
                radius_km: result.radius_km,
                discount_pct: result.discount_pct,
                current_hub_id: result.hub_id,
                current_hub_name: result.hub_name,
                status: result.reached_rc ? 'expired' : 'active',
              }
            : d
        )
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 select-none">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Float Simulation</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manually advance items through checkpoints. Watch price rise and radius shrink in real time.
          </p>
        </div>
        <button
          onClick={onGoHome}
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold px-4 py-2 rounded border cursor-pointer"
        >
          ← Back
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 text-xs p-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: deal selector */}
        <div className="md:col-span-1 border rounded-lg bg-white p-4 max-h-[70vh] overflow-y-auto">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Active Listings</h3>
          {deals.filter(d => d.status === 'active').length === 0 && (
            <p className="text-xs text-gray-400">No active listings. Initiate a return first.</p>
          )}
          {deals.filter(d => d.status === 'active').map((deal) => (
            <div
              key={deal.listing_id}
              onClick={() => { setSelectedDeal(deal); setHistory([]); }}
              className={`p-3 mb-2 border rounded cursor-pointer transition-all text-left ${
                selectedDeal?.listing_id === deal.listing_id
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <p className="text-xs font-bold text-gray-900 truncate">{deal.product_name || deal.item_id}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Ring {deal.ring_index} · ₹{Math.round(deal.current_sale_price_inr)} · {deal.discount_pct.toFixed(0)}% off
              </p>
              <p className="text-[10px] text-gray-400">
                <MapPin className="w-3 h-3 inline" /> {deal.current_hub_name || deal.current_hub_id} · {deal.radius_km.toFixed(0)}km
              </p>
            </div>
          ))}
        </div>

        {/* Right: simulation panel */}
        <div className="md:col-span-2">
          {!selectedDeal ? (
            <div className="border rounded-lg bg-white p-12 text-center">
              <PackageCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Select a listing from the left to simulate its journey.</p>
            </div>
          ) : (
            <div className="border rounded-lg bg-white p-6">
              <div className="flex items-center justify-between mb-4 border-b pb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{selectedDeal.product_name || selectedDeal.item_id}</h2>
                  <p className="text-xs text-gray-500">
                    MRP ₹{Math.round(selectedDeal.original_price_inr)} · Item ID: {selectedDeal.item_id}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  selectedDeal.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {selectedDeal.status === 'active' ? 'Active' : 'Reached RC'}
                </span>
              </div>

              {/* Current state */}
              <div className="grid grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded border">
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Ring</p>
                  <p className="text-lg font-black text-gray-900">{selectedDeal.ring_index}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Price</p>
                  <p className="text-lg font-black text-emerald-600">₹{Math.round(selectedDeal.current_sale_price_inr)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Discount</p>
                  <p className="text-lg font-black text-red-600">{selectedDeal.discount_pct.toFixed(0)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Radius</p>
                  <p className="text-lg font-black text-blue-600">{selectedDeal.radius_km.toFixed(0)} km</p>
                </div>
              </div>

              {/* Hub info */}
              <div className="flex items-center gap-2 mb-4 text-xs text-gray-600">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span className="font-semibold">{selectedDeal.current_hub_name || selectedDeal.current_hub_id}</span>
                <ArrowRight className="w-3 h-3 text-gray-400" />
                <span className="text-gray-400">Return Center (Bhiwandi)</span>
              </div>

              {/* Advance button */}
              <button
                onClick={handleAdvance}
                disabled={advancing || selectedDeal.status !== 'active'}
                className={`w-full py-3 text-sm font-bold rounded border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  selectedDeal.status !== 'active'
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white border-orange-600 active:scale-98'
                }`}
              >
                {advancing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Advancing...</span>
                  </>
                ) : selectedDeal.status !== 'active' ? (
                  <span>Item reached Return Center — no more advances</span>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>Advance to Next Checkpoint</span>
                  </>
                )}
              </button>

              {/* History log */}
              {history.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Advancement History</h4>
                  <div className="space-y-2">
                    {history.map((h, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-2.5 rounded border text-xs">
                        <div className="flex items-center gap-2">
                          <span className="bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                            Ring {h.ring_index}
                          </span>
                          <span className="text-gray-700 font-medium">{h.hub_name || h.hub_id}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                          <span>₹{Math.round(h.sale_price_inr)}</span>
                          <span className="text-red-600 font-bold">{h.discount_pct.toFixed(0)}% off</span>
                          <span className="text-blue-600">{h.radius_km.toFixed(0)}km</span>
                          {h.reached_rc && <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">RC</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function guessCategory(name: string): string {
  const n = (name || '').toLowerCase();
  if (/(shoe|sneaker|sandal|flip|crocs|clog|jordan|adidas|nike|puma|bata|sparx)/.test(n)) return 'footwear';
  if (/(monitor|earbud|headphone|watch|power bank|hub|case|tv|laptop|phone|jbl|samsung|mi )/.test(n)) return 'electronics';
  if (/(jean|shirt|blazer|bra|t-shirt|sunglass|ray-ban|levi|jockey|allen|peter)/.test(n)) return 'clothing';
  if (/(fryer|mixer|tawa|flask|heater|cushion|philips air|prestige|wonderchef|milton|bajaj|fabindia)/.test(n)) return 'home_goods';
  if (/(stroller|walker|carrier|lotion|diaper|baby|pampers|luvlap|mamaearth|mee mee|fisher)/.test(n)) return 'baby_products';
  return 'electronics';
}
