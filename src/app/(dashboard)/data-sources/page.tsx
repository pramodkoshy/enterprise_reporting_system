'use client';

import { useState, useRef } from 'react';
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
  FolderOpen,
  Edit,
  Trash2,
  MoreVertical,
  AlertCircle,
  AlertTriangle,
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDataSource, setEditingDataSource] = useState<DataSource | null>(null);
  const [newDSName, setNewDSName] = useState('');
  const [newDSDescription, setNewDSDescription] = useState('');
  const [newDSType, setNewDSType] = useState<DatabaseClientType>('pg');
  const [newDSHost, setNewDSHost] = useState('');
  const [newDSPort, setNewDSPort] = useState('');
  const [newDSDatabase, setNewDSDatabase] = useState('');
  const [newDSUser, setNewDSUser] = useState('');
  const [newDSPassword, setNewDSPassword] = useState('');
  const [newDSFileName, setNewDSFileName] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dataSourceToDelete, setDataSourceToDelete] = useState<DataSource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{ queries: number; reports: number; charts: number } | null>(null);

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
      // For SQLite, use the uploaded filename
      if (newDSType === 'sqlite3') {
        if (!newDSFileName) {
          throw new Error('Please upload a SQLite database file');
        }

        const res = await fetch('/api/data-sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newDSName,
            description: newDSDescription,
            clientType: newDSType,
            connectionConfig: {
              filename: newDSFileName, // Just the filename, server will prepend data/uploads/
            },
          }),
        });
        return res.json();
      }

      // For other databases, use JSON
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
      // For SQLite, use the uploaded filename
      if (newDSType === 'sqlite3') {
        if (!newDSFileName) {
          setConnectionTestResult({ success: false, message: 'Please upload a SQLite database file' });
          setTestingConnection(false);
          return;
        }

        const res = await fetch('/api/data-sources/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientType: newDSType,
            connectionConfig: {
              filename: newDSFileName, // Just the filename, server will prepend data/uploads/
            },
          }),
        });
        const data = await res.json();
        setConnectionTestResult({
          success: data.data?.connected || false,
          message: data.data?.message || 'Test failed'
        });
      } else {
        // For other databases, use JSON
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
        setConnectionTestResult({
          success: data.data?.connected || false,
          message: data.data?.message || 'Test failed'
        });
      }
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
    setNewDSFileName('');
    setConnectionTestResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file type
    if (!file.name.endsWith('.db') && !file.name.endsWith('.sqlite') && !file.name.endsWith('.sqlite3')) {
      toast.error('Please select a valid SQLite database file (.db, .sqlite, .sqlite3)');
      return;
    }

    setUploadingFile(true);
    setConnectionTestResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/data-sources/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setNewDSFileName(data.data.filename);
        toast.success(data.data.message);
      } else {
        toast.error(data.error?.message || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.db') || file.name.endsWith('.sqlite') || file.name.endsWith('.sqlite3'))) {
      handleFileUpload(file);
    } else if (file) {
      toast.error('Please select a valid SQLite database file (.db, .sqlite, .sqlite3)');
    }
  };

  const handleEdit = (ds: DataSource) => {
    setEditingDataSource(ds);
    setNewDSName(ds.name);
    setNewDSDescription(ds.description || '');
    setNewDSType(ds.client_type);

    // Extract just the filename from the path
    const fullPath = ds.connection_config?.filename || '';
    const fileName = fullPath.split('/').pop() || fullPath;
    setNewDSFileName(fileName);

    setNewDSHost(ds.connection_config?.host || '');
    setNewDSPort(ds.connection_config?.port?.toString() || '');
    setNewDSDatabase(ds.connection_config?.database || '');
    setNewDSUser(ds.connection_config?.user || '');
    setNewDSPassword(''); // Don't pre-fill password for security
    setConnectionTestResult(null);
    setEditDialogOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingDataSource) throw new Error('No data source selected');

      // For SQLite, use the uploaded filename
      if (newDSType === 'sqlite3') {
        if (!newDSFileName) {
          throw new Error('Please upload a SQLite database file');
        }

        const res = await fetch(`/api/data-sources/${editingDataSource.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newDSName,
            description: newDSDescription,
            clientType: newDSType,
            connectionConfig: {
              filename: newDSFileName, // Just the filename, server will prepend data/uploads/
            },
          }),
        });
        return res.json();
      }

      // For other databases
      const res = await fetch(`/api/data-sources/${editingDataSource.id}`, {
        method: 'PATCH',
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
            password: newDSPassword || undefined,
          },
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Data source updated successfully');
        queryClient.invalidateQueries({ queryKey: ['data-sources'] });
        resetForm();
        setEditDialogOpen(false);
        setEditingDataSource(null);
      } else {
        toast.error(data.error?.message || 'Failed to update data source');
      }
    },
  });

  const handleDeleteClick = async (ds: DataSource) => {
    setDataSourceToDelete(ds);
    setUsageInfo(null);
    setDeleteDialogOpen(true);

    // Check usage
    try {
      const res = await fetch(`/api/data-sources/${ds.id}/usage`);
      const data = await res.json();
      if (data.success) {
        setUsageInfo(data.data);
      }
    } catch (error) {
      console.error('Failed to check usage:', error);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/data-sources/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Data source deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['data-sources'] });
        setDeleteDialogOpen(false);
        setDataSourceToDelete(null);
        setUsageInfo(null);
      } else {
        toast.error(data.error?.message || 'Failed to delete data source');
      }
      setIsDeleting(false);
    },
    onError: () => {
      toast.error('Failed to delete data source');
      setIsDeleting(false);
    },
  });

  const handleDeleteConfirm = () => {
    if (!dataSourceToDelete) return;
    setIsDeleting(true);
    deleteMutation.mutate(dataSourceToDelete.id);
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

              {newDSType === 'sqlite3' ? (
                // SQLite file upload to server
                <div className="space-y-3">
                  <Label>Database File</Label>

                  {/* File upload zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      uploadingFile
                        ? 'bg-muted cursor-not-allowed'
                        : 'cursor-pointer hover:bg-accent/50'
                    }`}
                    onClick={() => !uploadingFile && fileInputRef.current?.click()}
                  >
                    {uploadingFile ? (
                      <>
                        <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
                        <p className="text-sm font-medium">Uploading file...</p>
                      </>
                    ) : (
                      <>
                        <FolderOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {newDSFileName || 'Click to browse or drag & drop SQLite file'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          File will be uploaded to: <code className="bg-muted px-1 py-0.5 rounded">data/uploads/</code>
                        </p>
                      </>
                    )}
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".db,.sqlite,.sqlite3"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={uploadingFile}
                    />
                  </div>

                  {newDSFileName && (
                    <div className="rounded-md bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 p-3">
                      <p className="text-sm font-medium text-green-800 dark:text-green-400 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        File uploaded successfully
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-400 mt-1 font-mono">
                        data/uploads/{newDSFileName}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Connection fields for other databases
                <>
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
                </>
              )}

              {connectionTestResult && (
                <div
                  className={`p-3 rounded-md flex items-center gap-2 ${
                    connectionTestResult.success
                      ? 'bg-green-500 text-white dark:bg-green-600'
                      : 'bg-red-500 text-white dark:bg-red-600'
                  }`}
                >
                  {connectionTestResult.success ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    {connectionTestResult.success ? 'Connection Successful' : 'Connection Failed'}
                  </span>
                  {connectionTestResult.message && !connectionTestResult.success && (
                    <span className="text-sm opacity-90">: {connectionTestResult.message}</span>
                  )}
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
                disabled={!newDSName || !connectionTestResult?.success || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Data Source</DialogTitle>
              <DialogDescription>
                Update the configuration for {editingDataSource?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-ds-name">Name</Label>
                  <Input
                    id="edit-ds-name"
                    value={newDSName}
                    onChange={(e) => setNewDSName(e.target.value)}
                    placeholder="Production Database"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-ds-type">Database Type</Label>
                  <Select value={newDSType} onValueChange={(v) => setNewDSType(v as DatabaseClientType)} disabled>
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
                <Label htmlFor="edit-ds-description">Description</Label>
                <Input
                  id="edit-ds-description"
                  value={newDSDescription}
                  onChange={(e) => setNewDSDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>

              {newDSType === 'sqlite3' ? (
                // SQLite file upload for edit dialog
                <div className="space-y-3">
                  <Label>Database File</Label>

                  {/* File upload zone for edit */}
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                      uploadingFile
                        ? 'bg-muted cursor-not-allowed'
                        : 'cursor-pointer hover:bg-accent/50'
                    }`}
                    onClick={() => !uploadingFile && fileInputRef.current?.click()}
                  >
                    {uploadingFile ? (
                      <>
                        <Loader2 className="h-6 w-6 mx-auto mb-1 animate-spin text-muted-foreground" />
                        <p className="text-sm font-medium">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <FolderOpen className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {newDSFileName || 'Click to browse or drag & drop to change file'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Upload to: <code className="bg-muted px-1 py-0.5 rounded">data/uploads/</code>
                        </p>
                      </>
                    )}
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".db,.sqlite,.sqlite3"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={uploadingFile}
                    />
                  </div>

                  {newDSFileName && (
                    <div className="rounded-md bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 p-3">
                      <p className="text-sm font-medium text-green-800 dark:text-green-400 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Ready to use: {newDSFileName}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="edit-ds-host">Host</Label>
                      <Input
                        id="edit-ds-host"
                        value={newDSHost}
                        onChange={(e) => setNewDSHost(e.target.value)}
                        placeholder="localhost"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-ds-port">Port</Label>
                      <Input
                        id="edit-ds-port"
                        value={newDSPort}
                        onChange={(e) => setNewDSPort(e.target.value)}
                        placeholder={newDSType === 'pg' ? '5432' : newDSType === 'mysql' ? '3306' : ''}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-ds-database">Database</Label>
                    <Input
                      id="edit-ds-database"
                      value={newDSDatabase}
                      onChange={(e) => setNewDSDatabase(e.target.value)}
                      placeholder="mydb"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-ds-user">Username</Label>
                      <Input
                        id="edit-ds-user"
                        value={newDSUser}
                        onChange={(e) => setNewDSUser(e.target.value)}
                        placeholder="dbuser"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-ds-password">Password</Label>
                      <Input
                        id="edit-ds-password"
                        type="password"
                        value={newDSPassword}
                        onChange={(e) => setNewDSPassword(e.target.value)}
                        placeholder="Leave empty to keep current"
                      />
                    </div>
                  </div>
                </>
              )}

              {connectionTestResult && (
                <div
                  className={`p-3 rounded-md flex items-center gap-2 ${
                    connectionTestResult.success
                      ? 'bg-green-500 text-white dark:bg-green-600'
                      : 'bg-red-500 text-white dark:bg-red-600'
                  }`}
                >
                  {connectionTestResult.success ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    {connectionTestResult.success ? 'Connection Successful' : 'Connection Failed'}
                  </span>
                  {connectionTestResult.message && !connectionTestResult.success && (
                    <span className="text-sm opacity-90">: {connectionTestResult.message}</span>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={testConnection} disabled={testingConnection}>
                {testingConnection && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Test Connection
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  resetForm();
                  setEditingDataSource(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={!newDSName || updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Data Source</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{dataSourceToDelete?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {usageInfo && (usageInfo.queries > 0 || usageInfo.reports > 0 || usageInfo.charts > 0) ? (
                <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-red-800 dark:text-red-400">Cannot Delete Data Source</h4>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-2">This data source is currently in use:</p>
                      <ul className="text-sm text-red-700 dark:text-red-400 mt-1 list-disc list-inside">
                        {usageInfo.queries > 0 && <li>{usageInfo.queries} saved quer{usageInfo.queries === 1 ? 'y' : 'ies'}</li>}
                        {usageInfo.reports > 0 && <li>{usageInfo.reports} report{usageInfo.reports === 1 ? '' : 's'}</li>}
                        {usageInfo.charts > 0 && <li>{usageInfo.charts} chart{usageInfo.charts === 1 ? '' : 's'}</li>}
                      </ul>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-2">Please delete or update these items first.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-md bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">Warning</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                        This will soft delete the data source. It will be marked as deleted but will remain in the database for audit purposes.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setDataSourceToDelete(null);
                  setUsageInfo(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={!!usageInfo && (usageInfo.queries > 0 || usageInfo.reports > 0 || usageInfo.charts > 0) || isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
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
                  <TableHead className="w-[100px]">Actions</TableHead>
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
                        {ds.is_active ? 'Active' : 'No Connection'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(ds.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(ds)}
                          title="Edit data source"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(ds)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete data source"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
