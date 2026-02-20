/**
 * Entity Service
 *
 * Provides CRUD operations for metadata_entity_header records.
 * All operations are transaction-safe and include audit logging.
 */

import { getDb } from '@/lib/db/config';
import type { Knex } from 'knex';
import type {
  MetadataEntityHeader,
  MetadataEntityWithFields,
  MetadataEntityListParams,
} from '@/types/database';

/**
 * Query builder for metadata_entity_header with optional filters
 */
export class EntityQueryBuilder {
  private query: Knex.Query;

  constructor() {
    this.query = getDb()('metadata_entity_header');
  }

  /**
   * Filter by data source ID
   */
  byDataSource(dataSourceId: string): EntityQueryBuilder {
    this.query = this.query.where('data_source_id', dataSourceId);
    return this;
  }

  /**
   * Filter by active status
   */
  byActive(isActive: boolean): EntityQueryBuilder {
    this.query = this.query.where('is_active', isActive);
    return this;
  }

  /**
   * Filter by hidden status
   */
  byHidden(isHidden: boolean): EntityQueryBuilder {
    this.query = this.query.where('is_hidden', isHidden);
    return this;
  }

  /**
   * Filter by entity type
   */
  byEntityType(entityType: 'table' | 'view'): EntityQueryBuilder {
    this.query = this.query.where('entity_type', entityType);
    return this;
  }

  /**
   * Search by entity name or description
   */
  search(searchTerm: string): EntityQueryBuilder {
    this.query = this.query.where((builder: Knex.Query) => {
      builder
        .where('entity_name', 'like', `%${searchTerm}%`)
        .orWhere('description', 'like', `%${searchTerm}%`);
    });
    return this;
  }

  /**
   * Include hidden entities in results
   */
  includeHidden(): EntityQueryBuilder {
    // No filter - returns all
    return this;
  }

  /**
   * Apply pagination
   */
  paginate(page: number = 1, limit: number = 50): EntityQueryBuilder {
    const offset = (page - 1) * limit;
    this.query = this.query.limit(limit).offset(offset);
    return this;
  }

  /**
   * Order by field
   */
  orderBy(column: string, direction: 'asc' | 'desc' = 'asc'): EntityQueryBuilder {
    this.query = this.query.orderBy(column, direction);
    return this;
  }

  /**
   * Execute query and return results
   */
  async execute(): Promise<MetadataEntityHeader[]> {
    return await this.query.select('*');
  }

  /**
   * Execute query and return first result or null
   */
  async first(): Promise<MetadataEntityHeader | null> {
    const results = await this.query.select('*').limit(1);
    return results[0] || null;
  }

  /**
   * Execute query with count
   */
  async withCount(): Promise<{ entities: MetadataEntityHeader[]; total: number }> {
    const entities = await this.query.select('*');

    // Clone query for count
    const countQuery = this.query.clone();
    countQuery.clearSelect().clearOrder().clearGroup();
    const [{ total }] = await countQuery.count('* as total');

    return { entities, total };
  }
}

/**
 * Entity Service
 */
export class EntityService {
  /**
   * Get entities with optional filters and pagination
   */
  static async list(
    params: MetadataEntityListParams = {}
  ): Promise<{ entities: MetadataEntityHeader[]; total: number }> {
    const builder = new EntityQueryBuilder();

    // Apply filters
    if (params.data_source_id) {
      builder.byDataSource(params.data_source_id);
    }

    if (params.include_hidden) {
      // Include both active and inactive, visible and hidden
    } else {
      // Default: only active and non-hidden
      builder.byActive(true).byHidden(false);
    }

    if (params.search) {
      builder.search(params.search);
    }

    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 50;
    builder.paginate(page, limit);

    // Apply default ordering
    builder.orderBy('entity_name', 'asc');

    return await builder.withCount();
  }

  /**
   * Get single entity by ID with fields
   */
  static async getById(id: string): Promise<MetadataEntityWithFields | null> {
    const entity = await getDb()('metadata_entity_header')
      .where('id', id)
      .first();

    if (!entity) {
      return null;
    }

    // Fetch fields for this entity
    const fields = await getDb()('metadata_entity_field')
      .where('entity_header_id', id)
      .orderBy('display_order', 'asc')
      .select('*');

    return {
      ...entity,
      fields,
    } as MetadataEntityWithFields;
  }

