/**
 * API Route: Get/Update Metadata Entity
 * GET /api/metadata/entities/[id] - Get single entity with fields
 * PUT /api/metadata/entities/[id] - Update entity metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { EntityService } from '@/lib/metadata/entity-service';
import { hasPermission, getSecurityContext } from '@/lib/auth/rbac';
import type { MetadataEntityWithFields } from '@/types/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getSecurityContext();
    if (!context) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const canView = hasPermission(context, 'metadata_entity:view');

    if (!canView) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }

    const entity = await EntityService.getById(params.id);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: entity,
    });
  } catch (error) {
    console.error('Error getting metadata entity:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get metadata entity',
        },
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const { description, is_active, is_hidden } = body;

    // Validate input
    if (description !== undefined && typeof description !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'description must be a string' } },
        { status: 400 }
      );
    }

    if (is_active !== undefined && typeof is_active !== 'boolean') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'is_active must be a boolean' } },
        { status: 400 }
      );
    }

    if (is_hidden !== undefined && typeof is_hidden !== 'boolean') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'is_hidden must be a boolean' } },
        { status: 400 }
      );
    }

    // Validate description length
    if (description && description.length > 5000) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'description exceeds maximum length of 5000 characters' } },
        { status: 400 }
      );
    }

    // Build update data with only provided fields
    const updateData: Partial<MetadataEntityWithFields> = {};
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_hidden !== undefined) updateData.is_hidden = is_hidden;

    // Only update if at least one field was provided
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'No fields provided for update' } },
        { status: 400 }
      );
    }

    const entity = await EntityService.update(params.id, updateData, context.userId);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: entity,
    });
  } catch (error) {
    console.error('Error updating metadata entity:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update metadata entity',
        },
      },
      { status: 500 }
    );
  }
}