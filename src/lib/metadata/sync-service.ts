/**
 * Sync Service
 *
 * Integrates with datasource inspection to automatically create and update
 * metadata_entity_header and metadata_entity_field records.
 */

import { getDb } from '@/lib/db/config';
import { getConnection } from '@/lib/db/connection-manager';
import { introspectSchema } from '@/lib/sql/schema-introspection';
import type { MetadataEntityField } from '@/types/database';
import type { TableInfo } from '@/lib/sql/schema-introspection';

/**
 * Sync Service
 */
export class SyncService {
  /**
   * Sync a single datasource (create/update entity and field metadata)
   *
   * @param dataSourceId - ID of the datasource to sync
   * @param userId - ID of the user triggering the sync (for audit)
   * @returns Summary of sync operation
   */
  static async syncDataSource(
    dataSourceId: string,
    userId?: string
  ): Promise<{
    entitiesCreated: number;
    entitiesUpdated: number;
    fieldsCreated: number;
    fieldsUpdated: number;
    errors: string[];
  }> {
    const trx = await getDb().transaction();

    try {
      // Fetch datasource info
      const dataSource = await trx('data_sources')
        .where('id', dataSourceId)
        .first();

      if (!dataSource) {
        throw new Error(`Data source ${dataSourceId} not found`);
      }

      // Establish connection to the datasource
      const connection = await getConnection({
        id: dataSourceId,
        name: dataSource.name,
        client_type: dataSource.client_type as 'pg' | 'mysql' | 'sqlite3' | 'mssql',
        type: dataSource.type as 'DB_QUERY' | 'API_REQUEST',
        connection_config: dataSource.connection_config,
        is_active: dataSource.is_active,
        created_at: dataSource.created_at,
        updated_at: dataSource.updated_at,
      });

      if (!connection) {
        throw new Error('Failed to establish connection to datasource');
      }

      // Perform schema introspection
      const introspectionResult = await introspectSchema(
        connection,
        dataSource.client_type as 'pg' | 'mysql' | 'sqlite3' | 'mssql'
      );

      let entitiesCreated = 0;
      let entitiesUpdated = 0;
      let fieldsCreated = 0;
      let fieldsUpdated = 0;
      const errors: string[] = [];

      // Process each discovered table/view
      for (const tableInfo of introspectionResult.schema.tables) {
        try {
          // Check if entity already exists
          const existingEntity = await trx('metadata_entity_header')
            .where({
              data_source_id: dataSourceId,
              entity_name: tableInfo.name,
              ...(tableInfo.schema && { entity_schema: tableInfo.schema }),
            })
            .first();

          // Prepare schema metadata JSON
          const schemaMetadata = JSON.stringify({
            tableName: tableInfo.name,
            schema: tableInfo.schema,
            entityType: 'table',
            primaryKey: tableInfo.primaryKey,
            foreignKeys: tableInfo.foreignKeys || [],
            indexes: tableInfo.indexes || [],
            columns: tableInfo.columns || [],
          });

          if (existingEntity) {
            // Update existing entity
            await trx('metadata_entity_header')
              .where('id', existingEntity.id)
              .update({
                schema_metadata: schemaMetadata,
                last_introspected_at: trx.fn.now(),
                updated_at: trx.fn.now(),
              });

            // Process fields (add new, update existing)
            const fieldResult = await this.syncFields(
              trx,
              existingEntity.id,
              tableInfo,
              existingEntity.id
            );

            entitiesUpdated++;
            fieldsCreated += fieldResult.created;
            fieldsUpdated += fieldResult.updated;
          } else {
            // Create new entity
            const [newEntity] = await trx('metadata_entity_header')
              .insert({
                data_source_id: dataSourceId,
                entity_name: tableInfo.name,
                entity_schema: tableInfo.schema || null,
                entity_type: 'table',
                schema_metadata: schemaMetadata,
                last_introspected_at: trx.fn.now(),
                is_active: false,  // Default: entities start inactive
                is_hidden: true,   // Default: entities start hidden
                created_by: userId,
                updated_at: trx.fn.now(),
                created_at: trx.fn.now(),
              })
              .returning('*');

            // Process fields
            const fieldResult = await this.syncFields(
              trx,
              newEntity.id,
              tableInfo,
              newEntity.id,
              true // isNewEntity
            );

            entitiesCreated++;
            fieldsCreated += fieldResult.created;
            fieldsUpdated += fieldResult.updated;
          }
        } catch (error) {
          errors.push(`Error syncing entity ${tableInfo.name}: ${error}`);
        }
      }

      // Log sync operation to audit
      if (userId) {
        await trx('audit_log').insert({
          user_id: userId,
          action: 'create',
          resource_type: 'metadata_entity',
          resource_id: dataSourceId,
          details: JSON.stringify({
            operation: 'sync_datasource',
            entitiesCreated,
            entitiesUpdated,
            fieldsCreated,
            fieldsUpdated,
            errors,
            table_count: introspectionResult.schema.tables.length,
          }),
          created_at: trx.fn.now(),
        });
      }

      await trx.commit();

      return { entitiesCreated, entitiesUpdated, fieldsCreated, fieldsUpdated, errors };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Sync fields for an entity
   *
   * @param trx - Knex transaction
   * @param entityHeaderId - Entity header ID
   * @param tableInfo - Introspected table information
   * @param userId - User ID for audit
   * @param isNewEntity - Whether this is a new entity
   * @returns Summary of field sync
   */
  private static async syncFields(
    trx: Knex,
    entityHeaderId: string,
    tableInfo: TableInfo,
    userId?: string,
    isNewEntity: boolean = false
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    // Build a map of existing fields for quick lookup
    const existingFieldsMap = new Map<string, MetadataEntityField>();
    if (!isNewEntity) {
      const existingFields = await trx('metadata_entity_field')
        .where('entity_header_id', entityHeaderId)
        .select('*');

      for (const field of existingFields) {
        existingFieldsMap.set(field.field_name, field);
      }
    }

    // Process each column from the introspection
    for (const column of tableInfo.columns || []) {
      const existingField = existingFieldsMap.get(column.name);

      const fieldData = {
        entity_header_id: entityHeaderId,
        field_name: column.name,
        data_type: column.type || 'unknown',
        is_nullable: column.nullable ?? true,
        is_primary_key: tableInfo.primaryKey?.includes(column.name) ?? false,
        is_foreign_key: false, // Will be set below
        foreign_key_table: null as string | undefined,
        foreign_key_column: null as string | undefined,
        default_value: column.default !== undefined ? String(column.default) : null,
      };

      // Check if this column is a foreign key
      const fkInfo = tableInfo.foreignKeys?.find(
        fk => fk.columns.includes(column.name)
      );

      if (fkInfo) {
        fieldData.is_foreign_key = true;
        fieldData.foreign_key_table = fkInfo.referencedTable;
        fieldData.foreign_key_column = fkInfo.referencedColumns[0] || 'id';
      }

      if (existingField) {
        // Update existing field (preserve user-editable metadata)
        await trx('metadata_entity_field')
          .where('id', existingField.id)
          .update({
            // Update schema-derived fields
            data_type: fieldData.data_type,
            is_nullable: fieldData.is_nullable,
            is_primary_key: fieldData.is_primary_key,
            is_foreign_key: fieldData.is_foreign_key,
            foreign_key_table: fieldData.foreign_key_table,
            foreign_key_column: fieldData.foreign_key_column,
            default_value: fieldData.default_value,
            // Preserve user-provided metadata
            // description, is_display_field, is_searchable, display_order, relationship_ui_type remain unchanged
            updated_at: trx.fn.now(),
          });
        updated++;
      } else {
        // Create new field with defaults
        await trx('metadata_entity_field').insert({
          ...fieldData,
          description: null,
          is_display_field: false,
          is_searchable: true,
          display_order: null,
          relationship_ui_type: null,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });
        created++;
      }
    }

    return { created, updated };
  }

  /**
   * Get entities that need to be synced (stale metadata)
   */
  static async getStaleDataSources(
    staleThresholdHours: number = 24
  ): Promise<Array<{ id: string; name: string; last_synced?: string }>> {
    // Find data_sources that have:
    // 1. Never been synced (no entities in metadata_entity_header)
    // 2. Have entities with stale metadata (last_introspected_at > threshold)

    // This is a simplified version - in production you'd want to optimize this
    const dataSources = await getDb()('data_sources')
      .where('is_active', true)
      .select('id', 'name');

    const staleSources: Array<{ id: string; name: string; last_synced?: string }> = [];

    for (const ds of dataSources) {
      // Check if datasource has any entities
      const entities = await getDb()('metadata_entity_header')
        .where('data_source_id', ds.id)
        .select('last_introspected_at')
        .orderBy('last_introspected_at', 'desc')
        .limit(1);

      if (entities.length === 0) {
        // Never synced
        staleSources.push({
          id: ds.id,
          name: ds.name,
          last_synced: undefined,
        });
      } else {
        // Check if stale
        const lastSynced = new Date(entities[0].last_introspected_at);
        const staleDate = new Date();
        staleDate.setHours(staleDate.getHours() - staleThresholdHours);

        if (lastSynced < staleDate) {
          staleSources.push({
            id: ds.id,
            name: ds.name,
            last_synced: lastSynced.toISOString(),
          });
        }
      }
    }

    return staleSources;
  }

  /**
   * Sync all stale datasources
   * Use this for a scheduled job or manual trigger
   */
  static async syncStaleDataSources(
    staleThresholdHours: number = 24,
    userId?: string
  ): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    details: Array<{ dataSourceId: string; dataSourceName: string; success: boolean; error?: string }>;
  }> {
    const staleSources = await this.getStaleDataSources(staleThresholdHours);

    const details: Array<{ dataSourceId: string; dataSourceName: string; success: boolean; error?: string }> = [];
    let succeeded = 0;
    let failed = 0;

    for (const ds of staleSources) {
      try {
        await this.syncDataSource(ds.id, userId);
        details.push({
          dataSourceId: ds.id,
          dataSourceName: ds.name,
          success: true,
        });
        succeeded++;
      } catch (error) {
        details.push({
          dataSourceId: ds.id,
          dataSourceName: ds.name,
          success: false,
          error: String(error),
        });
        failed++;
      }
    }

    return {
      processed: staleSources.length,
      succeeded,
      failed,
      details,
    };
  }
}
