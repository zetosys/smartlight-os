'use client';

import React, { useState, useEffect } from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { SimulatedBadge, StatusBadge } from '@smartlight/ui';
import { Wrench, User, Calendar, CheckSquare } from 'lucide-react';

export default function MaintenancePage() {
  const { selectedUlb } = useUlb();
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await ApiClient.fetch<any[]>(`tickets?ulbId=${selectedUlb?.id || ''}`);
        setTickets(data || []);
      } catch {
        setTickets([
          {
            id: 'd0000000-0000-0000-0000-000000000001',
            title: `Check feeder line at ${selectedUlb?.code === 'ULB-GBL' ? 'Beehama Ward 1' : 'Banganga Ward 1'}`,
            description: 'Verify optical isolation and controller power input',
            priority: 'MEDIUM',
            status: 'OPEN',
            assigned_to: 'Mohammad Iqbal (Field Tech)',
            created_at: new Date().toISOString(),
          },
        ]);
      }
    };
    fetchTickets();
  }, [selectedUlb]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            Field Maintenance &amp; Work Orders
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedUlb?.name}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dispatch, assignment, and resolution tracking for municipal maintenance crews.
          </p>
        </div>
        <SimulatedBadge />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['OPEN', 'IN_PROGRESS', 'RESOLVED'].map((colStatus) => {
          const colTickets = tickets.filter(
            (t) => (t.status === colStatus) || (colStatus === 'OPEN' && !t.status),
          );

          return (
            <div key={colStatus} className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-mono">
                <span className="font-bold text-slate-300">{colStatus}</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {colTickets.length}
                </span>
              </div>

              <div className="space-y-3">
                {colTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded text-xs space-y-2"
                  >
                    <div className="font-semibold text-white">{t.title}</div>
                    <div className="text-slate-400 text-[11px] leading-relaxed">
                      {t.description}
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-amber-400" />
                        {t.assigned_to || 'Unassigned'}
                      </span>
                      <span className="text-amber-400">{t.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
