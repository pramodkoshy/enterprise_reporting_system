/**
 * API Route: Inspect Datasource Schema
 * POST /api/data-sources/[id]/inspect
 *
 * Inspects the schema of a connected datasource and imports entities
 * into the metadata_entity_header and metadata_entity_field tables.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSecurityContext, hasPermission } from '@/lib/auth/rbac';
import { getDb } from '@/lib/db/config';
import { EntityService } from '@/lib/metadata/entity-service';
import { introspectSchema } from '@/lib/sql/schema-introspection';
import { getConnection } from '@/lib/db/connection-manager';

interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
  foreign_key?: {
    column: string;
    ref_table: string;
    ref_column: string;
  };
  default_value?: string;
}

interface DatabaseTable {
  name: string;
  schema?: string;
  type: 'table' | 'view';
  columns: DatabaseColumn[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get security context
    const context = await getSecurityContext();
    if (!context) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    // Check permission
    const canEdit = hasPermission(context, 'data_source:edit') || hasPermission(context, 'admin');
    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }

    // Get datasource
    const dataSource = await getDb()('data_sources')
      .where('id', id)
      .where('is_deleted', false)
      .first();

    if (!dataSource) {
      console.error('[Inspect] Datasource not found:', id);
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Datasource not found' } },
        { status: 404 }
      );
    }

    console.log('[Inspect] Datasource found:', { id, name: dataSource.name, is_active: dataSource.is_active });

    // Check if datasource is active
    if (!dataSource.is_active) {
      console.error('[Inspect] Datasource not active:', id);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATASOURCE_NOT_ACTIVE',
            message: 'Datasource must be connected before inspecting schema',
          },
        },
        { status: 400 }
      );
    }

    // Get database connection for introspection
    let connection;
    try {
      connection = await getConnection(dataSource);
      console.log('[Inspect] Connection obtained successfully');
    } catch (error: any) {
      console.error('[Inspect] Failed to get connection:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONNECTION_FAILED',
            message: error.message || 'Failed to connect to datasource',
          },
        },
        { status: 500 }
      );
    }

    // Introspect schema
    let introspectionResult;
    try {
      introspectionResult = await introspectSchema(connection, dataSource.client_type);
      console.log('[Inspect] Schema introspection successful:', {
        tablesCount: introspectionResult.schema.tables.length,
        viewsCount: introspectionResult.schema.views.length,
      });
    } catch (error: any) {
      console.error('[Inspect] Schema introspection error:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTROSPECTION_FAILED',
            message: error.message || 'Failed to introspect schema',
          },
        },
        { status: 500 }
      );
    }

    // Convert introspection result to DatabaseTable format
    const schema: DatabaseTable[] = [
      ...introspectionResult.schema.tables.map((table) => ({
        name: table.name,
        schema: table.schema,
        type: 'table' as const,
        columns: table.columns.map((col) => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable,
          primary_key: table.primaryKey?.includes(col.name) || false,
          foreign_key: table.foreignKeys?.find((fk) =>
            fk.column === col.name
          ) ? {
            column: col.name,
            ref_table: table.foreignKeys!.find((fk) =>
              fk.column === col.name
            )!.referencedTable,
            ref_column: table.foreignKeys!.find((fk) =>
              fk.column === col.name
            )!.referencedColumn,
          } : undefined,
          default_value: col.defaultValue as string | undefined,
        })),
      })),
      ...introspectionResult.schema.views.map((view) => ({
        name: view.name,
        schema: view.schema,
        type: 'view' as const,
        columns: view.columns.map((col) => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable,
          primary_key: false,
          foreign_key: undefined,
          default_value: col.defaultValue as string | undefined,
        })),
      })),
    ];

    // Import entities into metadata tables
    let entitiesCreated = 0;
    let fieldsCreated = 0;

    for (const table of schema) {
      // Check if entity already exists
      const exists = await EntityService.exists(id, table.name, table.schema);

      if (!exists) {
        // Create entity metadata
        const entity = await EntityService.create({
          data_source_id: id,
          entity_name: table.name,
          entity_schema: table.schema,
          entity_type: table.type,
          description: undefined, // User can add later
          schema_metadata: JSON.stringify({
            tableName: table.name,
            schema: table.schema,
            entityType: table.type,
            primaryKey: table.columns.filter((c) => c.primary_key).map((c) => c.name),
            foreignKeys: table.columns
              .filter((c) => c.foreign_key)
              .map((c) => ({
                columns: [c.foreign_key!.column],
                referencedTable: c.foreign_key!.ref_table,
                referencedColumns: [c.foreign_key!.ref_column],
              })),
            indexes: [], // Could be populated if available
          }),
          is_active: false, // Schema definer must activate
          is_hidden: true, // Hidden until schema definer unhides
          last_introspected_at: new Date().toISOString(),
          created_by: context.userId,
        });

        // Create field metadata
        for (const [index, column] of table.columns.entries()) {
          await getDb()('metadata_entity_field').insert({
            id: getDb().raw('(lower(hex(randomblob(16))))'),
            entity_header_id: entity.id,
            field_name: column.name,
            data_type: column.type,
            is_nullable: column.nullable || false,
            is_primary_key: column.primary_key || false,
            is_foreign_key: !!column.foreign_key,
            foreign_key_table: column.foreign_key?.ref_table || null,
            foreign_key_column: column.foreign_key?.ref_column || null,
            default_value: column.default_value || null,
            description: null,
            is_display_field: false,
            is_searchable: true,
            display_order: index,
            section_name: null,
            relationship_ui_type: null,
            created_at: getDb().fn.now(),
            updated_at: getDb().fn.now(),
          });
          fieldsCreated++;
        }

        entitiesCreated++;
      } else {
        // Update last_introspected_at for existing entity
        await getDb()('metadata_entity_header')
          .where('data_source_id', id)
          .where('entity_name', table.name)
          .where('entity_schema', table.schema || null)
          .update({
            last_introspected_at: new Date().toISOString(),
            updated_at: getDb().fn.now(),
          });
      }
    }

    // Mark datasource as inspected
    await getDb()('data_sources')
      .where('id', id)
      .update({
        is_inspected: true,
        updated_at: getDb().fn.now(),
      });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Schema inspected and imported successfully',
        entities_count: entitiesCreated,
        fields_count: fieldsCreated,
        tables_found: schema.length,
      },
    });
  } catch (error) {
    console.error('Error inspecting datasource schema:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to inspect datasource schema',
        },
      },
      { status: 500 }
    );
  }
}
