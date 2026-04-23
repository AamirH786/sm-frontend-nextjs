'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getContextAwareDefaultRoute } from '@/lib/appAccess';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user, userContext } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push(getContextAwareDefaultRoute(user, userContext));
    } else {
      router.push('/login');
    }
  }, [isAuthenticated, router, user, userContext]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  );
}
