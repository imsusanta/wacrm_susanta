'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ChevronsUpDown, ChevronDown, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useWorkspace } from '@/hooks/use-workspace';
import {
  buildVisibleNavigation,
  validateVisibleNavigation,
  type SidebarNavItem,
} from '@/components/layout/sidebar-navigation';
import {
  NAVIGATION_FEATURE_STATUSES,
  NAVIGATION_REGISTRY,
} from '@/components/layout/navigation-registry';

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  mobileTriggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export const NAV = NAVIGATION_REGISTRY;

export function pathIsActive(
  pathname: string,
  searchParams: Pick<URLSearchParams, 'get'>,
  href?: string,
  aliases: string[] = [],
  activeMatchers: SidebarNavItem['activeMatchers'] = []
) {
  if (!href) return false;
  const matches = (candidate: string) => {
    const url = new URL(candidate, 'https://navigation.local');
    if (
      pathname !== url.pathname &&
      (url.pathname === '/dashboard' ||
        !pathname.startsWith(`${url.pathname}/`))
    )
      return false;
    for (const [key, value] of url.searchParams)
      if (searchParams.get(key) !== value) return false;
    return true;
  };
  return (
    [href, ...aliases].some(matches) ||
    activeMatchers.some((matcher) =>
      pathname === matcher.pathname ||
      pathname.startsWith(`${matcher.pathname}/`)
        ? Object.entries(matcher.query ?? {}).every(
            ([key, value]) => searchParams.get(key) === value
          )
        : false
    )
  );
}

