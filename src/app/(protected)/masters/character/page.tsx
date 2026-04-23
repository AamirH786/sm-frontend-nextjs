'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { emotionsService, tonesService, communicationStylesService, modesService, domainsService, deliveryService,personasService , systemSafetyService } from '@/services/mastersService';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/hooks/useAuth';
import usePermission from '@/hooks/usePermission';
import AccessDenied from '@/components/permissions/AccessDenied';
import { canAccessRule, characterSections } from '@/lib/appAccess';
import { Heart, Music, MessageCircle, Sliders, Globe, Truck, ShieldCheck, User } from 'lucide-react';

interface SectionStats {
  emotions: number;
  tones: number;
  communicationStyles: number;
  modes: number;
  domains: number;
  delivery: number;
  systemSafety: number;
  personas: number;
}

export default function CharacterOverview() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { can } = usePermission();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SectionStats>({
    emotions: 0,
    tones: 0,
    communicationStyles: 0,
    modes: 0,
    domains: 0,
    delivery: 0,
    systemSafety: 0,
    personas:0,
  });

  const canViewEmotions = canAccessRule(characterSections.find((section) => section.href === '/masters/character/emotions')?.access, user, can);
  const canViewTones = canAccessRule(characterSections.find((section) => section.href === '/masters/character/tones')?.access, user, can);
  const canViewCommunicationStyles = canAccessRule(characterSections.find((section) => section.href === '/masters/character/communication-styles')?.access, user, can);
  const canViewModes = canAccessRule(characterSections.find((section) => section.href === '/masters/character/modes')?.access, user, can);
  const canViewDomains = canAccessRule(characterSections.find((section) => section.href === '/masters/character/domains')?.access, user, can);
  const canViewDelivery = canAccessRule(characterSections.find((section) => section.href === '/masters/character/delivery')?.access, user, can);
  const canViewPersonas = canAccessRule(characterSections.find((section) => section.href === '/masters/character/personas')?.access, user, can);
  const canViewSystemSafety = canAccessRule(characterSections.find((section) => section.href === '/masters/character/system-safety')?.access, user, can);

  const visibleSections = useMemo(
    () => characterSections.filter((section) => canAccessRule(section.access, user, can)),
    [user, can]
  );

  useEffect(() => {
    const fetchStats = async () => {
      let hasPartialFailure = false;
      const safeTotal = async (
        loader: () => Promise<{ meta?: { total?: number } }>
      ) => {
        try {
          const result = await loader();
          return result.meta?.total ?? 0;
        } catch {
          hasPartialFailure = true;
          return 0;
        }
      };

      try {
        setLoading(true);
        const [emotions, tones, styles, modes, domains, delivery, systemSafety, personas] = await Promise.all([
          canViewEmotions
            ? safeTotal(() => emotionsService.list({ limit: 1 }))
            : Promise.resolve(0),
          canViewTones
            ? safeTotal(() => tonesService.list({ limit: 1 }))
            : Promise.resolve(0),
          canViewCommunicationStyles
            ? safeTotal(() => communicationStylesService.list({ limit: 1 }))
            : Promise.resolve(0),
          canViewModes
            ? safeTotal(() => modesService.list({ limit: 1 }))
            : Promise.resolve(0),
          canViewDomains
            ? safeTotal(() => domainsService.list({ limit: 1 }))
            : Promise.resolve(0),
          canViewDelivery
            ? safeTotal(() => deliveryService.list({ limit: 1 }))
            : Promise.resolve(0),
          canViewSystemSafety
            ? safeTotal(() => systemSafetyService.list({ limit: 1 }))
            : Promise.resolve(0),
          canViewPersonas
            ? (async () => {
                try {
                  const result = await personasService.list({ limit: 500 });
                  return Array.isArray(result.data) ? result.data.length : result.meta?.total ?? 0;
                } catch {
                  hasPartialFailure = true;
                  return 0;
                }
              })()
            : Promise.resolve(0),
        ]);
        
        setStats({
          emotions,
          tones,
          communicationStyles: styles,
          modes,
          domains,
          delivery,
          systemSafety,
          personas,
        });
        if (hasPartialFailure) {
          showToast('Some character totals could not be loaded. Showing available counts.', 'error');
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load stats', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [
    canViewCommunicationStyles,
    canViewDelivery,
    canViewDomains,
    canViewEmotions,
    canViewModes,
    canViewPersonas,
    canViewSystemSafety,
    canViewTones,
    showToast,
  ]);

  const cards = [
    {
      title: 'Emotions',
      count: stats.emotions,
      icon: Heart,
      href: '/masters/character/emotions',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
    },
    {
      title: 'Tones',
      count: stats.tones,
      icon: Music,
      href: '/masters/character/tones',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Communication Styles',
      count: stats.communicationStyles,
      icon: MessageCircle,
      href: '/masters/character/communication-styles',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Modes',
      count: stats.modes,
      icon: Sliders,
      href: '/masters/character/modes',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'Domains',
      count: stats.domains,
      icon: Globe,
      href: '/masters/character/domains',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
    {
      title: 'Delivery',
      count: stats.delivery,
      icon: Truck,
      href: '/masters/character/delivery',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-600',
    },
    {
      title: 'System Safety',
      count: stats.systemSafety,
      icon: ShieldCheck,
      href: '/masters/character/system-safety',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
  title: 'Personas',
  count: stats.personas,
  icon: User,
  href: '/masters/character/personas',
  bgColor: 'bg-indigo-50',
  textColor: 'text-indigo-600',
}
  ].filter((card) =>
    visibleSections.some((section) => section.href === card.href)
  );

  if (!cards.length) {
    return (
      <AccessDenied
        title="Character masters unavailable"
        description="Your role does not have access to any character master section."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Character Overview</h2>
        <p className="text-gray-500 text-sm mt-1">Manage character traits and configurations</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="bg-white border rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{card.title}</p>
                  <p className="text-2xl font-bold mt-1">{card.count}</p>
                </div>
                <div className={`w-10 h-10 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <card.icon size={20} className={card.textColor} />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <span className="text-xs text-primary-600 hover:underline">View all &rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
