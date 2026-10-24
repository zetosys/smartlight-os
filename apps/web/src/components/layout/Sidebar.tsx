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
  X,
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

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 select-none transition-all duration-200 z-30 ${
          isOpen
            ? 'w-64 fixed inset-y-16 left-0 md:static'
            : 'hidden md:flex md:w-16'
        }`}
      >
        <div className="p-2.5 sm:p-3 space-y-1 overflow-y-auto">
          {/* Header Row on Mobile with Close Button */}
          <div className="flex items-center justify-between px-2 py-1.5 md:hidden">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">
              Navigation
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Close Sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {isOpen && (
            <div className="px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold hidden md:block">
              Operations Management
            </div>
          )}

          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                title={!isOpen ? item.label : undefined}
                className={`flex items-center ${
                  isOpen ? 'justify-between px-3 py-2' : 'justify-center p-2.5'
                } rounded-lg text-xs font-medium transition-colors group relative ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <div className={`flex items-center ${isOpen ? 'gap-2.5' : 'justify-center'}`}>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  {isOpen && <span className="truncate">{item.label}</span>}
                </div>

                {/* Badge */}
                {item.badge && (
                  <span
                    className={`${
                      isOpen
                        ? 'px-1.5 py-0.5 text-[10px] font-mono rounded'
                        : 'absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2 ring-slate-900'
                    } ${
                      item.badge === 'SIM'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-rose-500 text-white md:bg-rose-500/20 md:text-rose-400'
                    }`}
                  >
                    {isOpen ? item.badge : ''}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer Info */}
        {isOpen ? (
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Tender Reference:</span>
              <span className="font-mono text-slate-300">NIT-SLMCS-2026</span>
            </div>
            <div className="flex justify-between">
              <span>Target Fleet:</span>
              <span className="font-mono text-amber-400 font-medium">4,608 Lights</span>
            </div>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60 text-center font-mono">
              MeitY MeghRaj Sovereign
            </div>
          </div>
        ) : (
          <div className="p-2 border-t border-slate-800/80 bg-slate-950/40 text-center">
            <span className="text-[10px] font-mono text-amber-400 font-bold">4.6K</span>
          </div>
        )}
      </aside>
    </>
  );
};
