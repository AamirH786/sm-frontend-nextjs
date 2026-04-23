'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import employeeService, { IPRestriction } from '@/services/employeeService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ReauthModal from '@/components/ui/ReauthModal';
import OtpVerificationModal from '@/components/ui/OtpVerificationModal';
import { Card, CardContent } from '@/components/ui/Card';
import { Plus, Edit, Trash2, Shield, ShieldOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdmin } from '@/lib/auth';
import AccessDenied from '@/components/permissions/AccessDenied';
import useOtpStepUpAuth from '@/hooks/useOtpStepUpAuth';

export default function IPRestrictionsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [records, setRecords] = useState<IPRestriction[]>([]);
  const [restrictionActive, setRestrictionActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<IPRestriction | null>(null);
  const [deleting, setDeleting] = useState<IPRestriction | null>(null);
  const [form, setForm] = useState({ ip_address: '', label: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [reauthModalOpen, setReauthModalOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthLoading, setReauthLoading] = useState(false);
  const [reauthToken, setReauthToken] = useState('');
  const [reauthExpiresAt, setReauthExpiresAt] = useState<number | null>(null);
  const [pendingSecureAction, setPendingSecureAction] = useState<'save' | 'delete' | null>(null);
  const otpStepUp = useOtpStepUpAuth();

  const hasValidReauthToken = () =>
    (!!reauthToken && (!!reauthExpiresAt ? Date.now() < reauthExpiresAt : true)) || otpStepUp.hasValidToken('ip_reauth');
  const getActiveReauthToken = () => otpStepUp.getToken('ip_reauth') || (!!reauthToken && (!!reauthExpiresAt ? Date.now() < reauthExpiresAt : true) ? reauthToken : '');
  const registeredEmail = user?.email || '';

  const load = async () => {
    try {
      setLoading(true);
      const data = await employeeService.listIPRestrictions();
      setRecords(data.data);
      setRestrictionActive(data.restriction_active);
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to load IP restrictions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin(user)) {
      load();
    }
  }, [user]);

  if (!isSuperAdmin(user)) {
    return (
      <AccessDenied
        title="IP restrictions unavailable"
        description="Only super admins can manage IP restrictions."
      />
    );
  }

  const openAdd = () => {
    setEditing(null);
    setForm({ ip_address: '', label: '', is_active: true });
    setIsModalOpen(true);
  };

  const openEdit = (r: IPRestriction) => {
    setEditing(r);
    setForm({ ip_address: r.ip_address, label: r.label || '', is_active: r.is_active });
    setIsModalOpen(true);
  };

  const performSecureSave = async (token: string) => {
    setSaving(true);
    try {
      if (editing) {
        await employeeService.updateSecureIPRestriction(editing.id!, form, token);
        showToast('IP updated', 'success');
      } else {
        await employeeService.addSecureIPRestriction(form, token);
        showToast('IP added', 'success');
      }
      setIsModalOpen(false);
      await load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Save failed — re-authentication required', 'error');
    } finally {
      setSaving(false);
    }
  };

  const performSecureDelete = async (token: string) => {
    if (!deleting) return;
    try {
      await employeeService.deleteSecureIPRestriction(deleting.id!, token);
      showToast('IP removed', 'success');
      setDeleting(null);
      await load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Delete failed — re-authentication required', 'error');
    }
  };

  const handleSave = async () => {
    if (!form.ip_address.trim()) {
      showToast('IP address is required', 'error');
      return;
    }
    const activeToken = getActiveReauthToken();
    if (!activeToken) {
      if (!registeredEmail) {
        showToast('Registered email not found. Falling back to password verification.', 'error');
        setPendingSecureAction('save');
        setReauthModalOpen(true);
        return;
      }
      setPendingSecureAction('save');
      try {
        await otpStepUp.beginVerification({
          purpose: 'ip_reauth',
          email: registeredEmail,
          title: 'Verify IP Security OTP',
          description: 'Enter the OTP sent to your registered email to continue with this IP restriction change.',
          sendPayload: {
            action_purpose: editing ? 'ip_update' : 'ip_create',
            target_ip: form.ip_address.trim() || undefined,
            step_up_scope: 'ip_reauth',
          },
          onVerified: async (token) => {
            setPendingSecureAction(null);
            await performSecureSave(token);
          },
        });
        showToast('OTP sent to your registered email', 'success');
      } catch (e: any) {
        showToast(e?.message || 'OTP could not be sent. Falling back to password verification.', 'error');
        setReauthModalOpen(true);
      }
      return;
    }
    await performSecureSave(activeToken);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const activeToken = getActiveReauthToken();
    if (!activeToken) {
      if (!registeredEmail) {
        showToast('Registered email not found. Falling back to password verification.', 'error');
        setPendingSecureAction('delete');
        setReauthModalOpen(true);
        return;
      }
      setPendingSecureAction('delete');
      try {
        await otpStepUp.beginVerification({
          purpose: 'ip_reauth',
          email: registeredEmail,
          title: 'Verify IP Security OTP',
          description: 'Enter the OTP sent to your registered email to continue with this IP restriction removal.',
          sendPayload: {
            action_purpose: 'ip_delete',
            target_ip: deleting?.ip_address || undefined,
            step_up_scope: 'ip_reauth',
          },
          onVerified: async (token) => {
            setPendingSecureAction(null);
            await performSecureDelete(token);
          },
        });
        showToast('OTP sent to your registered email', 'success');
      } catch (e: any) {
        showToast(e?.message || 'OTP could not be sent. Falling back to password verification.', 'error');
        setReauthModalOpen(true);
      }
      return;
    }
    await performSecureDelete(activeToken);
  };

  const handleVerifyReauth = async () => {
    if (!reauthPassword.trim()) {
      showToast('Password is required', 'error');
      return;
    }
    try {
      setReauthLoading(true);
      const response = await employeeService.verifyIPRestrictionReauth(reauthPassword);
      const expiresAt = response.expires_at ? new Date(response.expires_at).getTime() : Date.now() + 5 * 60 * 1000;
      const nextToken = response.reauth_token;
      const nextAction = pendingSecureAction;
      setReauthToken(nextToken);
      setReauthExpiresAt(expiresAt);
      setReauthModalOpen(false);
      setReauthPassword('');
      setPendingSecureAction(null);
      showToast('Re-authentication successful', 'success');

      if (nextAction === 'save') {
        await performSecureSave(nextToken);
        return;
      }
      if (nextAction === 'delete') {
        await performSecureDelete(nextToken);
        return;
      }
    } catch (e: any) {
      showToast(e?.message || 'Password verification failed', 'error');
    } finally {
      setReauthLoading(false);
    }
  };

  return (
    <div className="px-6 md:px-10 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">IP Restrictions</h1>
          <p className="text-sm text-gray-500">Control which IPs employees can log in from</p>
        </div>
        <Button onClick={openAdd} className="flex items-center gap-2">
          <Plus size={16} />
          Add IP
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="py-3 px-4 flex items-start gap-3">
          {restrictionActive ? (
            <Shield size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
          ) : (
            <ShieldOff size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
          )}
          <div className="text-sm">
            {restrictionActive ? (
              <span className="text-green-700 font-medium">
                IP Restriction is ACTIVE — only listed IPs can log in (super admin always bypassed).
              </span>
            ) : (
              <span className="text-gray-500">
                IP Restriction is INACTIVE — no IPs added yet, all logins are allowed.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Shield size={40} className="mx-auto mb-2 opacity-30" />
              <p>No IP restrictions added</p>
              <p className="text-xs mt-1">Add an IP to enable login restrictions</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Added</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">{r.ip_address}</td>
                    <td className="px-4 py-3 text-gray-500">{r.label || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleting(r)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Edit IP Restriction' : 'Add IP Restriction'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IP Address <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.ip_address}
              onChange={(e) => setForm((f) => ({ ...f, ip_address: e.target.value }))}
              placeholder="192.168.1.100"
            />
            <p className="text-xs text-gray-400 mt-1">Enter IPv4 or IPv6 address</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
            <Input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Office WiFi, Home Network, etc."
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Active (enforce this IP)
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Add IP'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        title="Remove IP Restriction"
      >
        <p className="text-sm text-gray-600 mb-4">
          Remove <span className="font-mono font-semibold">{deleting?.ip_address}</span>? This will allow/restrict logins accordingly.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={handleDelete}
          >
            Remove
          </Button>
        </div>
      </Modal>

      <ReauthModal
        isOpen={reauthModalOpen}
        password={reauthPassword}
        loading={reauthLoading}
        description="Please verify your password before adding, updating, or removing IP restrictions."
        onClose={() => {
          setReauthModalOpen(false);
          setReauthPassword('');
          setPendingSecureAction(null);
        }}
        onPasswordChange={setReauthPassword}
        onConfirm={handleVerifyReauth}
      />

      <OtpVerificationModal
        isOpen={otpStepUp.modalState.isOpen}
        title={otpStepUp.modalState.title}
        description={otpStepUp.modalState.description}
        email={otpStepUp.modalState.email}
        otp={otpStepUp.modalState.otp}
        error={otpStepUp.modalState.error}
        hasSentOtp={otpStepUp.modalState.hasSentOtp}
        resendInSeconds={otpStepUp.modalState.resendInSeconds}
        loading={otpStepUp.modalState.loading}
        sending={otpStepUp.modalState.sending}
        onClose={() => {
          setPendingSecureAction(null);
          otpStepUp.closeModal();
        }}
        onOtpChange={otpStepUp.setOtp}
        onConfirm={otpStepUp.verifyOtp}
        onResend={otpStepUp.resendOtp}
      />
    </div>
  );
}
