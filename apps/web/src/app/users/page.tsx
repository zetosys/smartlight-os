'use client';

import React from 'react';
import { useUlb, SEED_ACCOUNTS } from '../../components/context/UlbContext';
import { Users, Shield, Lock } from 'lucide-react';
import { SimulatedBadge } from '@smartlight/ui';

export default function UsersPage() {
  const { selectedUlb } = useUlb();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            Identity, Access &amp; RBAC Matrix
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Multi-ULB Scoped
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Server-enforced role assignments, granular permission codes, and tenant boundaries.
          </p>
        </div>
        <SimulatedBadge />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2 text-sm font-semibold text-white">
          <Users className="w-4 h-4 text-amber-400" />
          Seeded Enterprise Accounts &amp; ULB Scope
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Assigned ULB Scope</th>
                <th className="px-4 py-3">Authorization Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {SEED_ACCOUNTS.map((acc) => (
                <tr key={acc.email} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <div className="font-bold text-white font-sans">{acc.name}</div>
                    <div className="text-[11px] text-slate-400">{acc.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      {acc.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {acc.isGlobalAdmin || acc.allowedUlbIds.includes('*') ? (
                      <span className="text-emerald-400 font-semibold font-sans">
                        Global (All ULBs)
                      </span>
                    ) : (
                      <span>
                        {acc.allowedUlbIds[0] === '11111111-1111-1111-1111-111111111111'
                          ? 'Ganderbal Only'
                          : 'Katra Only'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-sans text-[11px]">
                    {acc.isGlobalAdmin
                      ? 'Full System Administration'
                      : acc.role === 'CONTROL_OPERATOR'
                      ? 'Switching & Live Control'
                      : acc.role === 'TECHNICIAN'
                      ? 'Field Ticket Resolution'
                      : 'Audit & Reporting Read-Only'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
