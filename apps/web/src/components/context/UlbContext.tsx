'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '../../lib/api-client';
import { AuthContextUser } from '@smartlight/shared-types';

export interface UlbItem {
  id: string;
  code: string;
  name: string;
  state: string;
}

export const INITIAL_ULBS: UlbItem[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    code: 'ULB-GBL',
    name: 'Ganderbal Municipal Council',
    state: 'Jammu & Kashmir',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    code: 'ULB-KTR',
    name: 'Katra Municipal Committee',
    state: 'Jammu & Kashmir',
  },
];

export interface SeedAccountOption {
  email: string;
  name: string;
  role: string;
  allowedUlbIds: string[];
  isGlobalAdmin: boolean;
}

export const SEED_ACCOUNTS: SeedAccountOption[] = [
  {
    email: 'admin@smartlight.os',
    name: 'Global Administrator',
    role: 'PLATFORM_ADMIN',
    allowedUlbIds: ['*'],
    isGlobalAdmin: true,
  },
  {
    email: 'operator.ganderbal@smartlight.os',
    name: 'Tariq Ahmad (Ganderbal Ops)',
    role: 'CONTROL_OPERATOR',
    allowedUlbIds: ['11111111-1111-1111-1111-111111111111'],
    isGlobalAdmin: false,
  },
  {
    email: 'operator.katra@smartlight.os',
    name: 'Rajesh Sharma (Katra Ops)',
    role: 'CONTROL_OPERATOR',
    allowedUlbIds: ['22222222-2222-2222-2222-222222222222'],
    isGlobalAdmin: false,
  },
  {
    email: 'tech.ganderbal@smartlight.os',
    name: 'Mohammad Iqbal (Field Tech)',
    role: 'TECHNICIAN',
    allowedUlbIds: ['11111111-1111-1111-1111-111111111111'],
    isGlobalAdmin: false,
  },
  {
    email: 'auditor@smartlight.os',
    name: 'Sunil Verma (Auditor)',
    role: 'AUDITOR',
    allowedUlbIds: ['*'],
    isGlobalAdmin: false,
  },
];

interface UlbContextValue {
  selectedUlb: UlbItem | null;
  allUlbs: UlbItem[];
  setSelectedUlbId: (id: string) => void;
  currentUser: SeedAccountOption;
  setCurrentAccount: (email: string) => void;
  isBackendOnline: boolean;
  checkHealth: () => Promise<void>;
}

const UlbContext = createContext<UlbContextValue | undefined>(undefined);

export const UlbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedUlbId, setSelectedUlbIdState] = useState<string>(INITIAL_ULBS[0].id);
  const [currentUser, setCurrentUser] = useState<SeedAccountOption>(SEED_ACCOUNTS[0]);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);

  const setSelectedUlbId = (id: string) => {
    setSelectedUlbIdState(id);
    ApiClient.setActiveUlbId(id);
  };

  const setCurrentAccount = async (email: string) => {
    const acc = SEED_ACCOUNTS.find((a) => a.email === email);
    if (acc) {
      setCurrentUser(acc);
      // Auto-restrict selected ULB if user is scoped
      if (!acc.isGlobalAdmin && acc.allowedUlbIds.length > 0 && !acc.allowedUlbIds.includes('*')) {
        setSelectedUlbId(acc.allowedUlbIds[0]);
      }
      // Attempt login to get live token
      try {
        const res = await ApiClient.fetch<{ accessToken: string }>('auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: acc.email, password: 'SmartLight@2026!' }),
        });
        if (res?.accessToken) {
          ApiClient.setToken(res.accessToken);
        }
      } catch {
        // Dev fallback
      }
    }
  };

  const checkHealth = async () => {
    try {
      const res = await fetch('http://localhost:4000/health').then((r) => r.json());
      setIsBackendOnline(res?.status === 'healthy' || res?.status === 'degraded');
    } catch {
      setIsBackendOnline(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const selectedUlb = INITIAL_ULBS.find((u) => u.id === selectedUlbId) || null;

  // Filter selectable ULBs based on current user scope
  const accessibleUlbs = currentUser.isGlobalAdmin || currentUser.allowedUlbIds.includes('*')
    ? INITIAL_ULBS
    : INITIAL_ULBS.filter((u) => currentUser.allowedUlbIds.includes(u.id));

  return (
    <UlbContext.Provider
      value={{
        selectedUlb,
        allUlbs: accessibleUlbs,
        setSelectedUlbId,
        currentUser,
        setCurrentAccount,
        isBackendOnline,
        checkHealth,
      }}
    >
      {children}
    </UlbContext.Provider>
  );
};

export const useUlb = () => {
  const ctx = useContext(UlbContext);
  if (!ctx) {
    throw new Error('useUlb must be used within a UlbProvider');
  }
  return ctx;
};
