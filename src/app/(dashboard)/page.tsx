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

const stats = [
  { title: 'Total Reports', value: '24', icon: FileText },
  { title: 'Active Charts', value: '12', icon: BarChart3 },
  { title: 'Dashboards', value: '8', icon: LayoutDashboard },
  { title: 'Scheduled Jobs', value: '5', icon: Clock },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Enterprise Reporting System
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
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
