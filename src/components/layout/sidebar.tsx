'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Home,
  LayoutDashboard,
  Play,
  Settings,
  Users,
  Shield,
  Terminal,
  Layers,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const mainNavItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/sql-editor', label: 'SQL Editor', icon: Terminal },
  { href: '/queries', label: 'Saved Queries', icon: Database },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/charts', label: 'Charts', icon: BarChart3 },
  { href: '/dashboards', label: 'Dashboards', icon: LayoutDashboard },
  { href: '/jobs', label: 'Jobs', icon: Play },
];

const adminNavItems = [
  { href: '/data-sources', label: 'Data Sources', icon: Database },
  { href: '/bull-board', label: 'Queue Management', icon: Layers },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/roles', label: 'Roles', icon: Shield },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const pathname = usePathname();

  const NavItem = ({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: React.ElementType;
  }) => {
    const isActive = pathname === href || pathname.startsWith(href + '/');

    const content = (
      <Link href={href}>
        <Button
          variant={isActive ? 'secondary' : 'ghost'}
          className={cn(
            'w-full justify-start',
            collapsed && 'justify-center px-2'
          )}
        >
          <Icon className={cn('h-5 w-5', !collapsed && 'mr-3')} />
          {!collapsed && <span>{label}</span>}
        </Button>
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <span className="font-semibold">Reports</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/" className="mx-auto">
              <BarChart3 className="h-6 w-6 text-primary" />
            </Link>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="space-y-4 py-4">
            <div className="px-3 py-2">
              {!collapsed && (
                <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                  Main
                </h2>
              )}
              <nav className="space-y-1">
                {mainNavItems.map((item) => (
                  <NavItem key={item.href} {...item} />
                ))}
              </nav>
            </div>

            <Separator />

            <div className="px-3 py-2">
              {!collapsed && (
                <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                  Administration
                </h2>
              )}
              <nav className="space-y-1">
                {adminNavItems.map((item) => (
                  <NavItem key={item.href} {...item} />
                ))}
              </nav>
            </div>
          </div>
        </ScrollArea>

        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background"
          onClick={() => onCollapse(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </aside>
    </TooltipProvider>
  );
}
