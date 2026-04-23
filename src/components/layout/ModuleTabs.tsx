// NOTE: ModuleTabs contains old project module data (parties, bopp, etc.) and is not used.
// Superseded by AppSidebar. Kept here for reference — do not delete.
"use client";

import Link from "next/link";

type ModuleKey = 'masters' | 'stocks' | 'roles';

export default function ModuleTabs({ module, activeSub }: { module: ModuleKey; activeSub?: string }) {
  const options = {
    masters: [
      { id: 'parties', label: 'Parties' },
      { id: 'bopp', label: 'BOPP' },
      { id: 'non-woven', label: 'Non-Woven' },
      { id: 'pp-woven', label: 'PP Woven' },
      { id: 'job-types', label: 'Job Types' },
    ],

    stocks: [
      { id: 'summary', label: 'Summary' },
      { id: 'roll-overview', label: 'Roll Overview' },
      { id: 'received', label: 'Received' },
      { id: 'issued', label: 'Issued' },
    ],

    roles: [
      { id: 'users', label: 'Employees' },
      { id: 'roles', label: 'Roles' },
      { id: 'permissions', label: 'Permissions' },
    ],
  };

  return (
    <div className="flex gap-6 px-10 h-[45px] items-end border-b bg-white">
      {options[module]?.map(t => (
        <Link
          key={t.id}
          href={`/${module}/${t.id}`}
          className={`pb-2 text-[16px] ${
            activeSub === t.id 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
