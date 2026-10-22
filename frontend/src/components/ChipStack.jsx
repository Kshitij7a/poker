import React from 'react';

/**
 * Visual casino poker chip badge or stack representation
 */
export function ChipBadge({ amount, size = 'md' }) {
  // Determine color theme based on chip denomination magnitude
  let chipColor = 'from-emerald-600 to-emerald-800 border-emerald-400 text-emerald-100'; // Default Green
  if (amount >= 5000) {
    chipColor = 'from-amber-500 to-amber-700 border-amber-300 text-amber-100 shadow-glow-gold'; // Gold
  } else if (amount >= 1000) {
    chipColor = 'from-purple-600 to-purple-800 border-purple-400 text-purple-100'; // Purple
  } else if (amount >= 500) {
    chipColor = 'from-slate-800 to-black border-slate-400 text-white'; // Black
  } else if (amount >= 100) {
    chipColor = 'from-blue-600 to-blue-800 border-blue-400 text-blue-100'; // Blue
  } else if (amount >= 25) {
    chipColor = 'from-red-600 to-red-800 border-red-400 text-red-100'; // Red
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3.5 py-1.5 font-bold',
  }[size] || 'text-sm px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono bg-gradient-to-b border ${chipColor} ${sizeClasses} shadow-md`}
    >
      <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse-subtle inline-block" />
      <span>${Number(amount).toLocaleString()}</span>
    </span>
  );
}

export function DealerButton({ role }) {
  if (!role) return null;

  if (role === 'D') {
    return (
      <span
        title="Dealer Button"
        className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center border-2 border-amber-100 shadow-lg shadow-amber-500/40 select-none animate-bounce"
        style={{ animationDuration: '3s' }}
      >
        D
      </span>
    );
  }
  if (role === 'SB') {
    return (
      <span
        title="Small Blind"
        className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-blue-200 shadow-md select-none"
      >
        SB
      </span>
    );
  }
  if (role === 'BB') {
    return (
      <span
        title="Big Blind"
        className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center border-2 border-purple-200 shadow-md select-none"
      >
        BB
      </span>
    );
  }
  return null;
}
