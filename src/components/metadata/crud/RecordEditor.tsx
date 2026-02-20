/**
 * Record Editor Component
 *
 * Form for creating and editing entity data records.
 * Uses react-hook-form with shadcn/ui components.
 */

'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save } from 'lucide-react';
import { useEntity, useEntityRecords } from '@/hooks/metadata/use-metadata-queries';
import type { MetadataEntityWithFields } from '@/types/database';
import { RelationshipPicker } from '../RelationshipPicker';

interface RecordEditorProps {
  dataSourceId: string;
  entityId: string;
  recordId?: string | number;
  onSave?: () => void;
  onCancel?: () => void;
}

export function RecordEditor({
  dataSourceId,
  entityId,
  recordId,
  onSave,
  onCancel,
}: RecordEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch entity metadata
  const { data: entityData, isLoading: isLoadingEntity } = useEntity(entityId);
  const entity = entityData?.data as MetadataEntityWithFields;

  // Fetch record if editing
  const { data: recordsData, isLoading: isLoadingRecord } = useEntityRecords(
    dataSourceId,
    entityId,
    recordId ? { page: 1, limit: 1 } : { page: 1, limit: 0 }
  );

  const record = recordId ? recordsData?.data?.records?.[0] as Record<string, unknown> | undefined : undefined;

  // Build form schema from entity fields
  const formSchema = useEffect(() => {
    if (!entity) return;

    const shape: Record<string, z.ZodTypeAny> = {};

    for (const field of entity.fields) {
      let fieldSchema: z.ZodTypeAny;

      if (!field.is_nullable) {
        fieldSchema = z.any();
      } else {
        fieldSchema = z.any().nullable();
      }

      shape[field.field_name] = fieldSchema;
    }

    return z.object(shape);
  }, [entity]);

  // Initialize form with default values
  const form = useForm<Record<string, unknown>>({
    // @ts-expect-error - dynamic schema
    resolver: zodResolver(formSchema || z.object({})),
    defaultValues: record || {},
  });

  // Update form when record data is loaded
  useEffect(() => {
    if (record) {
      form.reset(record);
    }
  }, [record, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      const url = recordId
        ? `/api/data-sources/${dataSourceId}/entities/${entityId}/records/${recordId}`
        : `/api/data-sources/${dataSourceId}/entities/${entityId}/records/${Date.now()}`; // temp ID for POST

      const method = recordId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to save record');
      }

      onSave?.();
    } catch (error) {
      console.error('Error saving record:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingEntity || (recordId && isLoadingRecord)) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!entity) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Entity not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {recordId ? 'Edit' : 'Create'} {entity.entity_name} Record
        </CardTitle>
        <CardDescription>
          {recordId ? 'Update record data.' : 'Fill in the fields to create a new record.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {entity.fields.map((field) => (
              <FormField
                key={field.id}
                control={form.control}
                name={field.field_name}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      {field.description || field.field_name}
                      {field.is_primary_key && <Badge variant="secondary">PK</Badge>}
                      {field.is_foreign_key && <Badge variant="outline">FK</Badge>}
                      {!field.is_nullable && <span className="text-destructive">*</span>}
                    </FormLabel>
                    <FormControl>
                      {field.is_foreign_key && field.relationship_ui_type ? (
                        <RelationshipPicker
                          dataSourceId={dataSourceId}
                          entity={entity}
                          field={field}
                          value={formField.value as string | number | null}
                          onChange={formField.onChange}
                        />
                      ) : field.data_type.toLowerCase().includes('bool') ? (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={field.id}
                            checked={Boolean(formField.value)}
                            onCheckedChange={formField.onChange}
                          />
                          <label htmlFor={field.id} className="text-sm text-muted-foreground">
                            {formField.value ? 'True' : 'False'}
                          </label>
                        </div>
                      ) : field.data_type.toLowerCase().includes('text') ||
                        field.data_type.toLowerCase().includes('string') ? (
                        <Textarea
                          placeholder={`Enter ${field.field_name}`}
                          value={String(formField.value || '')}
                          onChange={(e) => formField.onChange(e.target.value)}
                          rows={3}
                        />
                      ) : (
                        <Input
                          type={getFieldInputType(field.data_type)}
                          placeholder={`Enter ${field.field_name}`}
                          value={String(formField.value || '')}
                          onChange={(e) => {
                            const val = e.target.value;
                            // Try to convert to number for numeric types
                            if (getFieldInputType(field.data_type) === 'number') {
                              formField.onChange(val === '' ? null : Number(val));
                            } else {
                              formField.onChange(val);
                            }
                          }}
                        />
                      )}
                    </FormControl>
                    {field.description && (
                      <FormDescription>{field.description}</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Record
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function getFieldInputType(dataType: string): string {
  const type = dataType.toLowerCase();
  if (type.includes('int') || type.includes('decimal') || type.includes('numeric') || type.includes('float') || type.includes('double') || type.includes('real')) {
    return 'number';
  }
  if (type.includes('date')) {
    return 'datetime-local';
  }
  if (type.includes('bool')) {
    return 'checkbox';
  }
  return 'text';
}
