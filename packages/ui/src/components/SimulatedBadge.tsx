import React from 'react';

export interface SimulatedBadgeProps {
  className?: string;
}

export const SimulatedBadge: React.FC<SimulatedBadgeProps> = ({ className = '' }) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide bg-amber-500/10 text-amber-500 border border-amber-500/30 ${className}`}
      title="Hardware-simulated telemetry. Not actual field hardware."
    >
      <span className="w-1.5 h-1.5 mr-1 rounded-full bg-amber-500 animate-pulse" />
      SIMULATED
    </span>
  );
};
