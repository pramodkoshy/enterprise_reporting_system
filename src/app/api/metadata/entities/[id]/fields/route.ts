/**
 * API Route: List Entity Fields
 * GET /api/metadata/entities/[id]/fields
 *
 * Gets all fields for an entity.
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldService } from '@/lib/metadata/field-service';
import { hasPermission, getSecurityContext } from '@/lib/auth/rbac';

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

    const fields = await FieldService.getByEntityId(params.id);

    return NextResponse.json({
      success: true,
      data: fields,
    });
  } catch (error) {
    console.error('Error listing entity fields:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list entity fields',
        },
      },
      { status: 500 }
    );
  }
}
