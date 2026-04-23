'use client';

import { Shield } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';

interface ReauthModalProps {
  isOpen: boolean;
  password: string;
  loading?: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onPasswordChange: (value: string) => void;
  onConfirm: () => void;
}

export default function ReauthModal({
  isOpen,
  password,
  loading = false,
  title = 'Re-authentication Required',
  description = 'Please confirm your password before continuing with this secure action.',
  onClose,
  onPasswordChange,
  onConfirm,
}: ReauthModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          <Shield size={16} className="mt-0.5 flex-shrink-0" />
          <p>{description}</p>
        </div>

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading || !password.trim()}>
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
