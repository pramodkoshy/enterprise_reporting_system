'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Database,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';
import type { DataSource, DatabaseClientType } from '@/types/database';

const databaseTypes: { value: DatabaseClientType; label: string }[] = [
  { value: 'pg', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'mssql', label: 'SQL Server' },
  { value: 'sqlite3', label: 'SQLite' },
  { value: 'oracledb', label: 'Oracle' },
];

export default function DataSourcesPage() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newDSName, setNewDSName] = useState('');
  const [newDSDescription, setNewDSDescription] = useState('');
  const [newDSType, setNewDSType] = useState<DatabaseClientType>('pg');
  const [newDSHost, setNewDSHost] = useState('');
  const [newDSPort, setNewDSPort] = useState('');
  const [newDSDatabase, setNewDSDatabase] = useState('');
  const [newDSUser, setNewDSUser] = useState('');
  const [newDSPassword, setNewDSPassword] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const { data: dataSources, isLoading } = useQuery<DataSource[]>({
    queryKey: ['data-sources'],
    queryFn: async () => {
      const res = await fetch('/api/data-sources');
      const data = await res.json();
      return data.data?.items || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/data-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDSName,
          description: newDSDescription,
          clientType: newDSType,
          connectionConfig: {
            host: newDSHost,
            port: newDSPort ? parseInt(newDSPort, 10) : undefined,
            database: newDSDatabase,
            user: newDSUser,
            password: newDSPassword,
          },
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Data source created successfully');
        queryClient.invalidateQueries({ queryKey: ['data-sources'] });
        resetForm();
        setCreateDialogOpen(false);
      } else {
        toast.error(data.error?.message || 'Failed to create data source');
      }
    },
  });

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const res = await fetch('/api/data-sources/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientType: newDSType,
          connectionConfig: {
            host: newDSHost,
            port: newDSPort ? parseInt(newDSPort, 10) : undefined,
            database: newDSDatabase,
            user: newDSUser,
            password: newDSPassword,
          },
        }),
      });
      const data = await res.json();
      setConnectionTestResult(data.data || { success: false, message: 'Test failed' });
    } catch (error) {
      setConnectionTestResult({ success: false, message: 'Connection test failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const resetForm = () => {
    setNewDSName('');
    setNewDSDescription('');
    setNewDSType('pg');
    setNewDSHost('');
    setNewDSPort('');
    setNewDSDatabase('');
    setNewDSUser('');
    setNewDSPassword('');
    setConnectionTestResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Sources</h1>
          <p className="text-muted-foreground">
            Manage database connections for reports and queries
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Data Source
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Data Source</DialogTitle>
              <DialogDescription>
                Configure a new database connection for your reports.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ds-name">Name</Label>
                  <Input
                    id="ds-name"
                    value={newDSName}
                    onChange={(e) => setNewDSName(e.target.value)}
                    placeholder="Production Database"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ds-type">Database Type</Label>
                  <Select value={newDSType} onValueChange={(v) => setNewDSType(v as DatabaseClientType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {databaseTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ds-description">Description</Label>
                <Input
                  id="ds-description"
                  value={newDSDescription}
                  onChange={(e) => setNewDSDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="ds-host">Host</Label>
                  <Input
                    id="ds-host"
                    value={newDSHost}
                    onChange={(e) => setNewDSHost(e.target.value)}
                    placeholder="localhost"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ds-port">Port</Label>
                  <Input
                    id="ds-port"
                    value={newDSPort}
                    onChange={(e) => setNewDSPort(e.target.value)}
                    placeholder={newDSType === 'pg' ? '5432' : newDSType === 'mysql' ? '3306' : ''}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ds-database">Database</Label>
                <Input
                  id="ds-database"
                  value={newDSDatabase}
                  onChange={(e) => setNewDSDatabase(e.target.value)}
                  placeholder="mydb"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ds-user">Username</Label>
                  <Input
                    id="ds-user"
                    value={newDSUser}
                    onChange={(e) => setNewDSUser(e.target.value)}
                    placeholder="dbuser"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ds-password">Password</Label>
                  <Input
                    id="ds-password"
                    type="password"
                    value={newDSPassword}
                    onChange={(e) => setNewDSPassword(e.target.value)}
                    placeholder="********"
                  />
                </div>
              </div>

              {connectionTestResult && (
                <div
                  className={`p-3 rounded-md flex items-center gap-2 ${
                    connectionTestResult.success
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }`}
                >
                  {connectionTestResult.success ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  {connectionTestResult.message}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={testConnection} disabled={testingConnection}>
                {testingConnection && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Test Connection
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newDSName || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            All Data Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading data sources...
            </div>
          ) : dataSources?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No data sources configured. Add your first data source to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataSources?.map((ds) => (
                  <TableRow key={ds.id}>
                    <TableCell className="font-medium">{ds.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ds.client_type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ds.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ds.is_active ? 'default' : 'secondary'}>
                        {ds.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(ds.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
