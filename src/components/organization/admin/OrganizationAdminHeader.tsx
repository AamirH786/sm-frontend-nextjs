'use client';

import Select from '@/components/ui/Select';

type OrganizationOption = {
  id: number;
  name: string;
};

type StatItem = {
  label: string;
  value: string | number;
};

type OrganizationAdminHeaderProps = {
  title: string;
  description: string;
  organizations: OrganizationOption[];
  selectedOrganizationId: number | null;
  onOrganizationChange: (value: number) => void;
  stats?: StatItem[];
  actions?: React.ReactNode;
};

export default function OrganizationAdminHeader({
  title,
  description,
  organizations,
  selectedOrganizationId,
  onOrganizationChange,
  stats = [],
  actions,
}: OrganizationAdminHeaderProps) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600">Organizations</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
          </div>

          {stats.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stats.map((stat) => (
                <span
                  key={stat.label}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                >
                  <span className="text-slate-500">{stat.label}</span>
                  <span className="font-semibold text-slate-900">{stat.value}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-3 xl:max-w-md xl:items-end">
          <div className="w-full xl:max-w-sm">
            <Select
              label="Organization"
              options={organizations.map((organization) => ({
                value: organization.id,
                label: organization.name,
              }))}
              value={selectedOrganizationId ?? ''}
              onChange={(value) => onOrganizationChange(Number(value))}
              placeholder={organizations.length ? 'Select organization' : 'No organizations found'}
              disabled={organizations.length === 0}
            />
          </div>
          {actions ? <div className="flex w-full justify-end">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
