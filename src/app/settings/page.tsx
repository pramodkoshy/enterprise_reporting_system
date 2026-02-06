'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Database, Bell, Users as UsersIcon } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to email settings by default
    router.push('/settings/email');
  }, [router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          <Link href="/settings/email">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <CardTitle>Email Settings</CardTitle>
              </div>
              <CardDescription>
                Configure email server settings for notifications
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Data Sources</CardTitle>
            </div>
            <CardDescription>
              Manage database connections (Coming Soon)
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure notification preferences (Coming Soon)
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              <CardTitle>Account</CardTitle>
            </div>
            <CardDescription>
              Manage your account settings (Coming Soon)
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
