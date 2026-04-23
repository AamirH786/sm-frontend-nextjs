"use client";
import React from "react";
import Modal from "@/components/ui/Modal";

interface Props {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmText?: string;
  isLoading?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  isLoading = false,
}: Props) {
  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={onCancel} title={title}>
      <div className="p-4">
        <p className="text-sm text-gray-700 mb-4">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-3 py-1 rounded border text-sm"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Working..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