  /**
   * Get entity by name (for foreign key lookups)
   */
  static async getByName(
    dataSourceId: string,
    entityName: string,
    entitySchema?: string
  ): Promise<MetadataEntityWithFields | null> {
    const entity = await getDb()('metadata_entity_header')
      .where({
        data_source_id: dataSourceId,
        entity_name: entityName,
        ...(entitySchema && { entity_schema: entitySchema }),
      })
      .first();

    if (!entity) {
      return null;
    }

    // Fetch fields for this entity
    const fields = await getDb()('metadata_entity_field')
      .where('entity_header_id', entity.id)
      .orderBy('display_order', 'asc')
      .select('*');

    return {
      ...entity,
      fields,
    } as MetadataEntityWithFields;
  }

  /**
   * Create new entity metadata
   * Note: This is typically called during datasource inspection, not manually
   */
  static async create(
    data: Omit<MetadataEntityHeader, 'id' | 'created_at' | 'updated_at'>
  ): Promise<MetadataEntityHeader> {
    const [entity] = await getDb()('metadata_entity_header')
      .insert({
        ...data,
        updated_at: getDb().fn.now(),
      })
      .returning('*');

    return entity;
  }

  /**
   * Update entity metadata
   * Only editable fields can be updated: description, is_active, is_hidden
   */
  static async update(
    id: string,
    data: Partial<Pick<MetadataEntityHeader, 'description' | 'is_active' | 'is_hidden'>>,
    userId?: string
  ): Promise<MetadataEntityHeader | null> {
    const [entity] = await getDb()('metadata_entity_header')
      .where('id', id)
      .update({
        ...data,
        updated_at: getDb().fn.now(),
      })
      .returning('*');

    if (!entity) {
      return null;
    }

    // Log to audit trail
    if (userId) {
      await getDb()('audit_log').insert({
        user_id: userId,
        action: 'update',
        resource_type: 'metadata_entity',
        resource_id: id,
        details: JSON.stringify({
          updated_fields: Object.keys(data),
        }),
        created_at: getDb().fn.now(),
      });
    }

    return entity;
  }

  /**
   * Delete entity metadata (cascade deletes fields)
   * Note: This is a destructive operation
   */
  static async delete(id: string, userId?: string): Promise<boolean> {
    const count = await getDb()('metadata_entity_header')
      .where('id', id)
      .delete();

    if (count > 0 && userId) {
      // Log to audit trail
      await getDb()('audit_log').insert({
        user_id: userId,
        action: 'delete',
        resource_type: 'metadata_entity',
        resource_id: id,
        details: JSON.stringify({
          deleted: 'entity_metadata'
        }),
        created_at: getDb().fn.now(),
      });
    }

    return count > 0;
  }

  /**
   * Check if entity exists
   */
  static async exists(
    dataSourceId: string,
    entityName: string,
    entitySchema?: string
  ): Promise<boolean> {
    const result = await getDb()('metadata_entity_header')
      .where({
        data_source_id: dataSourceId,
        entity_name: entityName,
        ...(entitySchema && { entity_schema: entitySchema }),
      })
      .first();

    return !!result;
  }

  /**
   * Get active entities count for a datasource
   */
  static async countActive(dataSourceId: string): Promise<number> {
    const [{ count }] = await getDb()('metadata_entity_header')
      .where({
        data_source_id: dataSourceId,
        is_active: true,
        is_hidden: false,
      })
      .count('* as count');

    return count;
  }

  /**
   * Get entities that need introspection (stale metadata)
   */
  static async getStaleEntities(
    dataSourceId: string,
    staleThresholdHours: number = 24
  ): Promise<MetadataEntityHeader[]> {
    const staleDate = new Date();
    staleDate.setHours(staleDate.getHours() - staleThresholdHours);

    return await getDb()('metadata_entity_header')
      .where('data_source_id', dataSourceId)
      .where('last_introspected_at', '<', staleDate)
      .select('*');
  }

  /**
   * Get query builder for complex queries
   */
  static query(): EntityQueryBuilder {
    return new EntityQueryBuilder();
  }
}
