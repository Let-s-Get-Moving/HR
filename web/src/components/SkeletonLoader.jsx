import React from "react";

// Skeleton loader for cards
export const CardSkeleton = ({ className = "" }) => (
  <div className={`card p-6 animate-pulse ${className}`}>
    <div className="space-y-4">
      <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
      <div className="h-8 bg-neutral-700 rounded w-1/2"></div>
      <div className="h-3 bg-neutral-700 rounded w-1/4"></div>
    </div>
  </div>
);

// Skeleton loader for metric cards
export const MetricCardSkeleton = () => (
  <div className="card p-6 animate-pulse">
    <div className="flex items-center justify-between mb-3">
      <div className="h-4 bg-neutral-700 rounded w-2/3"></div>
      <div className="h-6 w-6 bg-neutral-700 rounded"></div>
    </div>
    <div className="h-8 bg-neutral-700 rounded w-1/2 mb-2"></div>
    <div className="h-4 bg-neutral-700 rounded w-1/4"></div>
  </div>
);

// Skeleton loader for tables
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="card overflow-hidden animate-pulse">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-neutral-800">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-6 py-4">
                <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <div className="h-4 bg-neutral-700 rounded w-2/3"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Skeleton loader for lists
export const ListSkeleton = ({ items = 3 }) => (
  <div className="space-y-4 animate-pulse">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="card p-4">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 bg-neutral-700 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-neutral-700 rounded w-1/4"></div>
            <div className="h-3 bg-neutral-700 rounded w-1/2"></div>
          </div>
          <div className="h-6 bg-neutral-700 rounded w-16"></div>
        </div>
      </div>
    ))}
  </div>
);

// Skeleton loader for charts
export const ChartSkeleton = () => (
  <div className="card p-6 animate-pulse">
    <div className="h-4 bg-neutral-700 rounded w-1/3 mb-4"></div>
    <div className="h-64 bg-neutral-700 rounded"></div>
  </div>
);

// Skeleton loader for forms
export const FormSkeleton = ({ fields = 4 }) => (
  <div className="card p-6 animate-pulse">
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-neutral-700 rounded w-1/4"></div>
          <div className="h-10 bg-neutral-700 rounded"></div>
        </div>
      ))}
      <div className="flex justify-end space-x-3">
        <div className="h-10 bg-neutral-700 rounded w-20"></div>
        <div className="h-10 bg-neutral-700 rounded w-24"></div>
      </div>
    </div>
  </div>
);

// Loading spinner component
export const LoadingSpinner = ({ size = "md", text = "Loading..." }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12",
    xl: "h-16 w-16"
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className={`animate-spin rounded-full border-b-2 border-indigo-500 ${sizeClasses[size]}`}></div>
      {text && <div className="text-sm text-neutral-400">{text}</div>}
    </div>
  );
};

// Progress bar component
export const ProgressBar = ({ progress = 0, text = "", className = "" }) => (
  <div className={`w-full ${className}`}>
    {text && <div className="text-sm text-neutral-400 mb-2">{text}</div>}
    <div className="w-full bg-neutral-700 rounded-full h-2">
      <div 
        className="bg-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      ></div>
    </div>
    <div className="text-xs text-neutral-500 mt-1">{Math.round(progress)}%</div>
  </div>
);

export default CardSkeleton;
