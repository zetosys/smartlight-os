'use client';

import React, { useState, useEffect } from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { UserListItem, UserRole, PermissionCode } from '@smartlight/shared-types';
import { SimulatedBadge, StatusBadge } from '@smartlight/ui';
import {
  Users,
  Shield,
  KeyRound,
  Building2,
  UserPlus,
  Check,
  X,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function UsersPage() {
  const { currentUser, allUlbs } = useUlb();
  const [activeTab, setActiveTab] = useState<'users' | 'matrix' | 'ulbs'>('users');
  const [userList, setUserList] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [roleMatrix, setRoleMatrix] = useState<{ roleCode: string; permissions: PermissionCode[] }[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New User Form State
  const [formEmail, setFormEmail] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('CONTROL_OPERATOR');
  const [formUlbId, setFormUlbId] = useState<string>(allUlbs[0]?.id || '');
  const [formMfa, setFormMfa] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.fetch<UserListItem[]>('users');
      setUserList(data || []);
    } catch {
      // Fallback data when API is offline
      setUserList([
        {
          id: '40000000-0000-0000-0000-000000000001',
          email: 'admin@smartlight.os',
          name: 'Global Administrator',
          firstName: 'Global',
          lastName: 'Administrator',
          roleCode: 'PLATFORM_ADMIN',
          ulbId: null,
          ulbName: 'All ULBs (Global)',
          mfaEnabled: true,
          active: true,
          lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: '40000000-0000-0000-0000-000000000002',
          email: 'operator.ganderbal@smartlight.os',
          name: 'Tariq Ahmad',
          firstName: 'Tariq',
          lastName: 'Ahmad',
          roleCode: 'CONTROL_OPERATOR',
          ulbId: '11111111-1111-1111-1111-111111111111',
          ulbName: 'Ganderbal Municipal Council',
          mfaEnabled: false,
          active: true,
          lastLoginAt: new Date(Date.now() - 7200000).toISOString(),
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: '40000000-0000-0000-0000-000000000003',
          email: 'operator.katra@smartlight.os',
          name: 'Rajesh Sharma',
          firstName: 'Rajesh',
          lastName: 'Sharma',
          roleCode: 'CONTROL_OPERATOR',
          ulbId: '22222222-2222-2222-2222-222222222222',
          ulbName: 'Katra Municipal Committee',
          mfaEnabled: false,
          active: true,
          lastLoginAt: new Date(Date.now() - 14400000).toISOString(),
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: '40000000-0000-0000-0000-000000000004',
          email: 'tech.ganderbal@smartlight.os',
          name: 'Mohammad Iqbal',
          firstName: 'Mohammad',
          lastName: 'Iqbal',
          roleCode: 'TECHNICIAN',
          ulbId: '11111111-1111-1111-1111-111111111111',
          ulbName: 'Ganderbal Municipal Council',
          mfaEnabled: false,
          active: true,
          lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: '40000000-0000-0000-0000-000000000005',
          email: 'auditor@smartlight.os',
          name: 'Sunil Verma',
          firstName: 'Sunil',
          lastName: 'Verma',
          roleCode: 'AUDITOR',
          ulbId: null,
          ulbName: 'All ULBs (Global)',
          mfaEnabled: false,
          active: true,
          lastLoginAt: new Date(Date.now() - 172800000).toISOString(),
          createdAt: '2026-01-01T00:00:00Z',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoleMatrix = async () => {
    try {
      const data = await ApiClient.fetch<{ roleCode: string; permissions: PermissionCode[] }[]>(
        'users/roles/matrix',
      );
      setRoleMatrix(data || []);
    } catch {
      // Fallback matrix
      setRoleMatrix([
        {
          roleCode: 'PLATFORM_ADMIN',
          permissions: [
            'org.manage',
            'users.manage',
            'assets.read',
            'assets.write',
            'devices.read',
            'devices.configure',
            'devices.command',
            'schedules.manage',
            'alerts.read',
            'alerts.acknowledge',
            'tickets.read',
            'tickets.create',
            'tickets.assign',
            'tickets.resolve',
            'reports.read',
            'reports.export',
            'simulator.manage',
            'audit.read',
            'integrations.manage',
          ],
        },
        {
          roleCode: 'CONTROL_OPERATOR',
          permissions: ['assets.read', 'devices.read', 'devices.command', 'alerts.read', 'alerts.acknowledge', 'tickets.read', 'reports.read'],
        },
        {
          roleCode: 'TECHNICIAN',
          permissions: ['assets.read', 'devices.read', 'tickets.read', 'tickets.resolve'],
        },
        {
          roleCode: 'AUDITOR',
          permissions: ['assets.read', 'devices.read', 'reports.read', 'reports.export', 'audit.read'],
        },
      ]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoleMatrix();
  }, [currentUser]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await ApiClient.fetch('users', {
        method: 'POST',
        body: JSON.stringify({
          email: formEmail,
          firstName: formFirstName,
          lastName: formLastName,
          roleCode: formRole,
          ulbId: formRole === 'PLATFORM_ADMIN' || formRole === 'AUDITOR' ? null : formUlbId,
          mfaEnabled: formMfa,
        }),
      });

      setActionMsg(`User account '${formEmail}' created successfully with role ${formRole}.`);
      setIsModalOpen(false);
      setFormEmail('');
      setFormFirstName('');
      setFormLastName('');
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: UserListItem) => {
    try {
      await ApiClient.fetch(`users/${user.id}/toggle-active`, { method: 'POST' });
      setActionMsg(`User ${user.email} status toggled.`);
      setUserList((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u)),
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleToggleMfa = async (user: UserListItem) => {
    try {
      await ApiClient.fetch(`users/${user.id}/toggle-mfa`, { method: 'POST' });
      setActionMsg(`MFA policy toggled for ${user.email}.`);
      setUserList((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, mfaEnabled: !u.mfaEnabled } : u)),
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            Identity, RBAC &amp; Tenant Administration
            <SimulatedBadge />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Server-enforced municipal scoping, MFA challenges, and enterprise access governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs flex items-center gap-1.5 transition shadow"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add New User
          </button>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 bg-slate-800/90 border border-emerald-500/40 rounded-lg text-xs text-slate-200 flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'users'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          User Accounts &amp; Scopes ({userList.length})
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'matrix'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          Role Permissions Matrix
        </button>

        <button
          onClick={() => setActiveTab('ulbs')}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'ulbs'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Registered Municipal Units ({allUlbs.length})
        </button>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Assigned ULB Scope</th>
                  <th className="px-4 py-3">MFA Policy</th>
                  <th className="px-4 py-3">Account Status</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {userList.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white font-sans">{user.name}</div>
                      <div className="text-[11px] text-slate-400">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        {user.roleCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-sans">
                      {user.ulbName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          user.mfaEnabled
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        <KeyRound className="w-3 h-3" />
                        {user.mfaEnabled ? 'ENFORCED' : 'OPTIONAL'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.active ? 'healthy' : 'failed'} label={user.active ? 'ACTIVE' : 'SUSPENDED'} />
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        <button
                          onClick={() => handleToggleMfa(user)}
                          title="Toggle MFA requirement"
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] border border-slate-700"
                        >
                          MFA
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`px-2 py-1 rounded text-[11px] border transition ${
                            user.active
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {user.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ROLE PERMISSIONS MATRIX */}
      {activeTab === 'matrix' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            Full Enterprise Scoped Role Matrix (Tender FR01)
          </h2>
          <p className="text-xs text-slate-400">
            Authorization boundaries are enforced server-side via NestJS <code className="text-amber-400">PermissionsGuard</code> and <code className="text-amber-400">UlbScopeGuard</code>.
          </p>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Permission Code</th>
                  <th className="px-3 py-3 text-center">PLATFORM_ADMIN</th>
                  <th className="px-3 py-3 text-center">ULB_ADMIN</th>
                  <th className="px-3 py-3 text-center">OPS_MGR</th>
                  <th className="px-3 py-3 text-center">CONTROL_OP</th>
                  <th className="px-3 py-3 text-center">MAINT_SUP</th>
                  <th className="px-3 py-3 text-center">TECHNICIAN</th>
                  <th className="px-3 py-3 text-center">AUDITOR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {[
                  'org.manage',
                  'users.manage',
                  'assets.read',
                  'assets.write',
                  'devices.read',
                  'devices.configure',
                  'devices.command',
                  'schedules.manage',
                  'alerts.read',
                  'alerts.acknowledge',
                  'tickets.read',
                  'tickets.create',
                  'tickets.assign',
                  'tickets.resolve',
                  'reports.read',
                  'reports.export',
                  'simulator.manage',
                  'audit.read',
                  'integrations.manage',
                ].map((perm) => (
                  <tr key={perm} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2 font-bold text-slate-300">{perm}</td>
                    {['PLATFORM_ADMIN', 'ULB_ADMIN', 'OPERATIONS_MANAGER', 'CONTROL_OPERATOR', 'MAINTENANCE_SUPERVISOR', 'TECHNICIAN', 'AUDITOR'].map((role) => {
                      const roleObj = roleMatrix.find((r) => r.roleCode === role);
                      const has = roleObj?.permissions.includes(perm as PermissionCode);
                      return (
                        <td key={role} className="px-3 py-2 text-center">
                          {has ? (
                            <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REGISTERED MUNICIPAL UNITS */}
      {activeTab === 'ulbs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {allUlbs.map((ulb) => (
            <div key={ulb.id} className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between font-sans">
                <span className="font-bold text-white text-base">{ulb.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-amber-400 border border-slate-700">
                  {ulb.code}
                </span>
              </div>
              <div className="text-slate-400 font-sans text-xs">
                State: {ulb.state}
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded space-y-1.5 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Timezone:</span>
                  <span>Asia/Kolkata (IST)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Luminaires:</span>
                  <span className="text-emerald-400 font-bold">
                    {ulb.code === 'ULB-GBL' ? '2,740 lights' : '1,868 lights'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Spatial SRID:</span>
                  <span>EPSG:4326 PostGIS</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                Provision Municipal Operator Account
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    placeholder="Bashir"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    placeholder="Lone"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Municipal Email Address</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  placeholder="tech@smartlight.os"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">System Role</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-amber-500"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                  >
                    {currentUser.isGlobalAdmin && (
                      <option value="PLATFORM_ADMIN">PLATFORM_ADMIN</option>
                    )}
                    <option value="ULB_ADMIN">ULB_ADMIN</option>
                    <option value="OPERATIONS_MANAGER">OPERATIONS_MANAGER</option>
                    <option value="CONTROL_OPERATOR">CONTROL_OPERATOR</option>
                    <option value="MAINTENANCE_SUPERVISOR">MAINTENANCE_SUPERVISOR</option>
                    <option value="TECHNICIAN">TECHNICIAN</option>
                    <option value="AUDITOR">AUDITOR</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Assigned ULB Scope</label>
                  <select
                    disabled={formRole === 'PLATFORM_ADMIN' || formRole === 'AUDITOR'}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    value={formUlbId}
                    onChange={(e) => setFormUlbId(e.target.value)}
                  >
                    {allUlbs.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mfaCheckbox"
                  checked={formMfa}
                  onChange={(e) => setFormMfa(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                />
                <label htmlFor="mfaCheckbox" className="text-slate-300">
                  Enforce Multi-Factor Authentication (TOTP / OTP challenge)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
