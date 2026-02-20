/**
 * API Route: Update Entity Field
 * PUT /api/metadata/entities/[id]/fields/[fieldId]
 *
 * Updates a single field's metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldService } from '@/lib/metadata/field-service';
import { hasPermission, getSecurityContext } from '@/lib/auth/rbac';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; fieldId: string } }
) {
  try {
    const context = await getSecurityContext();
    if (!context) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const canEdit = hasPermission(context, 'metadata_entity:edit');

    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { description, is_display_field, is_searchable, display_order, relationship_ui_type } = body;

    // Validate input
    if (description !== undefined && typeof description !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'description must be a string' } },
        { status: 400 }
      );
    }

    if (is_display_field !== undefined && typeof is_display_field !== 'boolean') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'is_display_field must be a boolean' } },
        { status: 400 }
      );
    }

    if (is_searchable !== undefined && typeof is_searchable !== 'boolean') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'is_searchable must be a boolean' } },
        { status: 400 }
      );
    }

    if (display_order !== undefined && typeof display_order !== 'number') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'display_order must be a number' } },
        { status: 400 }
      );
    }

    if (relationship_ui_type !== undefined && relationship_ui_type !== null) {
      if (typeof relationship_ui_type !== 'string' ||
          !['dropdown', 'popup'].includes(relationship_ui_type)) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'relationship_ui_type must be dropdown, popup, or null' } },
          { status: 400 }
        );
      }
    }

    // Validate description length
    if (description && description.length > 1000) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'description exceeds maximum length of 1000 characters' } },
        { status: 400 }
      );
    }

    // Build update data with only provided fields
    const updateData: Partial<Parameters<typeof FieldService.update>[2]> = {};
    if (description !== undefined) updateData.description = description;
    if (is_display_field !== undefined) updateData.is_display_field = is_display_field;
    if (is_searchable !== undefined) updateData.is_searchable = is_searchable;
    if (display_order !== undefined) updateData.display_order = display_order;
    if (relationship_ui_type !== undefined) updateData.relationship_ui_type = relationship_ui_type;

    // Only update if at least one field was provided
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'No fields provided for update' } },
        { status: 400 }
      );
    }

    const field = await FieldService.update(params.fieldId, updateData, context.userId);

    if (!field) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: field,
    });
  } catch (error) {
    console.error('Error updating entity field:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update entity field',
        },
      },
      { status: 500 }
    );
  }
}
