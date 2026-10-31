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
  title?: string;
  department?: string;
  portalView?: 'platform' | 'admin' | 'operator' | 'technician' | 'auditor' | 'reports';
}

export const SEED_ACCOUNTS: SeedAccountOption[] = [
  {
    email: 'admin@smartlight.os',
    name: 'Global Administrator',
    role: 'PLATFORM_ADMIN',
    allowedUlbIds: ['*'],
    isGlobalAdmin: true,
    title: 'Chief Platform Administrator',
    department: 'State Directorate of Urban Local Bodies (JKHUDD)',
    portalView: 'platform',
  },
  {
    email: 'admin.ganderbal@smartlight.os',
    name: 'Farooq Shah',
    role: 'ULB_ADMIN',
    allowedUlbIds: ['11111111-1111-1111-1111-111111111111'],
    isGlobalAdmin: false,
    title: 'Municipal Executive Officer',
    department: 'Ganderbal Municipal Council',
    portalView: 'admin',
  },
  {
    email: 'admin.katra@smartlight.os',
    name: 'Anita Sharma',
    role: 'ULB_ADMIN',
    allowedUlbIds: ['22222222-2222-2222-2222-222222222222'],
    isGlobalAdmin: false,
    title: 'Municipal Executive Officer',
    department: 'Katra Municipal Committee',
    portalView: 'admin',
  },
  {
    email: 'ops.manager@smartlight.os',
    name: 'Er. Vikram Singh',
    role: 'OPERATIONS_MANAGER',
    allowedUlbIds: ['*'],
    isGlobalAdmin: false,
    title: 'Superintending Operations Engineer',
    department: 'Regional Streetlighting Operations',
    portalView: 'operator',
  },
  {
    email: 'operator.ganderbal@smartlight.os',
    name: 'Tariq Ahmad',
    role: 'CONTROL_OPERATOR',
    allowedUlbIds: ['11111111-1111-1111-1111-111111111111'],
    isGlobalAdmin: false,
    title: 'SCADA Control Room Operator',
    department: 'Ganderbal Central Control Station',
    portalView: 'operator',
  },
  {
    email: 'operator.katra@smartlight.os',
    name: 'Rajesh Sharma',
    role: 'CONTROL_OPERATOR',
    allowedUlbIds: ['22222222-2222-2222-2222-222222222222'],
    isGlobalAdmin: false,
    title: 'SCADA Control Room Operator',
    department: 'Katra Pilgrim Corridor Station',
    portalView: 'operator',
  },
  {
    email: 'maint.supervisor@smartlight.os',
    name: 'Bilal Wani',
    role: 'MAINTENANCE_SUPERVISOR',
    allowedUlbIds: ['11111111-1111-1111-1111-111111111111'],
    isGlobalAdmin: false,
    title: 'Junior Engineer (Maintenance & Dispatch)',
    department: 'Ganderbal Field Engineering Unit',
    portalView: 'technician',
  },
  {
    email: 'tech.ganderbal@smartlight.os',
    name: 'Mohammad Iqbal',
    role: 'TECHNICIAN',
    allowedUlbIds: ['11111111-1111-1111-1111-111111111111'],
    isGlobalAdmin: false,
    title: 'Senior Field Technician',
    department: 'Mobile Streetlight Repair Team',
    portalView: 'technician',
  },
  {
    email: 'tech.katra@smartlight.os',
    name: 'Rakesh Gupta',
    role: 'TECHNICIAN',
    allowedUlbIds: ['22222222-2222-2222-2222-222222222222'],
    isGlobalAdmin: false,
    title: 'Senior Field Technician',
    department: 'Katra Pilgrim Corridor Mobile Team',
    portalView: 'technician',
  },
  {
    email: 'auditor@smartlight.os',
    name: 'Sunil Verma',
    role: 'AUDITOR',
    allowedUlbIds: ['*'],
    isGlobalAdmin: false,
    title: 'Third-Party Energy & SLA Auditor',
    department: 'Independent Compliance Verification Agency',
    portalView: 'auditor',
  },
  {
    email: 'reports.viewer@smartlight.os',
    name: 'Ramesh Kumar',
    role: 'REPORTS_VIEWER',
    allowedUlbIds: ['*'],
    isGlobalAdmin: false,
    title: 'Executive Tender Monitor & SLA Officer',
    department: 'State Directorate of Urban Local Bodies / Audit Board',
    portalView: 'reports',
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
