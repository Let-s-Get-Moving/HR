import React from "react";
export default function Donut({ size=120, stroke=16, segments }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}/>
      {segments.map((s, i) => {
        const len = (s.value * circumference);
        const el = (
          <circle key={i}
            cx={size/2} cy={size/2} r={radius} fill="none"
            stroke={s.color}
            strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${len} ${circumference - len}`}
            strokeDashoffset={-offset}
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}
