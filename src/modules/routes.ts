import type { IndustryModule } from './types';

const SHARED_WORKSPACE_ROUTES = [
  '/dashboard',
  '/inbox',
  '/contacts',
  '/leads',
  '/customers',
  '/deals',
  '/pipelines',
  '/follow-ups',
  '/settings',
  '/broadcasts',
  '/campaign-reports',
  '/lead-forms',
  '/knowledge-base',
  '/chatbot',
  '/faq-bot',
  '/admin',
  '/billing',
  '/invoices',
  '/automations',
  '/integrations',
  '/calling',
  '/help',
  '/analytics',
] as const;

/**
 * Routes owned by an industry module must never be treated as shared routes.
 * Keep this registry beside the route gate so adding a feature cannot
 * accidentally expose it through the generic CRM navigation or guard.
 */
export const INDUSTRY_ROUTE_OWNERS = [
  {
    route: '/appointments',
    industries: ['hospital_clinic', 'salon', 'travel'],
  },
  {
    route: '/patients',
    industries: ['hospital_clinic'],
  },
  {
    route: '/doctors',
    industries: ['hospital_clinic'],
  },
  {
    route: '/departments',
    industries: ['hospital_clinic'],
  },
  {
    route: '/lab-reports',
    industries: ['hospital_clinic'],
  },
  {
    route: '/website',
    industries: ['hospital_clinic'],
  },
  { route: '/booking-trip', industries: ['travel'] },
  { route: '/bookings', industries: ['travel'] },
  { route: '/trip-proposals', industries: ['travel'] },
  { route: '/packages', industries: ['travel'] },
  { route: '/tour-packages', industries: ['travel'] },
  { route: '/quotations', industries: ['travel'] },
  { route: '/admissions', industries: ['coaching'] },
  { route: '/courses', industries: ['coaching', 'solo_teacher'] },
  { route: '/classes', industries: ['coaching', 'solo_teacher'] },
  { route: '/students', industries: ['coaching', 'solo_teacher'] },
  { route: '/teachers', industries: ['coaching', 'solo_teacher'] },
  { route: '/members', industries: ['gym'] },
  { route: '/memberships', industries: ['gym'] },
  { route: '/trainers', industries: ['gym'] },
  { route: '/orders', industries: ['restaurant'] },
  { route: '/reservations', industries: ['restaurant'] },
  { route: '/tables', industries: ['restaurant'] },
  { route: '/properties', industries: ['real_estate'] },
  { route: '/agents', industries: ['real_estate'] },
  { route: '/site-visits', industries: ['real_estate'] },
  { route: '/services', industries: ['salon'] },
  { route: '/staff', industries: ['salon'] },
] as const;

function pathMatchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isIndustryRouteAllowed(
  manifest: IndustryModule,
  pathname: string
) {
  const canonicalIndustry = manifest.id;
  const owner = INDUSTRY_ROUTE_OWNERS.find(({ route }) =>
    pathMatchesRoute(pathname, route)
  );
  if (owner)
    return (owner.industries as readonly string[]).includes(canonicalIndustry);

  if (
    SHARED_WORKSPACE_ROUTES.some((route) => pathMatchesRoute(pathname, route))
  ) {
    return true;
  }

  if (manifest.allowedRoutes && manifest.allowedRoutes.length > 0) {
    return manifest.allowedRoutes.some((route) =>
      pathMatchesRoute(pathname, route)
    );
  }

  return false;
}
