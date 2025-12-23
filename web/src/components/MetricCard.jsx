import React from "react";

export default function MetricCard({ label, value, sub, icon, trend, trendUp }) {
  return (
    <div className="p-6 rounded-tahoe border transition-all duration-tahoe hover:shadow-tahoe-md" 
         style={{ backgroundColor: 'rgba(22, 22, 24, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderColor: 'rgba(255, 255, 255, 0.12)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-tahoe-text-muted font-medium tracking-wide">{label}</div>
        {icon && <div className="text-2xl">{icon}</div>}
      </div>
      <div className="text-3xl font-semibold text-tahoe-text-primary mb-2">{value}</div>
      {trend && (
        <div className={`flex items-center text-sm ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
          <svg className={`w-4 h-4 mr-1 ${trendUp ? 'rotate-0' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          {trend}
        </div>
      )}
      {sub && <div className="mt-1 text-xs text-tahoe-text-muted">{sub}</div>}
    </div>
  );
}
