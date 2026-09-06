'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Bot,
  History,
  Phone,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/calling', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/calling/agents', label: 'Calling Agents', icon: Bot },
  { href: '/calling/calls', label: 'Calls History', icon: History },
  { href: '/calling/phone-numbers', label: 'Phone Numbers', icon: Phone },
  { href: '/calling/settings', label: 'Settings', icon: Settings },
];

export function CallingNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 border-b pb-3 mb-6 overflow-x-auto">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap',
              isActive
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