export function Sidebar({
  open = false,
  onClose,
  collapsed = false,
  mobileTriggerRef: _mobileTriggerRef,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile, accountRole, isSuperAdmin } = useAuth();
  const {
    terminology,
    currentIndustry,
    manifest,
    isRouteAllowed,
    enabledModules,
  } = useWorkspace();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    crm: true,
    sales: true,
    conversations: false,
    marketing: false,
    whatsapp: false,
    'automation-ai': false,
    calling: true,
    billing: false,
    admin: false,
    settings: false,
  });

  const visibleNav = useMemo(
    () =>
      buildVisibleNavigation({
        navigation: NAV,
        terminology,
        currentIndustry,
        isSuperAdmin,
        isRouteAllowed,
        accountRole,
        routeRoleRequirements: manifest.sidebar,
        manifest,
        enabledModules,
        featureStatuses: NAVIGATION_FEATURE_STATUSES,
      }),
    [
      accountRole,
      currentIndustry,
      enabledModules,
      isRouteAllowed,
      isSuperAdmin,
      manifest,
      terminology,
    ]
  );

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    for (const issue of validateVisibleNavigation(visibleNav))
      console.error(`[navigation] ${issue.message}`);
  }, [visibleNav]);

  const activeParent = useMemo(() => {
    for (const item of visibleNav)
      if (
        item.children?.some((child) =>
          pathIsActive(
            pathname,
            searchParams,
            child.href,
            child.activeHrefs,
            child.activeMatchers
          )
        )
      )
        return item.id;
    return (
      visibleNav.find((item) =>
        pathIsActive(pathname, searchParams, item.href, [], item.activeMatchers)
      )?.id || 'dashboard'
    );
  }, [pathname, searchParams, visibleNav]);

  useEffect(() => {
    if (activeParent && activeParent !== 'dashboard')
      setExpanded((prev) => ({ ...prev, [activeParent]: true }));
  }, [activeParent]);

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs transition-opacity duration-300 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[252px] shrink-0 flex-col bg-[#071426] text-white shadow-[12px_0_40px_rgba(0,0,0,0.16)] transition-[width,transform,box-shadow] duration-300 ease-out lg:static lg:z-auto lg:translate-x-0 lg:shadow-none',
          collapsed && 'lg:w-[72px]',
          open ? 'animate-sidebar-panel-in translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-[76px] items-center justify-between px-5">
          <Link
            href="/dashboard"
            className="animate-brand-in group flex items-center gap-3.5"
            onClick={onClose}
            aria-label="Open dashboard"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/helpa-logo.png?v=4"
              alt="Helpa"
              className="h-10 w-10 rounded-xl object-contain shadow-xs transition-transform duration-300 ease-out group-hover:scale-105 group-hover:rotate-1"
            />
            <div className="leading-tight transition-transform duration-300 group-hover:translate-x-0.5">
              <div className="text-[19px] font-extrabold tracking-tight text-white">
                Helpa
              </div>
              <div className="text-[12px] font-medium text-slate-400">
                Studio
              </div>
            </div>
          </Link>
          <button
            type="button"
            className="group rounded-lg p-1.5 text-slate-400 transition-all duration-200 hover:scale-105 hover:bg-white/5 hover:text-white active:scale-95 lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
          </button>
        </div>
        <div className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:#1e293b_transparent] overflow-y-auto px-3 py-2">
          <nav className="space-y-1" aria-label="Workspace navigation">
            {visibleNav.map((item, index) => {
              const Icon = item.icon;
              const activeDirect = pathIsActive(
                pathname,
                searchParams,
                item.href,
                [],
                item.activeMatchers
              );
              const isParentActive = activeParent === item.id;
              const isExpanded = expanded[item.id];
              const hasChildren = Boolean(item.children?.length);
              if (!hasChildren && item.href)
                return (
                  <Link
                    key={item.id}
                    style={{ ['--i']: index } as React.CSSProperties}
                    data-nav-id={item.id}
                    data-nav-href={item.href}
                    data-nav-source-label={item.sourceLabel}
                    href={item.href}
                    onClick={onClose}
                    aria-current={activeDirect ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'animate-nav-item group relative flex h-[44px] items-center gap-3 overflow-hidden rounded-xl px-3.5 text-[14px] font-medium transition-all duration-200 ease-out hover:translate-x-0.5',
                      activeDirect
                        ? 'bg-emerald-500/15 font-semibold text-white'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] shrink-0 transition-transform duration-200 ease-out group-hover:scale-110',
                        activeDirect
                          ? 'text-[#10b981]'
                          : 'text-slate-400 group-hover:text-slate-200'
                      )}
                    />
                    <span
                      className={cn(
                        'transition-transform duration-200 group-hover:translate-x-0.5',
                        collapsed && 'lg:hidden'
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              return (
                <div
                  key={item.id}
                  style={{ ['--i']: index } as React.CSSProperties}
                  data-nav-id={item.id}
                  data-nav-source-label={item.sourceLabel}
                  className="animate-nav-item space-y-0.5"
                >
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`sidebar-group-${item.id}`}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'group relative flex h-[44px] w-full items-center gap-3 overflow-hidden rounded-xl px-3.5 text-left text-[14px] font-medium transition-all duration-200 ease-out hover:translate-x-0.5',
                      isParentActive
                        ? 'bg-emerald-500/10 font-semibold text-white'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] shrink-0 transition-transform duration-200 ease-out group-hover:scale-110',
                        isParentActive
                          ? 'text-[#10b981]'
                          : 'text-slate-400 group-hover:text-slate-200'
                      )}
                    />
                    <span
                      className={cn(
                        'flex-1 transition-transform duration-200 group-hover:translate-x-0.5',
                        collapsed && 'lg:hidden'
                      )}
                    >
                      {item.label}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:translate-y-0.5" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-500 transition-transform duration-200 group-hover:translate-x-0.5" />
                    )}
                  </button>
                  {isExpanded && item.children && (
                    <div
                      id={`sidebar-group-${item.id}`}
                      className="animate-sidebar-group space-y-0.5 pt-0.5 pr-1 pb-1 pl-9"
                    >
                      {item.children.map((child, childIndex) => {
                        const active = pathIsActive(
                          pathname,
                          searchParams,
                          child.href,
                          child.activeHrefs,
                          child.activeMatchers
                        );
                        return (
                          <Link
                            key={child.id}
                            style={
                              {
                                ['--child-i']: childIndex,
                              } as React.CSSProperties
                            }
                            data-nav-id={child.id}
                            data-nav-parent-id={item.id}
                            data-nav-href={child.href}
                            data-nav-source-label={child.sourceLabel}
                            href={child.href}
                            onClick={onClose}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'animate-sidebar-child group relative flex h-8 items-center rounded-lg px-2.5 text-[13px] font-medium transition-all duration-200 ease-out hover:translate-x-1',
                              active
                                ? 'bg-emerald-500/10 font-semibold text-emerald-50'
                                : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                            )}
                          >
                            {active && (
                              <span className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.45)] transition-transform duration-200 group-hover:scale-125" />
                            )}
                            <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                              {child.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-white/[0.08] px-4 py-3.5">
          <Link
            href="/settings?tab=profile"
            className="group flex items-center gap-3 rounded-xl px-1.5 py-1 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/5"
          >
            {profile?.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={profile.avatar_url}
                alt={profile.full_name || 'Profile'}
                className="h-9 w-9 shrink-0 rounded-full border border-emerald-500/30 object-cover shadow-xs transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  const fallback = e.currentTarget
                    .nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#10b981] text-xs font-bold text-white shadow-xs transition-transform duration-300 group-hover:scale-105',
                profile?.avatar_url && 'hidden'
              )}
            >
              {profile?.full_name
                ? profile.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : 'SU'}
            </div>
            <div className="min-w-0 flex-1 transition-transform duration-200 group-hover:translate-x-0.5">
              <div className="truncate text-[13px] font-semibold text-white">
                {profile?.full_name || 'Account user'}
              </div>
              <div className="text-[11px] text-slate-400 capitalize">
                {profile?.role || 'Admin'}
              </div>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 transition-transform duration-300 group-hover:rotate-180" />
          </Link>
        </div>
      </aside>

      <style jsx global>{`
        @keyframes sidebar-panel-in {
          0% {
            opacity: 0;
            transform: translateX(-18px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes sidebar-group-in {
          0% {
            opacity: 0;
            transform: translateY(-5px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes sidebar-child-in {
          0% {
            opacity: 0;
            transform: translateX(-7px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-sidebar-panel-in {
          animation: sidebar-panel-in 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .animate-sidebar-group-in {
          animation: sidebar-group-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .animate-sidebar-child {
          animation: sidebar-child-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-delay: calc(var(--child-i, 0) * 35ms);
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-sidebar-panel-in,
          .animate-sidebar-group-in,
          .animate-sidebar-child,
          .animate-nav-item,
          .animate-brand-in {
            animation: none !important;
          }
          .transition-all,
          .transition-transform,
          .transition-colors,
          .transition-opacity {
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </>
  );
}
