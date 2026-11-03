'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useUlb, SEED_ACCOUNTS, INITIAL_ULBS } from '../context/UlbContext';
import { useTheme } from '../context/ThemeContext';
import {
  Building2,
  User,
  ChevronDown,
  Bell,
  PanelLeft,
  Check,
  ShieldCheck,
  KeyRound,
  Settings,
  Sparkles,
  MapPin,
  Clock,
  Sun,
  Moon,
} from 'lucide-react';

interface TopBarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar, isSidebarOpen = true }) => {
  const {
    selectedUlb,
    allUlbs,
    setSelectedUlbId,
    currentUser,
    setCurrentAccount,
  } = useUlb();
  const { resolvedTheme, toggleTheme } = useTheme();

  // Custom Dropdown Open States
  const [isUlbMenuOpen, setIsUlbMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const ulbMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ulbMenuRef.current && !ulbMenuRef.current.contains(e.target as Node)) {
        setIsUlbMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Live IST Clock
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' IST',
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const totalFleet = allUlbs.reduce((acc, u) => {
    if (u.fleetCount) return acc + u.fleetCount;
    if (u.code === 'ULB-GBL') return acc + 2740;
    if (u.code === 'ULB-KTR') return acc + 1868;
    return acc + 1200;
  }, 0);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'PLATFORM_ADMIN':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'CONTROL_OPERATOR':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'TECHNICIAN':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'AUDITOR':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Left Cluster: Sidebar Toggle, Brand, & Municipal Scope Switcher */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Sidebar Toggle Button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500"
            title={isSidebarOpen ? 'Collapse Navigation Sidebar' : 'Expand Navigation Sidebar'}
            aria-label="Toggle Navigation Sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}

        {/* Brand Identity */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-slate-950 text-sm shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            SL
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>SmartLight OS</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                SLMCS
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-wider uppercase -mt-0.5">
              Control Room System
            </div>
          </div>
        </Link>

        <div className="h-5 w-px bg-slate-800 hidden sm:block mx-1" />

        {/* Municipal Scope Selector Dropdown */}
        <div className="relative" ref={ulbMenuRef}>
          <button
            onClick={() => {
              setIsUlbMenuOpen(!isUlbMenuOpen);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-200 transition shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            title="Switch Municipal ULB Scope"
          >
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold max-w-[140px] md:max-w-[180px] truncate">
              {selectedUlb?.name.replace('Municipal Council', 'MC').replace('Municipal Committee', 'MC') || 'All ULBs'}
            </span>
            <span className="text-[10px] font-mono px-1 rounded bg-slate-700/80 text-slate-300">
              {selectedUlb?.code || 'ALL'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isUlbMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* ULB Popover Menu */}
          {isUlbMenuOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-2 py-1.5 text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold border-b border-slate-800 mb-1 flex items-center justify-between">
                <span>Select Municipal Jurisdiction</span>
                <span className="text-amber-400 font-bold">{totalFleet.toLocaleString('en-IN')} Fleet</span>
              </div>

              <div className="space-y-1">
                {allUlbs.map((ulb) => {
                  const isSelected = selectedUlb?.id === ulb.id;
                  const isGbl = ulb.code === 'ULB-GBL';
                  const isKtr = ulb.code === 'ULB-KTR';
                  const fleetCount = (
                    ulb.fleetCount ?? (isGbl ? 2740 : isKtr ? 1868 : 1200)
                  ).toLocaleString('en-IN');
                  const primaryCorridor = isGbl
                    ? 'NH-1D & Beehama'
                    : isKtr
                      ? 'Banganga Shrine Route'
                      : `${ulb.state || 'Jammu & Kashmir'} Sector`;

                  return (
                    <button
                      key={ulb.id}
                      onClick={() => {
                        setSelectedUlbId(ulb.id);
                        setIsUlbMenuOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 font-semibold'
                          : 'hover:bg-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <MapPin className={`w-4 h-4 mt-0.5 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-white">{ulb.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
                            <span>{ulb.code}</span>
                            <span>•</span>
                            <span>{primaryCorridor}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-[11px] text-amber-400">{fleetCount}</div>
                        <div className="text-[9px] text-slate-500">Luminaires</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 px-2 flex justify-between items-center font-mono">
                <span>Sovereign Region: J&amp;K, India</span>
                <span className="text-emerald-400 font-semibold">PostGIS 4326</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Cluster: Live IST Clock & Solar Phase (Desktop only) */}
      <div className="hidden lg:flex items-center gap-3 px-3 py-1 rounded-full bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-300">
        <Clock className="w-3.5 h-3.5 text-amber-400" />
        <span>{currentTime || 'IST Local Time'}</span>
        <span className="text-slate-700">|</span>
        <span className="text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Civil Twilight Engine Active
        </span>
      </div>

      {/* Right Cluster: Alerts, Theme Toggle & User Profile Dropdown */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Quick Alerts Bell with Live Counter */}
        <Link
          href="/alerts"
          className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Open Active System Alarms Queue"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
        </Link>

        {/* Light / Dark Theme Switcher Button */}
        <button
          type="button"
          onClick={() => {
            toggleTheme();
          }}
          className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500"
          title={resolvedTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label={resolvedTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-sky-400 transition-transform hover:-rotate-12" />
          )}
        </button>

        <div className="h-5 w-px bg-slate-800 mx-0.5" />

        {/* User Profile & Role Switcher Popover */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setIsUserMenuOpen(!isUserMenuOpen);
            }}
            className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs transition focus:outline-none focus:ring-1 focus:ring-amber-500"
            title="User Profile & Quick Account Switcher"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black text-xs flex items-center justify-center shadow-inner">
              {getInitials(currentUser.name)}
            </div>

            <div className="text-left hidden md:block">
              <div className="text-xs font-semibold text-slate-200 leading-tight">
                {currentUser.name.split(' ')[0]} {currentUser.name.split(' ')[1]?.[0] || ''}.
              </div>
              <div className="text-[10px] font-mono text-amber-400 leading-tight">
                {currentUser.role.replace('_', ' ')}
              </div>
            </div>

            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* User Popover Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* User Profile Header */}
              <div className="pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
                    {getInitials(currentUser.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-xs truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">{currentUser.email}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold border ${getRoleBadgeColor(currentUser.role)}`}>
                        {currentUser.role}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        2FA Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Switch Demo Account Section */}
              <div className="py-2">
                <div className="px-1 py-1 text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold flex items-center justify-between">
                  <span>Switch Role / Profile</span>
                  <span className="text-slate-500">Demo RBAC</span>
                </div>

                <div className="space-y-1 mt-1 max-h-48 overflow-y-auto pr-1">
                  {SEED_ACCOUNTS.map((acc) => {
                    const isCurrent = acc.email === currentUser.email;

                    return (
                      <button
                        key={acc.email}
                        onClick={() => {
                          setCurrentAccount(acc.email);
                          setIsUserMenuOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                          isCurrent
                            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="truncate">
                          <div className="truncate text-white font-medium">{acc.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{acc.role}</div>
                        </div>
                        {isCurrent && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Quick Links */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs gap-2">
                <Link
                  href="/portal"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                  }}
                  className="flex items-center gap-1 px-2 py-1.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-mono text-[11px] font-semibold transition"
                  title="Open dedicated operational portal for current role"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  My Portal
                </Link>

                <Link
                  href="/login"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                  }}
                  className="flex items-center gap-1 px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] transition"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  MFA Login
                </Link>

                <Link
                  href="/settings"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                  }}
                  className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-slate-800 text-slate-400 font-mono text-[11px] transition"
                >
                  <Settings className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
