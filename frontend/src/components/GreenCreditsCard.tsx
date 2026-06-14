import { motion } from 'motion/react';
import { Sprout } from 'lucide-react';

interface GreenCreditsCardProps {
  weightKg?: number;
  className?: string;
}

export default function GreenCreditsCard({ weightKg = 0.5, className = '' }: GreenCreditsCardProps) {
  const carbonSaved = weightKg * 2.5;
  const greenCredits = Math.floor(carbonSaved * 10);

  const badgeTier = greenCredits >= 50 ? 'Eco Champion' : greenCredits >= 20 ? 'Green Saver' : 'Climate Conscious';
  const badgeColor =
    greenCredits >= 50
      ? 'bg-emerald-600 border-emerald-800'
      : greenCredits >= 20
        ? 'bg-green-600 border-green-800'
        : 'bg-teal-600 border-teal-800';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-gradient-to-br from-emerald-50 to-green-100 border-3 border-emerald-400 rounded-sm p-5 shadow-[4px_4px_0px_rgba(16,185,129,0.25)] ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="bg-emerald-500 p-2 border-2 border-emerald-700 shrink-0">
          <Sprout className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black text-emerald-800 uppercase tracking-wide">
            You earned {greenCredits} Green Credits
          </h3>
          <p className="text-xs text-emerald-700 font-medium mt-1">
            You saved {carbonSaved.toFixed(1)}kg of CO₂ by choosing a second-life product
          </p>
          <span
            className={`inline-block mt-2 text-[10px] font-black text-white px-2.5 py-0.5 uppercase tracking-wider border ${badgeColor}`}
          >
            {badgeTier}
          </span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t-2 border-emerald-200/60 flex items-center gap-2 text-[10px] font-medium text-emerald-700">
        <Sprout className="w-3.5 h-3.5" />
        <span>Supporting Amazon&rsquo;s Climate Pledge</span>
      </div>
    </motion.div>
  );
}
