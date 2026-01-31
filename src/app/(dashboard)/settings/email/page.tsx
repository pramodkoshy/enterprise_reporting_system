'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Mail,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Settings,
  Bell,
} from 'lucide-react';

export default function EmailSettingsPage() {
  const [testEmail, setTestEmail] = useState('');

  const { data: config, isLoading } = useQuery({
    queryKey: ['email-config'],
    queryFn: async () => {
      const res = await fetch('/api/settings/email');
      const data = await res.json();
      return data.data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Email configuration verified successfully');
      } else {
        toast.error(data.error?.message || 'Verification failed');
      }
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', to: testEmail }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Test email sent successfully');
      } else {
        toast.error(data.error?.message || 'Failed to send test email');
      }
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Settings</h1>
          <p className="text-muted-foreground">
            Configure email notifications for job completion
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => verifyMutation.mutate()}
            disabled={verifyMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${verifyMutation.isPending ? 'animate-spin' : ''}`} />
            Verify Connection
          </Button>
        </div>
      </div>

      <Tabs defaultValue="configuration">
        <TabsList>
          <TabsTrigger value="configuration">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Mail className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="test">
            <Send className="h-4 w-4 mr-2" />
            Test Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuration">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>SMTP Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <p className="text-muted-foreground">Loading configuration...</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Status</Label>
                        <Badge variant={config?.configured ? 'default' : 'secondary'}>
                          {config?.configured ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Configured
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Not Configured
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>SMTP Host</Label>
                      <Input
                        value={config?.host || ''}
                        disabled
                        placeholder="smtp.gmail.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        Set via SMTP_HOST environment variable
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>SMTP Port</Label>
                      <Input
                        value={config?.port || ''}
                        disabled
                        placeholder="587"
                      />
                      <p className="text-xs text-muted-foreground">
                        Set via SMTP_PORT environment variable
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Use SSL/TLS</Label>
                        <p className="text-xs text-muted-foreground">
                          Enable secure connection
                        </p>
                      </div>
                      <Switch checked={config?.secure} disabled />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sender Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <p className="text-muted-foreground">Loading configuration...</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>From Email</Label>
                      <Input
                        value={config?.from || ''}
                        disabled
                        placeholder="noreply@example.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        Set via EMAIL_FROM environment variable
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>From Name</Label>
                      <Input
                        value={config?.fromName || ''}
                        disabled
                        placeholder="Enterprise Reporting System"
                      />
                      <p className="text-xs text-muted-foreground">
                        Set via EMAIL_FROM_NAME environment variable
                      </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-medium text-sm mb-2">📧 Configuration Instructions</h4>
                      <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
                        <li>Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in your .env file</li>
                        <li>Set EMAIL_FROM and optionally EMAIL_FROM_NAME</li>
                        <li>For Gmail, use an App Password: enable 2FA → generate App Password</li>
                        <li>For Outlook, use SMTP with your Microsoft account</li>
                        <li>Click &ldquo;Verify Connection&rdquo; to test your configuration</li>
                      </ol>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Connection Pooling</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Email sending uses connection pooling for improved performance:
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-2xl font-bold">5</p>
                  <p className="text-xs text-muted-foreground">Max Connections</p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-2xl font-bold">100</p>
                  <p className="text-xs text-muted-foreground">Max Messages per Connection</p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-2xl font-bold">∞</p>
                  <p className="text-xs text-muted-foreground">Automatic Reuse</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Email Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Bell className="h-4 w-4" />
                      <h3 className="font-medium">Job Completed Notification</h3>
                      <Badge variant="outline">Auto-sent</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Sent when a scheduled job completes successfully. Includes job details, execution time, and download link for the report.
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <strong>Variables:</strong> jobName, userName, status, completedAt, duration, rowCount, resultUrl
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <h3 className="font-medium">Job Failed Notification</h3>
                      <Badge variant="outline">Auto-sent</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Sent when a scheduled job fails. Includes error details and troubleshooting information.
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <strong>Variables:</strong> jobName, userName, failedAt, errorMessage
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4" />
                      <h3 className="font-medium">Test Email</h3>
                      <Badge variant="outline">Manual</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Template for testing email configuration. Confirms SMTP settings are working correctly.
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <strong>Variables:</strong> smtpHost, smtpPort, fromEmail, sentAt
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Reports can be automatically attached to job completion emails:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">CSV files attached with email body template</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Excel files attached with email body template</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">PDF reports attached with email body template</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  💡 When creating a job, enable &ldquo;Email Report&rdquo; to attach the exported file and send it to configured recipients
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Send a test email to verify your SMTP configuration is working correctly.
              </p>

              <div className="space-y-2">
                <Label htmlFor="testEmail">Recipient Email</Label>
                <Input
                  id="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your-email@example.com"
                />
              </div>

              <Button
                onClick={() => testMutation.mutate()}
                disabled={!testEmail || testMutation.isPending}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {testMutation.isPending ? 'Sending...' : 'Send Test Email'}
              </Button>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">💡 Tips</h4>
                <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Send to your own email first to test configuration</li>
                  <li>Check spam folder if email doesn't arrive</li>
                  <li>Gmail users: Use App Password, not your regular password</li>
                  <li>Outlook/Office365: Use SMTP with authentication</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
