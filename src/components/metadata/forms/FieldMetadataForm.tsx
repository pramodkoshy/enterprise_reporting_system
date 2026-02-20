/**
 * Field Metadata Form Component
 *
 * Form for editing field metadata (description, is_display_field, is_searchable, display_order, relationship_ui_type).
 * Uses react-hook-form with shadcn/ui components.
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ForeignKeyIcon } from 'lucide-react';
import type { MetadataEntityField } from '@/types/database';

const fieldMetadataSchema = z.object({
  description: z.string().max(1000, 'Description must not exceed 1000 characters').optional(),
  is_display_field: z.boolean(),
  is_searchable: z.boolean(),
  display_order: z.number().int().min(0).max(10000),
  relationship_ui_type: z.enum(['dropdown', 'popup']).nullable().optional(),
});

export type FieldMetadataFormValues = z.infer<typeof fieldMetadataSchema>;

interface FieldMetadataFormProps {
  field: MetadataEntityField;
  onSubmit: (data: FieldMetadataFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: false;
}

export function FieldMetadataForm({
  field,
  onSubmit,
  onCancel,
  isLoading = false,
}: FieldMetadataFormProps) {
  const isForeignKey = field.is_foreign_key;
  const referencedTableName = field.referenced_table_name;

  const form = useForm<FieldMetadataFormValues>({
    resolver: zodResolver(fieldMetadataSchema),
    defaultValues: {
      description: field.description || '',
      is_display_field: field.is_display_field || false,
      is_searchable: field.is_searchable || false,
      display_order: field.display_order || 0,
      relationship_ui_type: field.relationship_ui_type || null,
    },
  });

  const handleSubmit = async (data: FieldMetadataFormValues) => {
    await onSubmit(data);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Field Metadata: {field.field_name}</span>
          <Badge variant="outline">{field.data_type}</Badge>
          {isForeignKey && (
            <Badge variant="secondary" className="gap-1">
              <ForeignKeyIcon className="h-3 w-3" />
              FK → {referencedTableName}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Configure display and search settings for this field.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter a description for this field..."
                      className="min-h-[80px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A human-readable description of what this field represents. Max 1000 characters.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Is Display Field */}
            <FormField
              control={form.control}
              name="is_display_field"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Display Field</FormLabel>
                    <FormDescription>
                      When enabled, this field will be shown in list views and summaries. Typically enabled for name/title fields.
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Is Searchable */}
            <FormField
              control={form.control}
              name="is_searchable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Searchable</FormLabel>
                    <FormDescription>
                      When enabled, this field will be included in search functionality. Useful for identifier and name fields.
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Display Order */}
            <FormField
              control={form.control}
              name="display_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Order</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={10000}
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Determines the order in which fields are displayed. Lower numbers appear first.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Relationship UI Type - Only for foreign keys */}
            {isForeignKey && (
              <FormField
                control={form.control}
                name="relationship_ui_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship UI Type</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value as 'dropdown' | 'popup' | null)}
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select UI type for foreign key relationship" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={null as unknown as string}>None (Standard Input)</SelectItem>
                        <SelectItem value="dropdown">Dropdown (Select from list)</SelectItem>
                        <SelectItem value="popup">Popup (Searchable table)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How the foreign key relationship should be displayed in forms.
                      <br />
                      <strong>Dropdown:</strong> Shows a select dropdown with referenced entity&apos;s display fields.
                      <br />
                      <strong>Popup:</strong> Opens a searchable dialog with server-side paginated table.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
