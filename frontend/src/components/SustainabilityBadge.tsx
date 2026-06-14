import { Leaf } from 'lucide-react';

export default function SustainabilityBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[9px] font-black px-2 py-0.5 uppercase tracking-wider font-mono"
      title="Buying second-life products saves CO₂ emissions"
    >
      <Leaf className="w-3 h-3" />
      Eco Choice
    </span>
  );
}
