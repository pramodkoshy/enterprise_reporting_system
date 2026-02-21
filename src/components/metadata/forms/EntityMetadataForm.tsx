/**
 * Entity Metadata Form Component
 *
 * Form for editing entity metadata (description, is_active, is_hidden).
 * Uses react-hook-form with shadcn/ui components.
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const entityMetadataSchema = z.object({
  description: z.string().max(5000, 'Description must not exceed 5000 characters').optional(),
  is_active: z.boolean(),
  is_hidden: z.boolean(),
});

export type EntityMetadataFormValues = z.infer<typeof entityMetadataSchema>;

interface EntityMetadataFormProps {
  entityId: string;
  entityName: string;
  initialDescription?: string;
  initialIsActive?: boolean;
  initialIsHidden?: boolean;
  onSubmit: (data: EntityMetadataFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function EntityMetadataForm({
  entityId: _entityId,
  entityName,
  initialDescription = '',
  initialIsActive = false,
  initialIsHidden = true,
  onSubmit,
  onCancel,
  isLoading = false,
}: EntityMetadataFormProps) {
  const form = useForm<EntityMetadataFormValues>({
    resolver: zodResolver(entityMetadataSchema),
    defaultValues: {
      description: initialDescription,
      is_active: initialIsActive,
      is_hidden: initialIsHidden,
    },
  });

  const handleSubmit = async (data: EntityMetadataFormValues) => {
    await onSubmit(data);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Entity Metadata: {entityName}</CardTitle>
        <CardDescription>
          Configure metadata settings for this entity. Only description, active status, and visibility can be modified.
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
                      placeholder="Enter a description for this entity..."
                      className="min-h-[100px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A human-readable description of what this entity represents. Max 5000 characters.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Is Active Field */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      name={field.name}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      When enabled, this entity will be visible and accessible in the system. Entities are inactive by default.
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Is Hidden Field */}
            <FormField
              control={form.control}
              name="is_hidden"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      name={field.name}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Hidden</FormLabel>
                    <FormDescription>
                      When enabled, this entity will be hidden from standard views. Hidden entities are still accessible via direct links or API.
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

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
