'use client';

import { Eye, Pencil, Trash2 } from 'lucide-react';
import IconButton from '@/components/ui/IconButton';

interface TableActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canView?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export default function TableActions({
  onView,
  onEdit,
  onDelete,
  canView = true,
  canEdit = true,
  canDelete = true,
}: TableActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      {canView && onView && <IconButton label="View" icon={<Eye size={15} />} onClick={onView} />}
      {canEdit && onEdit && <IconButton label="Edit" icon={<Pencil size={15} />} onClick={onEdit} />}
      {canDelete && onDelete && <IconButton label="Delete" icon={<Trash2 size={15} />} variant="danger" onClick={onDelete} />}
    </div>
  );
}
