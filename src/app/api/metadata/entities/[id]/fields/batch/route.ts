/**
 * API Route: Batch Update Entity Fields
 * POST /api/metadata/entities/[id]/fields/batch
 *
 * Updates multiple fields in a single request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldService } from '@/lib/metadata/field-service';
import { hasPermission, getSecurityContext } from '@/lib/auth/rbac';

export async function POST(
  request: NextRequest,
  { params: _params }: { params: { id: string } }
) {
  try {
    const context = await getSecurityContext();
    if (!context) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const canEdit = hasPermission(context, 'metadata_entity:edit') ??
      context.permissions.includes('metadata_entity:edit');

    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { updates } = body;

    // Validate input
    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'updates must be an array' } },
        { status: 400 }
      );
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'updates array cannot be empty' } },
        { status: 400 }
      );
    }

    if (updates.length > 100) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Cannot update more than 100 fields at once' } },
        { status: 400 }
      );
    }

    // Validate each update object
    for (const update of updates) {
      if (!update.id || typeof update.id !== 'string') {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Each update must have a valid id field' } },
          { status: 400 }
        );
      }

      if (!update.data || typeof update.data !== 'object') {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Each update must have a data object' } },
          { status: 400 }
        );
      }

      // Validate data fields
      const { description, is_display_field, is_searchable, display_order, relationship_ui_type } = update.data;

      if (description !== undefined && typeof description !== 'string') {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: `description must be a string for field ${update.id}` } },
          { status: 400 }
        );
      }

      if (is_display_field !== undefined && typeof is_display_field !== 'boolean') {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: `is_display_field must be a boolean for field ${update.id}` } },
          { status: 400 }
        );
      }

      if (is_searchable !== undefined && typeof is_searchable !== 'boolean') {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: `is_searchable must be a boolean for field ${update.id}` } },
          { status: 400 }
        );
      }

      if (display_order !== undefined && typeof display_order !== 'number') {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: `display_order must be a number for field ${update.id}` } },
          { status: 400 }
        );
      }

      if (relationship_ui_type !== undefined && relationship_ui_type !== null) {
        if (typeof relationship_ui_type !== 'string' ||
            !['dropdown', 'popup'].includes(relationship_ui_type)) {
          return NextResponse.json(
            { success: false, error: { code: 'VALIDATION_ERROR', message: `relationship_ui_type must be dropdown, popup, or null for field ${update.id}` } },
            { status: 400 }
          );
        }
      }

      // Validate description length
      if (description && description.length > 1000) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: `description exceeds maximum length of 1000 characters for field ${update.id}` } },
          { status: 400 }
        );
      }
    }

    // Perform bulk update
    const fields = await FieldService.bulkUpdate(
      updates.map(u => ({ id: u.id, data: u.data })),
      context.userId
    );

    return NextResponse.json({
      success: true,
      data: fields,
    });
  } catch (error) {
    console.error('Error batch updating entity fields:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to batch update entity fields',
        },
      },
      { status: 500 }
    );
  }
}
