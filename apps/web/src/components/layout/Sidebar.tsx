'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  Layers,
  Cpu,
  Power,
  Calendar,
  AlertTriangle,
  Wrench,
  BarChart3,
  FileText,
  FlaskConical,
  Users,
  Settings,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'GIS Asset Map', href: '/gis', icon: Map },
  { label: 'Asset Explorer', href: '/assets', icon: Layers },
  { label: 'Device Registry', href: '/devices', icon: Cpu },
  { label: 'Control Console', href: '/controls', icon: Power },
  { label: 'Scheduling', href: '/scheduling', icon: Calendar },
  { label: 'Alerts Queue', href: '/alerts', icon: AlertTriangle, badge: '1' },
  { label: 'Maintenance', href: '/maintenance', icon: Wrench, badge: '1' },
  { label: 'Energy & Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Reports & Audit', href: '/reports', icon: FileText },
  { label: 'Simulator Lab', href: '/simulator', icon: FlaskConical, badge: 'SIM' },
  { label: 'Users & Roles', href: '/users', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 select-none">
      <div className="p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">
          Operations Management
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                    item.badge === 'SIM'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 space-y-1">
        <div className="flex justify-between">
          <span>Tender Reference:</span>
          <span className="font-mono text-slate-300">NIT-SLMCS-2026</span>
        </div>
        <div className="flex justify-between">
          <span>Target Fleet:</span>
          <span className="font-mono text-amber-400 font-medium">4,608 Lights</span>
        </div>
        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 text-center">
          Prototype Verification Phase
        </div>
      </div>
    </aside>
  );
};
