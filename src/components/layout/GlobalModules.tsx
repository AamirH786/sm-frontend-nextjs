// NOTE: GlobalModules contains old project module links and is not used in SummonMind.
// Superseded by AppSidebar. Kept here for reference — do not delete.

export default function GlobalModules({ active }: { active?: string }) {
  const modules = [
    { id: 'masters', name: 'Masters', href: '/masters/parties' },
    { id: 'stocks', name: 'Stocks', href: '/stocks/summary' },
    { id: 'purchase', name: 'Purchase Book', href: '/purchase' },
    { id: 'jobs', name: 'Job Details', href: '/jobs' },
    { id: 'roles', name: 'Roles & Employees', href: '/roles/users' },
  ];

  return (
    <div className="flex gap-10 px-10 h-[50px] items-center border-b bg-white">
      {modules.map(m => (
        <a
          key={m.id}
          href={m.href}
          className={`text-[15px] ${active === m.id ? 'font-semibold text-black' : 'text-gray-600'}`}
        >
          {m.name}
        </a>
      ))}
    </div>
  );
}
