'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User, Lock } from 'lucide-react';

interface Props {
  open: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onEditProfile: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
}

export default function SecurityDropdown({
  open,
  anchorRef,
  onClose,
  onEditProfile,
  onChangePassword,
  onLogout,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  // ✅ Outside click close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        !anchorRef.current?.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose, anchorRef]);

  // ✅ ESC close
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (open) document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onClose]);

  if (!open || !anchorRef.current) return null;

  const rect = anchorRef.current.getBoundingClientRect();

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          top: rect.bottom + 8,
          left: rect.right - 180,
          width: 180,
          zIndex: 9999,
        }}
        className="rounded-2xl border border-gray-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-1"
      >
        <button
          onClick={onEditProfile}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <User size={15} />
          Edit Profile
        </button>

        <button
          onClick={onChangePassword}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Lock size={15} />
          Change Password
        </button>

        <div className="my-1 h-px bg-gray-100" />

        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          <LogOut size={15} />
          Logout
        </button>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}