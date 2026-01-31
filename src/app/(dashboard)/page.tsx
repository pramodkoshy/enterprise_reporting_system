import { getDb } from '@/lib/db/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart3,
  Database,
  FileText,
  LayoutDashboard,
  Play,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth/config';

const quickLinks = [
  {
    title: 'SQL Editor',
    description: 'Write and execute SQL queries',
    href: '/sql-editor',
    icon: Database,
  },
  {
    title: 'Reports',
    description: 'View and manage reports',
    href: '/reports',
    icon: FileText,
  },
  {
    title: 'Charts',
    description: 'Create data visualizations',
    href: '/charts',
    icon: BarChart3,
  },
  {
    title: 'Dashboards',
    description: 'Build interactive dashboards',
    href: '/dashboards',
    icon: LayoutDashboard,
  },
];

async function getDashboardStats() {
  const db = getDb();

  // Helper to safely get count from a table
  const safeCount = async (tableName: string, column = '*') => {
    try {
      const result = await db(tableName).count(`${column} as count`).first();
      return Number((result as any)?.count || 0);
    } catch (error: any) {
      // Table doesn't exist or other error
      if (error.message?.includes('no such table')) {
        return 0;
      }
      console.error(`Error counting ${tableName}:`, error);
      return 0;
    }
  };

  // Get scheduled jobs count separately
  const getJobsCount = async () => {
    try {
      const result = await db('job_definitions')
        .whereNotNull('schedule_cron')
        .count('* as count')
        .first();
      return Number((result as any)?.count || 0);
    } catch (error: any) {
      if (error.message?.includes('no such table')) {
        return 0;
      }
      console.error('Error counting jobs:', error);
      return 0;
    }
  };

  const [reportsCount, chartsCount, dashboardsCount, jobsCount] = await Promise.all([
    safeCount('report_definitions'),
    safeCount('chart_definitions'),
    safeCount('dashboard_layouts'),
    getJobsCount(),
  ]);

  return {
    reports: reportsCount,
    charts: chartsCount,
    dashboards: dashboardsCount,
    jobs: jobsCount,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();

  const statItems = [
    {
      title: 'Total Reports',
      value: stats.reports.toString(),
      icon: FileText,
      href: '/reports',
    },
    {
      title: 'Active Charts',
      value: stats.charts.toString(),
      icon: BarChart3,
      href: '/charts',
    },
    {
      title: 'Dashboards',
      value: stats.dashboards.toString(),
      icon: LayoutDashboard,
      href: '/dashboards',
    },
    {
      title: 'Scheduled Jobs',
      value: stats.jobs.toString(),
      icon: Clock,
      href: '/jobs',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Enterprise Reporting System
          {session?.user?.email && ` - ${session.user.email}`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statItems.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-accent hover:shadow-md transition-all cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <link.icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{link.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {link.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Recent Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No recent job executions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
