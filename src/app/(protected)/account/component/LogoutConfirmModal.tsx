'use client';

import BaseModal from './BaseModal';
import { LogOut } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export default function LogoutConfirmModal({
  open,
  onClose,
  onConfirm,
}: Props) {
  return (
    <BaseModal open={open} onClose={onClose} width="max-w-sm">
      <div className="p-6 space-y-5 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
          <LogOut className="text-red-600" size={20} />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Logout?
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            You will need to login again to access your account.
          </p>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold bg-red-600 text-white text-sm hover:bg-red-700 transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </BaseModal>
  );
}