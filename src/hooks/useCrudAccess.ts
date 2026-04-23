'use client';

import usePermission from './usePermission';

type CrudAccessOptions = {
  viewAction?: string;
  toggleAction?: string;
};

export default function useCrudAccess(
  module: string,
  options: CrudAccessOptions = {}
) {
  const { can } = usePermission();
  const viewAction = options.viewAction ?? 'view';
  const toggleAction = options.toggleAction ?? 'update';

  return {
    canView: can(module, viewAction),
    canRead: can(module, 'read'),
    canCreate: can(module, 'create'),
    canUpdate: can(module, 'update'),
    canDelete: can(module, 'delete'),
    canToggle: can(module, toggleAction),
  };
}
