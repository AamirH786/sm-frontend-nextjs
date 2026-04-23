'use client';

import { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import { Save } from 'lucide-react';
import { ProfileData } from '@/services/profileService';

interface Props {
    open: boolean;
    onClose: () => void;
    profile: ProfileData | null;
    initialForm: {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
        gender: string;
    };
    onSubmit: (data: any) => Promise<void>;
}

const GENDER_OPTIONS = [
    { value: '', label: 'Select gender' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
];

export default function EditProfileModal({
    open,
    onClose,
    profile,
    initialForm,
    onSubmit,
}: Props) {
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) setForm(initialForm);
    }, [open, initialForm]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSubmit(form);
            onClose(); // ✅ Smooth close after success
        } finally {
            setSaving(false);
        }
    };

    return (
        <BaseModal open={open} onClose={onClose} width="max-w-xl">
            <div className="p-6 space-y-5">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Edit Profile</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Update your personal information
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        className="border rounded-xl px-3 py-2 text-sm"
                        placeholder="First name"
                        value={form.first_name}
                        onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                    />
                    <input
                        className="border rounded-xl px-3 py-2 text-sm"
                        placeholder="Last name"
                        value={form.last_name}
                        onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                    />
                    <input
                        className="border rounded-xl px-3 py-2 text-sm"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                    <input
                        className="border rounded-xl px-3 py-2 text-sm"
                        placeholder="Phone"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />

                    <select
                        className="border rounded-xl px-3 py-2 text-sm"
                        value={form.gender}
                        onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                    >
                        {GENDER_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>

                    <input
                        disabled
                        className="border rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-400"
                        value={profile?.username || ''}
                    />
                </div>

                <div className="flex justify-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition active:scale-[0.98]"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-800 text-white text-sm hover:bg-blue-900 transition active:scale-[0.98] disabled:opacity-60"
                    >
                        <Save size={15} />
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
}