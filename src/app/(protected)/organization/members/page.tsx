'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { OrganizationPanelState, useOrganizationCurrentData } from '@/components/organization/OrganizationCurrentData';
import { useToast } from '@/context/ToastContext';

type OrganizationMember = {
  id: number;
  user_id: number;
  role: string;
  status: number;
  user?: {
    id: number;
    username?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

export default function OrganizationMembersPage() {
  const { userContext } = useAuth();
  const { showToast } = useToast();
  const endpoint = userContext?.organization?.id ? '/organizations/current/members' : null;
  const { data, loading, error, reload } = useOrganizationCurrentData<OrganizationMember[]>(endpoint);
  const members = data ?? [];
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('student');
  const [inviting, setInviting] = useState(false);
  const isOrgAdmin = userContext?.context_type === 'contact_person' || userContext?.organization?.role === 'org_admin' || userContext?.organization?.role === 'admin';

  const handleInviteMember = async () => {
    const orgId = userContext?.organization?.id;
    if (!orgId || !inviteEmail.trim()) return;

    try {
      setInviting(true);
      await api.post(`/organizations/${orgId}/members/invite`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      showToast('Member added successfully.', 'success');
      setInviteEmail('');
      setInviteRole('student');
      await reload();
    } catch (inviteError: any) {
      showToast(inviteError?.message || 'Unable to add member.', 'error');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Members</h1>
          <p className="mt-2 text-sm text-slate-500">Organization members are tenant-scoped and permission-safe.</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
          Total Members: {members.length}
        </div>
      </div>

      {isOrgAdmin ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Add Member</h2>
          <p className="mt-1 text-sm text-slate-500">Invite user by email and assign organization role.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-[1.3fr_0.8fr_auto]">
            <Input
              label="Member Email"
              type="email"
              placeholder="member@organization.com"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium tracking-tight text-slate-700">Role</label>
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 focus:border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleInviteMember} isLoading={inviting} disabled={inviting || !inviteEmail.trim()}>
                Add Member
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <OrganizationPanelState
        loading={loading}
        error={error}
        emptyMessage="No organization members found yet."
        hasData={members.length > 0}
      >
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-4 gap-4 border-b border-slate-200 px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Status</span>
          </div>
          {members.map((member) => (
            <div key={member.id} className="grid grid-cols-4 gap-4 px-5 py-4 text-sm text-slate-700">
              <span>{member.user?.username || `User #${member.user_id}`}</span>
              <span>{member.user?.email || '-'}</span>
              <span className="capitalize">{member.role.replace(/_/g, ' ')}</span>
              <span>{member.status === 1 ? 'Active' : 'Inactive'}</span>
            </div>
          ))}
        </div>
      </OrganizationPanelState>
    </div>
  );
}
