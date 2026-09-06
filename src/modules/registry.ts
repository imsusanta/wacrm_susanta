import { IndustryModule } from './types';
import { healthModule } from './health';
import { coachingModule } from './coaching';
import { realEstateModule } from './real-estate';
import { travelModule } from './travel';
import { gymModule } from './gym';
import { restaurantModule } from './restaurant';
import { soloTeacherModule } from './solo-teacher';
import { salonModule } from './salon';
import { withIntentFulfillmentPolicy } from '@/core/ai/intent-fulfillment';
import {
  INDUSTRY_ALIASES,
  getIndustryTerminology,
  resolveIndustryAlias,
} from './terminology';

function withTerminology(
  industryModule: IndustryModule,
  industry: string
): IndustryModule {
  return {
    ...industryModule,
    terminology: getIndustryTerminology(industry),
  };
}

const canonicalHealthModule = withTerminology(healthModule, 'hospital_clinic');

export const generalModule: IndustryModule = {
  id: 'general',
  name: 'General CRM',
  description: 'AI General Assistant',
  status: 'ACTIVE',
  terminology: getIndustryTerminology('general'),
  allowedRoutes: [
    '/dashboard',
    '/dashboard/analytics',
    '/inbox',
    '/contacts',
    '/leads',
    '/customers',
    '/pipelines',
    '/follow-ups',
    '/broadcasts',
    '/campaign-reports',
    '/lead-forms',
    '/knowledge-base',
    '/settings',
    '/admin',
    '/billing',
    '/invoices',
    '/automations',
    '/integrations',
  ],
  sidebar: [
    { href: '/dashboard', label: 'Dashboard', iconName: 'LayoutDashboard' },
    { href: '/inbox', label: 'WhatsApp Chats', iconName: 'MessageSquare' },
    { href: '/contacts', label: 'Contacts', iconName: 'Users' },
    {
      href: '/broadcasts',
      label: 'Campaigns',
      iconName: 'Megaphone',
      roleMin: 'admin',
    },
    {
      href: '/knowledge-base',
      label: 'Knowledge Base',
      iconName: 'FileText',
    },
    { href: '/settings', label: 'Settings', iconName: 'Settings' },
  ],
  dashboardMetrics: [
    {
      key: 'conversations_active',
      label: 'Active Chats',
      iconName: 'MessageSquare',
      queryTable: 'conversations',
      queryType: 'count',
    },
  ],
  systemPrompt:
    'You are acting as a helpful and polite AI Assistant. Assist the client with generic details and hand off to human agents when requested.',
  kbTemplates: [
    {
      category: 'faq',
      questionTitle: 'Company Hours',
      answerContent: 'We are open Monday to Friday from 9:00 AM to 6:00 PM.',
    },
  ],
  campaignTemplates: [
    {
      name: 'General Offer Newsletter',
      category: 'General Announcement',
      messageBody:
        'Hello {{Name}}, thank you for being a valued customer. Check out our website for updates!',
      ctaType: 'none',
    },
  ],
  copilotConfig: {
    summaryFields: ['status'],
    quickActions: [],
  },
  pipelineStages: [
    { name: 'New Lead', position: 1, color: '#3b82f6' },
    { name: 'Won', position: 2, color: '#10b981' },
    { name: 'Lost', position: 3, color: '#ef4444' },
  ],
  workflows: [],
  entityConfigs: {
    contacts: {
      tableName: 'contacts',
      label: 'Contact',
      pluralLabel: 'Contacts',
      fields: [],
    },
  },
};

export const INDUSTRY_REGISTRY: Record<string, IndustryModule> = {
  hospital_clinic: canonicalHealthModule,
  coaching: withTerminology(coachingModule, 'coaching'),
  real_estate: withTerminology(realEstateModule, 'real_estate'),
  travel: withTerminology(travelModule, 'travel'),
  gym: withTerminology(gymModule, 'gym'),
  restaurant: withTerminology(restaurantModule, 'restaurant'),
  solo_teacher: withTerminology(soloTeacherModule, 'solo_teacher'),
  salon: withTerminology(salonModule, 'salon'),
  general: generalModule,
};

export { INDUSTRY_ALIASES };

export interface BusinessTypeOption {
  id: string;
  label: string;
  description: string;
  emoji: string;
  iconName: string;
}

const BUSINESS_TYPE_CATALOG: readonly BusinessTypeOption[] = [
  {
    id: 'hospital_clinic',
    label: 'Health',
    description: 'Clinics, hospitals and healthcare businesses.',
    emoji: '🏥',
    iconName: 'Activity',
  },
  {
    id: 'travel',
    label: 'Travel',
    description: 'Travel agencies, tour operators and travel businesses.',
    emoji: '✈️',
    iconName: 'Plane',
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    description: 'Restaurants, cafes and food businesses.',
    emoji: '🍽️',
    iconName: 'UtensilsCrossed',
  },
  {
    id: 'coaching',
    label: 'Education',
    description:
      'Coaching centers, institutes, tutors and education businesses.',
    emoji: '🎓',
    iconName: 'GraduationCap',
  },
  {
    id: 'salon',
    label: 'Salon',
    description: 'Salons, spas and beauty businesses.',
    emoji: '💇',
    iconName: 'Scissors',
  },
  {
    id: 'real_estate',
    label: 'Real Estate',
    description: 'Property dealers, brokers and real estate agencies.',
    emoji: '🏠',
    iconName: 'Building2',
  },
  {
    id: 'gym',
    label: 'Fitness',
    description: 'Gyms, fitness centers and trainers.',
    emoji: '🏋️',
    iconName: 'Dumbbell',
  },
  {
    id: 'general',
    label: 'Other Business',
    description: 'Other businesses and professional services.',
    emoji: '💼',
    iconName: 'Briefcase',
  },
] as const;

export function isValidIndustry(industry: unknown): boolean {
  if (!industry || typeof industry !== 'string') return false;
  const normalized = industry.trim().toLowerCase();
  return Boolean(
    INDUSTRY_ALIASES[normalized as keyof typeof INDUSTRY_ALIASES] ||
      INDUSTRY_REGISTRY[normalized]
  );
}

export function resolveCanonicalIndustry(industry: string): string {
  return resolveIndustryAlias(industry);
}

export function getIndustryModule(
  industry: string | null | undefined
): IndustryModule {
  if (!industry) return generalModule;
  const industryKey = resolveIndustryAlias(industry);
  return INDUSTRY_REGISTRY[industryKey] || generalModule;
}

export function isSelectableIndustry(industry: unknown): boolean {
  if (!isValidIndustry(industry)) return false;
  return getIndustryModule(String(industry)).status === 'ACTIVE';
}

/** Runtime consumers must never execute manifests that are not released. */
export function getExecutableIndustryModule(
  industry: string | null | undefined
): IndustryModule {
  const industryModule = getIndustryModule(industry);
  return industryModule.status === 'ACTIVE' ? industryModule : generalModule;
}

/** Only released industries are offered during signup and onboarding. */
export const BUSINESS_TYPE_OPTIONS: readonly BusinessTypeOption[] =
  BUSINESS_TYPE_CATALOG.filter((option) => isSelectableIndustry(option.id));

export function resolveSystemPrompt(
  industry: string | null | undefined,
  customPrompt: string | null | undefined
): string {
  const industryModule = getExecutableIndustryModule(industry);
  const prompt = customPrompt?.trim();
  const selectedPrompt = prompt || industryModule.systemPrompt;
  return withIntentFulfillmentPolicy(selectedPrompt, industryModule.id);
}

export * from './types';
export * from './registry';
