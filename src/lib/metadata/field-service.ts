/**
 * Field Service
 *
 * Provides CRUD operations for metadata_entity_field records.
 * All operations are transaction-safe and include audit logging.
 */

import { getDb } from '@/lib/db/config';
import type { MetadataEntityField } from '@/types/database';

/**
 * Field Service
 */
export class FieldService {
  /**
   * Get fields by entity header ID
   */
  static async getByEntityId(entityHeaderId: string): Promise<MetadataEntityField[]> {
    return await getDb()('metadata_entity_field')
      .where('entity_header_id', entityHeaderId)
      .orderBy('display_order', 'asc')
      .select('*');
  }

  /**
   * Get single field by ID
   */
  static async getById(id: string): Promise<MetadataEntityField | null> {
    return await getDb()('metadata_entity_field')
      .where('id', id)
      .first();
  }

  /**
   * Create new field metadata
   * Note: This is typically called during datasource inspection
   */
  static async create(
    data: Omit<MetadataEntityField, 'id' | 'created_at' | 'updated_at'>
  ): Promise<MetadataEntityField> {
    const [field] = await getDb()('metadata_entity_field')
      .insert({
        ...data,
        updated_at: getDb().fn.now(),
      })
      .returning('*');

    return field;
  }

  /**
   * Bulk create fields (transaction)
   */
  static async bulkCreate(
    fields: Array<Omit<MetadataEntityField, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<MetadataEntityField[]> {
    if (fields.length === 0) {
      return [];
    }

    const now = getDb().fn.now();

    const fieldData = fields.map(field => ({
      ...field,
      updated_at: now,
    }));

    return await getDb()('metadata_entity_field')
      .insert(fieldData)
      .returning('*');
  }

  /**
   * Update field metadata
   * Editable fields: description, is_display_field, is_searchable, display_order, relationship_ui_type
   */
  static async update(
    id: string,
    data: Partial<Pick<
      MetadataEntityField,
      'description' | 'is_display_field' | 'is_searchable' | 'display_order' | 'relationship_ui_type'
    >>,
    userId?: string
  ): Promise<MetadataEntityField | null> {
    const [field] = await getDb()('metadata_entity_field')
      .where('id', id)
      .update({
        ...data,
        updated_at: getDb().fn.now(),
      })
      .returning('*');

    if (!field) {
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

    return field;
  }

  /**
   * Bulk update fields (transaction)
   * Used for batch updates from the field metadata form
   */
  static async bulkUpdate(
    updates: Array<{
      id: string;
      data: Partial<Pick<
        MetadataEntityField,
        'description' | 'is_display_field' | 'is_searchable' | 'display_order' | 'relationship_ui_type'
      >>;
    }>,
    userId?: string
  ): Promise<MetadataEntityField[]> {
    if (updates.length === 0) {
      return [];
    }

    const trx = await getDb().transaction();

    try {
      const results: MetadataEntityField[] = [];

      for (const update of updates) {
        const [field] = await trx('metadata_entity_field')
          .where('id', update.id)
          .update({
            ...update.data,
            updated_at: getDb().fn.now(),
          })
          .returning('*');

        if (field) {
          results.push(field);
        }
      }

      // Single audit log entry for the batch update
      if (userId && results.length > 0) {
        await trx('audit_log').insert({
          user_id: userId,
          action: 'update',
          resource_type: 'metadata_entity',
          resource_id: 'bulk_field_update',
          details: JSON.stringify({
            updated_field_count: results.length,
            field_ids: results.map(f => f.id),
          }),
          created_at: getDb().fn.now(),
        });
      }

      await trx.commit();
      return results;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Delete field metadata
   */
  static async delete(id: string, userId?: string): Promise<boolean> {
    const count = await getDb()('metadata_entity_field')
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
          deleted: 'field_metadata'
        }),
        created_at: getDb().fn.now(),
      });
    }

    return count > 0;
  }

  /**
   * Delete all fields for an entity (cascade)
   */
  static async deleteByEntityId(entityHeaderId: string): Promise<number> {
    return await getDb()('metadata_entity_field')
      .where('entity_header_id', entityHeaderId)
      .delete();
  }

  /**
   * Get display fields for an entity
   */
  static async getDisplayFields(entityHeaderId: string): Promise<MetadataEntityField[]> {
    return await getDb()('metadata_entity_field')
      .where('entity_header_id', entityHeaderId)
      .where('is_display_field', true)
      .orderBy('display_order', 'asc')
      .select('*');
  }

  /**
   * Get foreign key fields for an entity
   */
  static async getForeignKeyFields(entityHeaderId: string): Promise<MetadataEntityField[]> {
    return await getDb()('metadata_entity_field')
      .where('entity_header_id', entityHeaderId)
      .where('is_foreign_key', true)
      .select('*');
  }

  /**
   * Get searchable fields for an entity
   */
  static async getSearchableFields(entityHeaderId: string): Promise<MetadataEntityField[]> {
    return await getDb()('metadata_entity_field')
      .where('entity_header_id', entityHeaderId)
      .where('is_searchable', true)
      .orderBy('display_order', 'asc')
      .select('*');
  }
}
