'use client';

import { useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface OtpVerificationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  email: string;
  otp: string;
  error?: string;
  hasSentOtp: boolean;
  resendInSeconds: number;
  loading?: boolean;
  sending?: boolean;
  onClose: () => void;
  onOtpChange: (value: string) => void;
  onConfirm: () => void;
  onResend: () => void;
}

export default function OtpVerificationModal({
  isOpen,
  title,
  description,
  email,
  otp,
  error,
  hasSentOtp,
  resendInSeconds,
  loading = false,
  sending = false,
  onClose,
  onOtpChange,
  onConfirm,
  onResend,
}: OtpVerificationModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen || !hasSentOtp) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [hasSentOtp, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={loading || sending ? () => {} : onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{description}</p>

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Registered Email</p>
          <p className="mt-1 text-sm font-medium text-gray-900">{email || 'Email unavailable'}</p>
        </div>

        {hasSentOtp ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
            onPaste={(event) => {
              event.preventDefault();
              const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
              onOtpChange(pasted);
            }}
            placeholder="Enter 6-digit OTP"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-lg font-semibold tracking-[0.35em] text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        ) : (
          <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {sending ? 'Sending OTP to your registered email...' : 'Preparing OTP verification...'}
          </div>
        )}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {hasSentOtp ? (
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={onResend}
              disabled={loading || sending || resendInSeconds > 0}
              className="font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              {resendInSeconds > 0 ? `Resend in ${resendInSeconds}s` : 'Resend OTP'}
            </button>
            <span className="text-gray-400">Code valid for 5 minutes</span>
          </div>
        ) : (
          <p className="text-xs text-gray-400">We will send a 6-digit OTP to your registered email.</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading || sending}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading || sending || otp.length !== 6 || !hasSentOtp}
          >
            {loading ? 'Verifying...' : sending ? 'Sending...' : 'Verify & Continue'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
