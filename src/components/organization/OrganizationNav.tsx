'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function OrganizationNav() {
  const { userContext, logout } = useAuth();
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  if (!userContext || userContext.context_type !== 'contact_person') {
    return null;
  }

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard">
              <span className="text-xl font-bold text-blue-600">SummonMind</span>
            </Link>
            <nav className="flex gap-6">
              <button
                onClick={() => handleNavigation('/organization')}
                className="text-gray-700 hover:text-blue-600 font-medium text-sm"
              >
                Organization
              </button>
              <button
                onClick={() => handleNavigation('/dashboard')}
                className="text-gray-700 hover:text-blue-600 font-medium text-sm"
              >
                Dashboard
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {userContext.organization?.name}
              </p>
              <p className="text-xs text-gray-500">Contact Person</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
