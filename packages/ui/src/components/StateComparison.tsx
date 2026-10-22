import React from 'react';

export interface StateComparisonProps {
  desiredOn?: boolean | null;
  reportedOn?: boolean | null;
  className?: string;
}

export const StateComparison: React.FC<StateComparisonProps> = ({
  desiredOn,
  reportedOn,
  className = '',
}) => {
  const isSync = desiredOn === reportedOn;

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <div className="flex items-center gap-1">
        <span className="text-slate-400">Desired:</span>
        <span className={`font-semibold ${desiredOn ? 'text-amber-400' : 'text-slate-400'}`}>
          {desiredOn === undefined || desiredOn === null ? '—' : desiredOn ? 'ON' : 'OFF'}
        </span>
      </div>
      <span className="text-slate-600">/</span>
      <div className="flex items-center gap-1">
        <span className="text-slate-400">Reported:</span>
        <span className={`font-semibold ${reportedOn ? 'text-emerald-400' : 'text-slate-400'}`}>
          {reportedOn === undefined || reportedOn === null ? '—' : reportedOn ? 'ON' : 'OFF'}
        </span>
      </div>
      {!isSync && (
        <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[10px] uppercase font-mono">
          Pending Sync
        </span>
      )}
    </div>
  );
};
