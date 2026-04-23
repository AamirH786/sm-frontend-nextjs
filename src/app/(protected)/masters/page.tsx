'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  communicationStylesService,
  departmentsService,
  deliveryService,
  designationsService,
  domainsService,
  emotionsService,
  modesService,
  personasService,
  systemSafetyService,
  tonesService,
} from '@/services/mastersService';
import { avatarsService } from '@/services/avatarsService';
import { aiSettingsService } from '@/services/aiSettingsService';
import { contentPagesService } from '@/services/websiteService';
import { interestsService, supportTypesService, interactionStylesService } from '@/services/onboardingService';
import { heygenService } from '@/services/heygenService';
import { personMastersService } from '@/services/personMastersService';
import { adminLearningService } from '@/services/adminLearningService';
import taskService from '@/services/taskService';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/hooks/useAuth';
import usePermission from '@/hooks/usePermission';
import AccessDenied from '@/components/permissions/AccessDenied';
import { canAccessRule, mastersSections } from '@/lib/appAccess';
import { Briefcase, Brain, Building2, Camera, ClipboardList, FileEdit, Globe, Settings, User, UserCircle, Users } from 'lucide-react';

export default function MastersOverview() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { can } = usePermission();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    character: 0,
    avatars: 0,
    aiSettings: 0,
    websiteSettings: 1,
    contentPages: 0,
    heygenAvatars: 0,
    onboarding: 0,
    learningAdmin: 0,
    departments: 0,
    designations: 0,
    persons: 0,
    taskStatuses: 0,
  });

  const canViewEmotions = canAccessRule(mastersSections.find((section) => section.href === '/masters/character')?.access?.anyOf?.find((rule) => rule.module === 'emotion'), user, can);
  const canViewTones = canAccessRule(mastersSections.find((section) => section.href === '/masters/character')?.access?.anyOf?.find((rule) => rule.module === 'tone'), user, can);
  const canViewCommunicationStyles = canAccessRule(mastersSections.find((section) => section.href === '/masters/character')?.access?.anyOf?.find((rule) => rule.module === 'communication_style'), user, can);
  const canViewModes = canAccessRule(mastersSections.find((section) => section.href === '/masters/character')?.access?.anyOf?.find((rule) => rule.module === 'mode'), user, can);
  const canViewDomains = canAccessRule(mastersSections.find((section) => section.href === '/masters/character')?.access?.anyOf?.find((rule) => rule.module === 'domain'), user, can);
  const canViewDelivery = canAccessRule(mastersSections.find((section) => section.href === '/masters/character')?.access?.anyOf?.find((rule) => rule.module === 'delivery'), user, can);
  const canViewPersonas = canAccessRule(mastersSections.find((section) => section.href === '/masters/character')?.access?.anyOf?.find((rule) => rule.module === 'persona'), user, can);
  const canViewSystemSafety = canAccessRule(mastersSections.find((section) => section.href === '/masters/character')?.access?.anyOf?.find((rule) => rule.module === 'system_safety'), user, can);
  const canViewCharacter = canAccessRule(mastersSections.find((section) => section.href === '/masters/character')?.access, user, can);
  const canViewAvatars = canAccessRule(mastersSections.find((section) => section.href === '/masters/avatars')?.access, user, can);
  const canViewAISettings = canAccessRule(mastersSections.find((section) => section.href === '/masters/ai-settings')?.access, user, can);
  const canViewWebsiteSettings = canAccessRule(mastersSections.find((section) => section.href === '/masters/website-settings')?.access, user, can);
  const canViewContentPages = canAccessRule(mastersSections.find((section) => section.href === '/masters/content-pages')?.access, user, can);
  const canViewHeygenAvatars = canAccessRule(mastersSections.find((section) => section.href === '/masters/heygen-avatars')?.access, user, can);
  const canViewOnboarding = canAccessRule(mastersSections.find((section) => section.href === '/masters/onboarding')?.access, user, can);
  const canViewLearningAdmin = canAccessRule(mastersSections.find((section) => section.href === '/masters/learning-admin')?.access, user, can);
  const canViewDepartments = canAccessRule(mastersSections.find((section) => section.href === '/masters/departments')?.access, user, can);
  const canViewDesignations = canAccessRule(mastersSections.find((section) => section.href === '/masters/designations')?.access, user, can);
  const canViewPersons = canAccessRule(mastersSections.find((section) => section.href === '/masters/persons')?.access, user, can);
  const canViewTaskStatuses = canAccessRule(mastersSections.find((section) => section.href === '/masters/task-statuses')?.access, user, can);

  const visibleSections = useMemo(
    () =>
      mastersSections.filter(
        (section) => section.showInOverview && canAccessRule(section.access, user, can)
      ),
    [user, can]
  );

  useEffect(() => {
    const fetchStats = async () => {
      let hasPartialFailure = false;
      const safeCount = async (loader: () => Promise<number>) => {
        try {
          return await loader();
        } catch {
          hasPartialFailure = true;
          return 0;
        }
      };

      try {
        setLoading(true);
        const [
          characterTotal,
          avatarsTotal,
          aiSettingsTotal,
          contentPagesTotal,
          heygenTotal,
          onboardingTotal,
          learningAdminTotal,
          departmentsTotal,
          designationsTotal,
          personsTotal,
          taskStatusesTotal,
        ] = await Promise.all([
          canViewCharacter
            ? safeCount(async () => {
            const [emotions, tones, styles, modes, domains, delivery, personas, systemSafety] = await Promise.all([
              canViewEmotions ? emotionsService.list({ limit: 1 }) : Promise.resolve({ meta: { total: 0 } }),
              canViewTones ? tonesService.list({ limit: 1 }) : Promise.resolve({ meta: { total: 0 } }),
              canViewCommunicationStyles ? communicationStylesService.list({ limit: 1 }) : Promise.resolve({ meta: { total: 0 } }),
              canViewModes ? modesService.list({ limit: 1 }) : Promise.resolve({ meta: { total: 0 } }),
              canViewDomains ? domainsService.list({ limit: 1 }) : Promise.resolve({ meta: { total: 0 } }),
              canViewDelivery ? deliveryService.list({ limit: 1 }) : Promise.resolve({ meta: { total: 0 } }),
              canViewPersonas ? personasService.list({ limit: 1 }) : Promise.resolve([]),
              canViewSystemSafety ? systemSafetyService.list({ limit: 1 }) : Promise.resolve({ meta: { total: 0 } }),
            ]);

            return (
              emotions.meta.total +
              tones.meta.total +
              styles.meta.total +
              modes.meta.total +
              domains.meta.total +
              delivery.meta.total +
              (Array.isArray(personas) ? personas.length : personas.meta?.total || 0) +
              systemSafety.meta.total
            );
          })
            : Promise.resolve(0),
          canViewAvatars
            ? safeCount(async () => (await avatarsService.list({ limit: 1 })).meta.total)
            : Promise.resolve(0),
          canViewAISettings
            ? safeCount(async () => (await aiSettingsService.list({ limit: 1 })).meta.total)
            : Promise.resolve(0),
          canViewContentPages
            ? safeCount(async () => {
            const response = await contentPagesService.list({ limit: 1 });
            return response.total || 0;
          })
            : Promise.resolve(0),
          canViewHeygenAvatars
            ? safeCount(async () => (await heygenService.listPhotoAvatarGroups()).length)
            : Promise.resolve(0),
          canViewOnboarding
            ? safeCount(async () => {
            const [interests, supportTypes, interactionStyles] = await Promise.all([
              interestsService.list({ limit: 1 }),
              supportTypesService.list({ limit: 1 }),
              interactionStylesService.list({ limit: 1 }),
            ]);

            return (interests.total || 0) + (supportTypes.total || 0) + (interactionStyles.total || 0);
          })
            : Promise.resolve(0),
          canViewLearningAdmin
            ? safeCount(async () => {
            const [intents, categories, subjects, tracks, levels, courses] = await Promise.all([
              adminLearningService.intents.list(),
              adminLearningService.categories.list(),
              adminLearningService.subjects.list(),
              adminLearningService.tracks.list(),
              adminLearningService.levels.list(),
              adminLearningService.courses.list(),
            ]);

            return (
              intents.length +
              categories.length +
              subjects.length +
              tracks.length +
              levels.length +
              courses.length
            );
          })
            : Promise.resolve(0),
          canViewDepartments
            ? safeCount(async () => (await departmentsService.list({ limit: 1 })).meta.total)
            : Promise.resolve(0),
          canViewDesignations
            ? safeCount(async () => (await designationsService.list({ limit: 1 })).meta.total)
            : Promise.resolve(0),
          canViewPersons
            ? safeCount(async () => (await personMastersService.list({ limit: 1 })).meta.total)
            : Promise.resolve(0),
          canViewTaskStatuses
            ? safeCount(async () => (await taskService.listStatuses()).length)
            : Promise.resolve(0),
        ]);

        setCounts({
          character: characterTotal,
          avatars: avatarsTotal,
          aiSettings: aiSettingsTotal,
          websiteSettings: 1,
          contentPages: contentPagesTotal,
          heygenAvatars: heygenTotal,
          onboarding: onboardingTotal,
          learningAdmin: learningAdminTotal,
          departments: departmentsTotal,
          designations: designationsTotal,
          persons: personsTotal,
          taskStatuses: taskStatusesTotal,
        });

        if (hasPartialFailure) {
          showToast('Some masters analytics could not be loaded. Showing available totals.', 'error');
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load stats', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [
    canViewAISettings,
    canViewAvatars,
    canViewCommunicationStyles,
    canViewCharacter,
    canViewContentPages,
    canViewDelivery,
    canViewDepartments,
    canViewDesignations,
    canViewDomains,
    canViewEmotions,
    canViewHeygenAvatars,
    canViewLearningAdmin,
    canViewModes,
    canViewOnboarding,
    canViewPersonas,
    canViewPersons,
    canViewSystemSafety,
    canViewTaskStatuses,
    canViewTones,
    showToast,
  ]);

  const groups = [
    {
      title: 'Character',
      description: 'Manage character traits including emotions, tones, communication styles, modes, domains, delivery, and system safety settings',
      count: counts.character,
      href: '/masters/character',
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      icon: Users,
      sections: 8,
      subtitle: 'Total records across 8 sections',
    },
    {
      title: 'Avatars',
      description: 'Create and manage AI avatars with prompts by combining character details with master configurations',
      count: counts.avatars,
      href: '/masters/avatars',
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      icon: User,
      sections: 0,
      subtitle: 'Total avatars',
    },
    {
      title: 'AI Settings',
      description: 'Configure AI provider settings, API keys, models, and endpoints for avatar responses',
      count: counts.aiSettings,
      href: '/masters/ai-settings',
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      icon: Settings,
      sections: 0,
      subtitle: 'Total configurations',
    },
    {
      title: 'Website Settings',
      description: 'Manage website configuration including name, contact details, branding and about us content',
      count: counts.websiteSettings,
      href: '/masters/website-settings',
      color: 'bg-cyan-500',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-600',
      icon: Globe,
      sections: 0,
      subtitle: 'Configuration',
    },
    {
      title: 'Content Pages',
      description: 'Create and manage website content pages like About Us, Privacy Policy, Terms of Service',
      count: counts.contentPages,
      href: '/masters/content-pages',
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      icon: FileEdit,
      sections: 0,
      subtitle: 'Total pages',
    },
    {
      title: 'HeyGen Avatars',
      description: 'Manage photo avatars in your HeyGen account - view, list and delete avatars',
      count: counts.heygenAvatars,
      href: '/masters/heygen-avatars',
      color: 'bg-pink-500',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-600',
      icon: Camera,
      sections: 0,
      subtitle: 'Total photo avatars',
    },
    {
      title: 'Onboarding Questions',
      description: 'Manage onboarding masters including interests, support types, and interaction styles',
      count: counts.onboarding,
      href: '/masters/onboarding',
      color: 'bg-rose-500',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-600',
      icon: ClipboardList,
      sections: 3,
      subtitle: 'Total records across 3 sections',
    },
    {
      title: 'Learning Admin',
      description: 'Control the adaptive LMS system including intents, learning structure, course builder, quiz engine, avatar mapping, checkpoints and runtime configurations',
      count: counts.learningAdmin,
      href: '/masters/learning-admin',
      color: 'bg-slate-500',
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-600',
      icon: Brain,
      sections: 8,
      subtitle: 'LMS control center',
    },
    {
      title: 'Departments',
      description: 'Manage department masters used across employees, teams and internal access workflows',
      count: counts.departments,
      href: '/masters/departments',
      color: 'bg-sky-500',
      bgColor: 'bg-sky-50',
      textColor: 'text-sky-600',
      icon: Building2,
      sections: 0,
      subtitle: 'Total departments',
    },
    {
      title: 'Designations',
      description: 'Manage role titles and designation masters for admin and employee records',
      count: counts.designations,
      href: '/masters/designations',
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      icon: Briefcase,
      sections: 0,
      subtitle: 'Total designations',
    },
    {
      title: 'Person Master',
      description: 'Register people with photos, face descriptors and knowledge documents for AI-powered face recognition and contextual briefing',
      count: counts.persons,
      href: '/masters/persons',
      color: 'bg-teal-500',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-600',
      icon: UserCircle,
      sections: 0,
      subtitle: 'Registered people',
    },
    {
      title: 'Task Statuses',
      description: 'Manage task pipeline stages used across task creation, assignment and progress tracking flows',
      count: counts.taskStatuses,
      href: '/masters/task-statuses',
      color: 'bg-lime-500',
      bgColor: 'bg-lime-50',
      textColor: 'text-lime-600',
      icon: ClipboardList,
      sections: 0,
      subtitle: 'Total task statuses',
    },
  ].filter((group) => visibleSections.some((section) => section.href === group.href));

  if (!groups.length) {
    return (
      <AccessDenied
        title="Masters unavailable"
        description="Your role does not have access to any masters section."
      />
    );
  }

  return (
    <div className="px-6 md:px-10 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Masters Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Manage master data groups and their configurations</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Link
              key={group.title}
              href={group.href}
              className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{group.title}</p>
                  <p className="text-3xl font-bold mt-2">{group.count}</p>
                  <p className="text-gray-500 text-xs mt-1">{group.subtitle}</p>
                </div>
                <div className={`w-12 h-12 ${group.bgColor} rounded-lg flex items-center justify-center`}>
                  <group.icon size={24} className={group.textColor} />
                </div>
              </div>
              <p className="text-gray-500 text-sm mt-4 line-clamp-2">{group.description}</p>
              <div className="mt-4 pt-4 border-t">
                <span className="text-sm text-primary-600 hover:underline">Manage {group.title.toLowerCase()} &rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
