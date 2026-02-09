'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, LogOut, Moon, Settings, Sun, User, Database, Loader2, Check, X, CheckCheck } from 'lucide-react';
import { useActiveDataSource } from '@/lib/hooks/use-active-datasource';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { activeDataSource, isLoading } = useActiveDataSource();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showReadNotifications, setShowReadNotifications] = useState(false);

  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || user.email?.[0].toUpperCase() || 'U';

  // Fetch notifications
  const { data: notifications = [], isLoading: isLoadingNotifications } = useQuery({
    queryKey: ['notifications', showReadNotifications],
    queryFn: async () => {
      const includeRead = showReadNotifications ? 'true' : 'false';
      const res = await fetch(`/api/notifications?includeRead=${includeRead}`);
      const data = await res.json();
      return data.data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get unread count
  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter((n: any) => !n.is_read);
      await Promise.all(
        unread.map((n: any) =>
          fetch(`/api/notifications/${n.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true }),
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted');
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <X className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <div className="h-4 w-4 rounded-full bg-yellow-500" />;
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-blue-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        {/* Active Data Source */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading connection...</span>
          </div>
        ) : activeDataSource ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => router.push('/data-sources')}
          >
            <Database className="h-4 w-4 text-green-500" />
            <span>{activeDataSource.name}</span>
            <Badge variant="secondary" className="text-xs">
              {activeDataSource.client_type}
            </Badge>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => router.push('/data-sources')}
          >
            <Database className="h-4 w-4 text-muted-foreground" />
            <span>No connection</span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 p-0" align="end">
            <DropdownMenuLabel className="border-b p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Notifications</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setShowReadNotifications(!showReadNotifications)}
                >
                  {showReadNotifications ? 'Hide Read' : 'Show All'}
                </Button>
              </div>
            </DropdownMenuLabel>

            {isLoadingNotifications ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              <>
                <ScrollArea className="h-96">
                  <div className="p-2">
                    {notifications.map((notification: any) => (
                      <div
                        key={notification.id}
                        className={`mb-2 rounded-lg border p-3 transition-colors hover:bg-accent ${
                          !notification.is_read ? 'bg-accent/50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none">{notification.title}</p>
                            <p className="text-xs text-muted-foreground">{notification.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => markAsReadMutation.mutate(notification.id)}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => deleteNotificationMutation.mutate(notification.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {unreadCount > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => markAllAsReadMutation.mutate()}
                      >
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Mark all as read
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
