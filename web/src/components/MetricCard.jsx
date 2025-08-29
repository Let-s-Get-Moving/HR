import React from "react";

export default function MetricCard({ label, value, sub }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}
