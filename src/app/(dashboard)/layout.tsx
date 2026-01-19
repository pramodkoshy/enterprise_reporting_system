import { AppShell } from '@/components/layout/app-shell';
import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
