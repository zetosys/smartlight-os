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
  Sparkles,
  X,
  Lock,
} from 'lucide-react';
import { useUlb } from '../context/UlbContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Role Portals', href: '/portal', icon: Sparkles, badge: 'RBAC', badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  { label: 'Fleet Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'GIS Asset Map', href: '/gis', icon: Map },
  { label: 'Geographic Hierarchy', href: '/assets', icon: Layers },
  { label: 'Device Registry', href: '/devices', icon: Cpu },
  { label: 'Control Console', href: '/controls', icon: Power },
  { label: 'Astronomical Schedules', href: '/scheduling', icon: Calendar },
  { label: 'Alerts Queue', href: '/alerts', icon: AlertTriangle, badge: '1', badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' },
  { label: 'Work Orders & Spares', href: '/maintenance', icon: Wrench, badge: '1', badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  { label: 'Energy & Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Compliance Reports', href: '/reports', icon: FileText },
  { label: 'Simulator Lab', href: '/simulator', icon: FlaskConical, badge: 'SIM', badgeColor: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
  { label: 'Users & Roles', href: '/users', icon: Users },
  { label: 'System Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const pathname = usePathname();
  const { currentUser } = useUlb();
  const isReportsViewer = currentUser?.role === 'REPORTS_VIEWER';
  const MUTATING_ROUTES = ['/controls', '/scheduling', '/simulator', '/users', '/maintenance', '/settings'];

  // Only close sidebar on link click if on mobile screens (< 768px)
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isReportsViewer && MUTATING_ROUTES.includes(href)) {
      e.preventDefault();
      alert("🔒 Access Restricted: The REPORTS_VIEWER role has strictly read-only reporting access. Operational controls and mutations are blocked under RBAC policy.");
      return;
    }
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      onClose?.();
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none transition-all duration-200 z-40 ${
          // Mobile: sliding drawer (fixed)
          // Desktop: sticky pinned sidebar (height = full viewport minus header)
          isOpen
            ? 'fixed inset-y-0 left-0 w-64 shadow-2xl md:shadow-none md:static md:sticky md:top-16 md:h-[calc(100vh-4rem)]'
            : 'hidden md:flex md:w-16 md:sticky md:top-16 md:h-[calc(100vh-4rem)]'
        }`}
      >
        {/* Navigation Items Scroll Area */}
        <div className="p-3 space-y-1 overflow-y-auto flex-1">
          {/* Mobile Drawer Header with Close Button */}
          <div className="flex items-center justify-between px-2 py-2 mb-2 border-b border-slate-800 md:hidden">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center font-bold text-slate-950 text-xs">
                SL
              </div>
              <span className="text-xs font-bold text-white tracking-wide">SmartLight OS</span>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Close navigation menu"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Section Header (Full Mode Only) */}
          {isOpen && (
            <div className="px-3 py-1.5 flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold hidden md:flex">
              <span>{isReportsViewer ? 'Reports & SLA Hub' : 'Operations Management'}</span>
              {isReportsViewer && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono font-bold">
                  READ-ONLY
                </span>
              )}
            </div>
          )}

          {/* Nav Items List */}
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');
            const Icon = item.icon;
            const isLocked = isReportsViewer && MUTATING_ROUTES.includes(item.href);

            let displayBadge = item.badge;
            let displayBadgeColor = item.badgeColor;

            if (isReportsViewer) {
              if (isLocked) {
                displayBadge = 'LOCK';
                displayBadgeColor = 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
              } else if (item.href === '/reports') {
                displayBadge = 'PRIMARY';
                displayBadgeColor = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold';
              } else if (item.href === '/portal') {
                displayBadge = 'REPORTS';
                displayBadgeColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold';
              }
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleLinkClick(e, item.href)}
                className={`flex items-center ${
                  isOpen ? 'justify-between px-3 py-2.5' : 'justify-center p-2.5'
                } rounded-lg text-xs font-medium transition-all group relative ${
                  isLocked
                    ? 'opacity-40 hover:opacity-75 cursor-not-allowed text-slate-400 hover:bg-slate-800/40'
                    : isActive
                    ? 'bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                }`}
              >
                <div className={`flex items-center ${isOpen ? 'gap-3 min-w-0' : 'justify-center'}`}>
                  {isLocked ? (
                    <Lock className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-rose-400" />
                  ) : (
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                  )}
                  {isOpen && (
                    <span className={`truncate ${isLocked ? 'text-slate-400 group-hover:text-slate-300' : ''}`}>
                      {item.label}
                    </span>
                  )}
                </div>

                {/* Badge in Open Mode */}
                {isOpen && displayBadge && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-mono rounded font-semibold shrink-0 ml-2 ${
                      displayBadgeColor || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {displayBadge}
                  </span>
                )}

                {/* Tooltip on Hover in Compact (w-16) Mode */}
                {!isOpen && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-700 text-xs font-medium text-white whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 flex items-center gap-2">
                    <span>{item.label}</span>
                    {displayBadge && (
                      <span className={`px-1 py-0.2 text-[9px] font-mono rounded ${displayBadgeColor || 'bg-slate-800'}`}>
                        {displayBadge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer Info Area */}
        {isOpen ? (
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between items-center">
              <span>Tender Reference:</span>
              <span className="font-mono text-slate-300 font-semibold">NIT-SLMCS-2026</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Target Fleet:</span>
              <span className="font-mono text-amber-400 font-bold">4,608 Lights</span>
            </div>
            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 flex items-center justify-between font-mono">
              <span>MeitY MeghRaj Cloud</span>
              <span className="text-emerald-400 font-semibold">Sovereign</span>
            </div>
          </div>
        ) : (
          <div className="p-2 border-t border-slate-800/80 bg-slate-950/60 text-center">
            <span className="text-[10px] font-mono text-amber-400 font-bold block" title="4,608 Streetlights Under Management">
              4.6K
            </span>
          </div>
        )}
      </aside>
    </>
  );
};
