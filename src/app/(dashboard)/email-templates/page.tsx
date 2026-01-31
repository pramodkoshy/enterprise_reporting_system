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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, Edit, Trash, Mail, Eye, FileText, Database, MoreHorizontal } from 'lucide-react';
import { TemplateEditor } from '@/components/email/template-editor';
import type { EmailTemplate } from '@/lib/email/email-service';

export default function EmailTemplatesPage() {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  const { data: templates, isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const res = await fetch('/api/email-templates');
      const data = await res.json();
      return data.data?.items || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch(`/api/email-templates/${templateId}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Template deleted');
        queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      } else {
        toast.error(data.error?.message || 'Failed to delete template');
      }
    },
  });

  const handleCreate = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleDelete = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteMutation.mutate(templateId);
    }
  };

  const handleSave = (_template: {
    name: string;
    subject: string;
    htmlBody: string;
    queryId?: string;
    columnMappings: Record<string, string>;
  }) => {
    // The template editor will handle the API call
    setEditorOpen(false);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground">
            Create and manage email templates with query-based placeholders
          </p>
        </div>

        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            All Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading templates...
            </div>
          ) : !templates || templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No email templates found</p>
              <p className="text-sm mb-4">Create your first template to get started</p>
              <Button onClick={handleCreate}>Create Template</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">Template Name</TableHead>
                  <TableHead className="w-[35%]">Subject</TableHead>
                  <TableHead className="w-[20%]">Query</TableHead>
                  <TableHead className="w-[20%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {template.subject.substring(0, 60)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      {template.queryId ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline">Static</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(template)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingTemplate(template);
                              setEditorOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(template.id)}
                            className="text-destructive"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Template Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={(open) => {
        if (!open) {
          setEditingTemplate(null);
        }
        setEditorOpen(open);
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create Email Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Modify your email template and placeholder mappings'
                : 'Create a new email template with query-based placeholders'}
            </DialogDescription>
          </DialogHeader>

          <TemplateEditor
            templateId={editingTemplate?.id}
            onSave={handleSave}
            onCancel={() => setEditorOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Usage Guide */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                  <span className="font-bold">1</span>
                </div>
                <p className="text-sm">Create Template</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Add placeholders like <code className="bg-muted px-1 rounded">{{customer_name}}</code> to your email
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                  <span className="font-bold">2</span>
                </div>
                <p className="text-sm">Connect Query</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Select a saved query to fetch data (e.g., customer billing data)
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                  <span className="font-bold">3</span>
                </div>
                <p className="text-sm">Map Columns</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Map query columns to template placeholders (e.g., customer_name column → {{customer_name}})
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                  <span className="font-bold">4</span>
                </div>
                <p className="text-sm">Use in Jobs</p>
              </div>
              <p className="text-xs text-muted-foreground">
                When creating a scheduled job, select this template to send personalized emails
              </p>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2">📧 Batch Email Example</h4>
            <p className="text-sm text-muted-foreground mb-2">
              For a billing report to 5 customers:
            </p>
            <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
              <li><strong>Query:</strong> Returns 5 rows with customer data</li>
              <li><strong>Template:</strong> Has placeholders like <code>{{customer_name}}</code>, <code>{{amount}}</code></li>
              <li><strong>Job:</strong> Scheduled to run monthly</li>
              <li><strong>Result:</strong> 5 personalized emails sent, each with customer&apos;s data</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
