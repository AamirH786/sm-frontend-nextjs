'use client';

import { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    current_password: string;
    new_password: string;
  }) => Promise<void>;
}

export default function ChangePasswordModal({
  open,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  // ✅ reset on open
  useEffect(() => {
    if (open) {
      setForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    }
  }, [open]);

  const passwordChecks = {
    minLength: form.new_password.length >= 8,
    upper: /[A-Z]/.test(form.new_password),
    lower: /[a-z]/.test(form.new_password),
    number: /[0-9]/.test(form.new_password),
    special: /[^a-zA-Z0-9]/.test(form.new_password),
    different:
      !!form.new_password &&
      !!form.current_password &&
      form.new_password !== form.current_password,
  };

  const isStrong = Object.values(passwordChecks).every(Boolean);

  const strength = () => {
    const pw = form.new_password;
    if (!pw) return null;
    if (pw.length < 8)
      return { label: 'Too short', bar: 'w-1/4 bg-red-400' };
    if (!/[A-Z]/.test(pw) || !/[0-9]/.test(pw))
      return { label: 'Weak', bar: 'w-2/4 bg-orange-400' };
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw))
      return { label: 'Strong', bar: 'w-full bg-green-500' };
    return { label: 'Medium', bar: 'w-3/4 bg-yellow-400' };
  };

  const s = strength();

  const handleSave = async () => {
    if (!isStrong) return;
    if (form.new_password !== form.confirm_password) return;

    setSaving(true);
    try {
      await onSubmit({
        current_password: form.current_password,
        new_password: form.new_password,
      });
      onClose(); // ✅ smooth close after success
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal open={open} onClose={onClose} width="max-w-md">
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Change Password
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Update your account security
          </p>
        </div>

        {/* Current */}
        <div className="relative">
          <input
            type={show.current ? 'text' : 'password'}
            placeholder="Current password"
            className="w-full border rounded-xl px-3 py-2 pr-10 text-sm"
            value={form.current_password}
            onChange={(e) =>
              setForm((f) => ({ ...f, current_password: e.target.value }))
            }
          />
          <button
            type="button"
            onClick={() =>
              setShow((s) => ({ ...s, current: !s.current }))
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            {show.current ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {/* New */}
        <div className="space-y-1">
          <div className="relative">
            <input
              type={show.next ? 'text' : 'password'}
              placeholder="New password"
              className="w-full border rounded-xl px-3 py-2 pr-10 text-sm"
              value={form.new_password}
              onChange={(e) =>
                setForm((f) => ({ ...f, new_password: e.target.value }))
              }
            />
            <button
              type="button"
              onClick={() =>
                setShow((s) => ({ ...s, next: !s.next }))
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {show.next ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {s && (
            <div className="space-y-1">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${s.bar} transition-all`} />
              </div>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          )}
        </div>

        {/* Confirm */}
        <div className="relative">
          <input
            type={show.confirm ? 'text' : 'password'}
            placeholder="Confirm password"
            className={`w-full border rounded-xl px-3 py-2 pr-10 text-sm ${
              form.confirm_password &&
              form.confirm_password !== form.new_password
                ? 'border-red-300'
                : ''
            }`}
            value={form.confirm_password}
            onChange={(e) =>
              setForm((f) => ({ ...f, confirm_password: e.target.value }))
            }
          />
          <button
            type="button"
            onClick={() =>
              setShow((s) => ({ ...s, confirm: !s.confirm }))
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            {show.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>

          {form.confirm_password &&
            form.confirm_password === form.new_password && (
              <CheckCircle
                size={14}
                className="absolute right-9 top-1/2 -translate-y-1/2 text-green-500"
              />
            )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition active:scale-[0.98]"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={
              saving ||
              !isStrong ||
              form.new_password !== form.confirm_password
            }
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-600 text-white text-sm hover:bg-orange-700 transition active:scale-[0.98] disabled:opacity-60"
          >
            <Lock size={15} />
            {saving ? 'Updating…' : 'Update'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}