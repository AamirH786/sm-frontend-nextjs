'use client';

import { Download, FileText, Paperclip, Trash2, Upload } from 'lucide-react';

type ExistingAttachment = {
  id?: number;
  original_name?: string;
  file_name?: string;
  stored_file_name: string;
  file_size?: number;
};

interface FileAttachmentsFieldProps {
  label?: string;
  files: File[];
  existingAttachments?: ExistingAttachment[];
  disabled?: boolean;
  uploadProgress?: number | null;
  hint?: string;
  onFilesSelected: (files: FileList | null) => void;
  onRemoveFile: (index: number) => void;
  onRemoveExistingAttachment?: (attachment: ExistingAttachment) => void;
  getDownloadUrl?: (storedFileName: string) => string;
}

const formatFileSize = (size?: number) => {
  if (!size || size <= 0) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function FileAttachmentsField({
  label = 'Attachments',
  files,
  existingAttachments = [],
  disabled = false,
  uploadProgress,
  hint,
  onFilesSelected,
  onRemoveFile,
  onRemoveExistingAttachment,
  getDownloadUrl,
}: FileAttachmentsFieldProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <label
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-4 text-sm transition-colors ${
            disabled ? 'cursor-not-allowed bg-gray-50 text-gray-400' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/40'
          }`}
        >
          <Upload size={16} />
          <span>{disabled ? 'Uploading attachments...' : 'Choose files'}</span>
          <input
            type="file"
            multiple
            disabled={disabled}
            className="hidden"
            onChange={(event) => {
              onFilesSelected(event.target.files);
              event.currentTarget.value = '';
            }}
          />
        </label>
        {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
      </div>

      {typeof uploadProgress === 'number' && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="text-xs text-gray-500">Upload progress: {uploadProgress}%</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Selected Files</p>
          {files.map((file, index) => (
            <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <Paperclip size={14} className="text-gray-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveFile(index)}
                disabled={disabled}
                className="rounded p-1.5 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {existingAttachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Existing Attachments</p>
          {existingAttachments.map((attachment) => {
            const fileName = attachment.original_name || attachment.file_name || attachment.stored_file_name;
            const downloadUrl = getDownloadUrl?.(attachment.stored_file_name);

            return (
              <div key={`${attachment.id ?? attachment.stored_file_name}`} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText size={14} className="text-gray-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{fileName}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(attachment.file_size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {downloadUrl ? (
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                    >
                      <Download size={14} />
                    </a>
                  ) : null}
                  {onRemoveExistingAttachment ? (
                    <button
                      type="button"
                      onClick={() => onRemoveExistingAttachment(attachment)}
                      disabled={disabled}
                      className="rounded p-1.5 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
