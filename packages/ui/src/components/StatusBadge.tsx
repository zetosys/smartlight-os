import React from 'react';

export type StatusType = 'online' | 'offline' | 'warning' | 'critical' | 'queued' | 'confirmed';

export interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = '' }) => {
  const norm = status.toLowerCase();
  let colorStyles = 'bg-slate-500/10 text-slate-400 border-slate-500/20';

  if (norm === 'online' || norm === 'confirmed' || norm === 'healthy' || norm === 'up') {
    colorStyles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  } else if (norm === 'offline' || norm === 'failed' || norm === 'unhealthy' || norm === 'down' || norm === 'critical') {
    colorStyles = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  } else if (norm === 'warning' || norm === 'queued' || norm === 'sent' || norm === 'acknowledged' || norm === 'timed_out' || norm === 'degraded') {
    colorStyles = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorStyles} ${className}`}
    >
      {label || status.toUpperCase()}
    </span>
  );
};
