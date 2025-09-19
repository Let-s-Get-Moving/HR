import React from "react";

export default function MetricCard({ label, value, sub, icon, trend, trendUp }) {
  return (
    <div className="card p-6 hover:shadow-lg transition-all duration-300 border border-neutral-700 hover:border-indigo-500/50">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-neutral-400 font-medium">{label}</div>
        {icon && <div className="text-2xl">{icon}</div>}
      </div>
      <div className="text-3xl font-bold text-white mb-2">{value}</div>
      {trend && (
        <div className={`flex items-center text-sm ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
          <svg className={`w-4 h-4 mr-1 ${trendUp ? 'rotate-0' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          {trend}
        </div>
      )}
      {sub && <div className="mt-1 text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}
