'use client';

import React from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { SimulatedBadge } from '@smartlight/ui';
import { FileText, Download, ShieldCheck } from 'lucide-react';

export default function ReportsPage() {
  const { selectedUlb } = useUlb();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            Operational &amp; Compliance Reports
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedUlb?.name}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Scheduled energy billing verification, SLA uptime proofs, and municipal compliance exports.
          </p>
        </div>
        <SimulatedBadge />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-400" />
          Standard Export Formats
        </h2>

        <div className="space-y-3 text-xs">
          {[
            {
              title: 'Monthly Energy & Burning Hours Audit',
              desc: 'Calculated luminaire consumption segregated by 35W, 70W, 110W tiers.',
              format: 'CSV / PDF',
            },
            {
              title: 'System Uptime & SLA Compliance (Tender Traceability)',
              desc: 'Monthly network uptime calculations with outage deduction analysis.',
              format: 'PDF',
            },
            {
              title: 'Command Execution & Audit Trail Log',
              desc: 'Immutable record of every operator command, timestamp, and adapter dispatch.',
              format: 'CSV / JSON',
            },
          ].map((r, i) => (
            <div
              key={i}
              className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between gap-4"
            >
              <div>
                <div className="font-semibold text-white">{r.title}</div>
                <div className="text-slate-400 text-[11px] mt-0.5">{r.desc}</div>
              </div>
              <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1.5 font-mono text-[11px]">
                <Download className="w-3.5 h-3.5 text-amber-400" />
                Export {r.format}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
