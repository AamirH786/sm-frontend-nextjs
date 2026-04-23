'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';
import { interestsService, supportTypesService, interactionStylesService } from '@/services/onboardingService';
import { useAuth } from '@/hooks/useAuth';
import usePermission from '@/hooks/usePermission';
import AccessDenied from '@/components/permissions/AccessDenied';
import { canAccessRule, onboardingSections } from '@/lib/appAccess';
import { Heart, HandHelping, MessageCircle } from 'lucide-react';

interface SectionStat {
  total: number;
  active: number;
}

export default function OnboardingOverview() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { can } = usePermission();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    interests: { total: 0, active: 0 },
    supportTypes: { total: 0, active: 0 },
    interactionStyles: { total: 0, active: 0 },
  });

  const canViewInterests = canAccessRule(onboardingSections.find((section) => section.href === '/masters/onboarding/interests')?.access, user, can);
  const canViewSupportTypes = canAccessRule(onboardingSections.find((section) => section.href === '/masters/onboarding/support-types')?.access, user, can);
  const canViewInteractionStyles = canAccessRule(onboardingSections.find((section) => section.href === '/masters/onboarding/interaction-styles')?.access, user, can);

  const visibleSections = useMemo(
    () => onboardingSections.filter((section) => canAccessRule(section.access, user, can)),
    [user, can]
  );

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [interests, supportTypes, interactionStyles] = await Promise.all([
          canViewInterests
            ? interestsService.list({ limit: 1 })
            : Promise.resolve({ total: 0 }),
          canViewSupportTypes
            ? supportTypesService.list({ limit: 1 })
            : Promise.resolve({ total: 0 }),
          canViewInteractionStyles
            ? interactionStylesService.list({ limit: 1 })
            : Promise.resolve({ total: 0 }),
        ]);

        setStats({
          interests: { total: interests.total || 0, active: 0 },
          supportTypes: { total: supportTypes.total || 0, active: 0 },
          interactionStyles: { total: interactionStyles.total || 0, active: 0 },
        });
      } catch (err: any) {
        showToast(err.message || 'Failed to load stats', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [canViewInteractionStyles, canViewInterests, canViewSupportTypes, showToast]);

  const sections = [
    {
      name: 'Interests',
      href: '/masters/onboarding/interests',
      icon: Heart,
      total: stats.interests.total,
      color: 'bg-pink-500',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-600',
    },
    {
      name: 'Support Types',
      href: '/masters/onboarding/support-types',
      icon: HandHelping,
      total: stats.supportTypes.total,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      name: 'Interaction Styles',
      href: '/masters/onboarding/interaction-styles',
      icon: MessageCircle,
      total: stats.interactionStyles.total,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
  ].filter((section) =>
    visibleSections.some((visibleSection) => visibleSection.href === section.href)
  );

  if (!sections.length) {
    return (
      <AccessDenied
        title="Onboarding unavailable"
        description="Your role does not have access to onboarding master data."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Onboarding Questions Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Manage onboarding master data for user preferences</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sections.map((section) => (
            <Link
              key={section.name}
              href={section.href}
              className="bg-white border rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{section.name}</p>
                  <p className="text-2xl font-bold mt-1">{section.total}</p>
                  <p className="text-xs text-gray-500 mt-1">Total records</p>
                </div>
                <div className={`w-10 h-10 ${section.bgColor} rounded-lg flex items-center justify-center`}>
                  <section.icon size={20} className={section.textColor} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
