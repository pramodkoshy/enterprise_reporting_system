'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, Database, Settings, ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MetadataEntity {
  id: string
  data_source_id: string
  entity_name: string
  entity_schema?: string
  entity_type: 'table' | 'view'
  description?: string
  is_active: boolean
  is_hidden: boolean
  last_introspected_at: string
  data_source_name?: string
  field_count?: number
}

export default function MetadataEntitiesPage() {
  const searchParams = useSearchParams()
  const dataSourceId = searchParams.get('data_source_id')
  const [search, setSearch] = useState('')
  const [showHidden, setShowHidden] = useState(true)  // Default to true to show hidden entities
  const [showInactive, setShowInactive] = useState(true)  // Default to true to show inactive entities

  // Block direct access - must have datasource filter
  if (!dataSourceId) {
    return (
      <div className="container mx-auto p-6">
        <div className="mx-auto max-w-md text-center py-12">
          <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground mb-6">
            Entity metadata management must be accessed from a datasource.
          </p>
          <Link href="/data-sources">
            <Button>
              <Database className="h-4 w-4 mr-2" />
              Go to Data Sources
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const { data: response, isLoading } = useQuery({
    queryKey: ['metadata-entities', showHidden, showInactive, dataSourceId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (showHidden) params.set('include_hidden', 'true')
      if (showInactive) params.set('is_active', 'false')
      if (dataSourceId) params.set('data_source_id', dataSourceId)

      console.log('[MetadataEntities] Fetching with params:', { showHidden, showInactive, dataSourceId, params: params.toString() })
      const res = await fetch(`/api/metadata/entities?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch entities')
      const data = await res.json()
      console.log('[MetadataEntities] Response:', data)
      return data
    },
    refetchOnWindowFocus: false,
  })

  const entities = response?.data?.entities ?? []

  const filteredEntities = entities?.filter(entity => {
    const searchLower = search.toLowerCase()
    return (
      entity.entity_name.toLowerCase().includes(searchLower) ||
      entity.description?.toLowerCase().includes(searchLower) ||
      entity.data_source_name?.toLowerCase().includes(searchLower)
    )
  })

  const activeCount = entities?.filter(e => e.is_active && !e.is_hidden).length ?? 0
  const hiddenCount = entities?.filter(e => e.is_hidden).length ?? 0
  const inactiveCount = entities?.filter(e => !e.is_active).length ?? 0

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/data-sources">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Data Sources
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Entity Metadata</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Configure entity descriptions, field sections, and display settings for this datasource
          </p>
        </div>
      </div>

      {/* Workflow Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Settings className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-400">
              Entity Configuration Workflow
            </h3>
            <ol className="text-sm text-blue-700 dark:text-blue-400 mt-2 space-y-1 list-decimal list-inside">
              <li>Inspect datasource schema to import entities (from Data Sources page)</li>
              <li>Activate entities you want to use</li>
              <li>Unhide entities to make them visible</li>
              <li>Add business descriptions to entities and fields</li>
              <li>Configure field sections for better organization</li>
              <li>Set display order and relationship UI types</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Entities</p>
              <p className="text-2xl font-bold">{entities?.length ?? 0}</p>
            </div>
            <Database className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active & Visible</p>
              <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            </div>
            <Settings className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Hidden</p>
              <p className="text-2xl font-bold text-orange-600">{hiddenCount}</p>
            </div>
            <Settings className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-2xl font-bold text-red-600">{inactiveCount}</p>
            </div>
            <Settings className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 border rounded-lg p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search entities by name, description, or datasource..."
            className="w-full pl-10 pr-4 py-2 border rounded-md"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
            className="w-4 h-4"
          />
          <span>Show Hidden</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4"
          />
          <span>Show Inactive</span>
        </label>
      </div>

      {/* Entities Table */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading entities...</p>
        </div>
      ) : filteredEntities && filteredEntities.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-4 font-medium">Entity Name</th>
                <th className="text-left p-4 font-medium">Type</th>
                <th className="text-left p-4 font-medium">Data Source</th>
                <th className="text-left p-4 font-medium">Description</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Fields</th>
                <th className="text-left p-4 font-medium">Last Introspected</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntities.map((entity) => (
                <tr key={entity.id} className="border-t hover:bg-muted/50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{entity.entity_name}</span>
                      {entity.entity_schema && (
                        <span className="text-xs text-muted-foreground">
                          ({entity.entity_schema})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        entity.entity_type === 'table'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {entity.entity_type}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {entity.data_source_name || entity.data_source_id}
                  </td>
                  <td className="p-4 text-sm max-w-md truncate">
                    {entity.description || <span className="text-muted-foreground italic">No description</span>}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {entity.is_active ? (
                        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">
                          Inactive
                        </span>
                      )}
                      {entity.is_hidden && (
                        <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-700">
                          Hidden
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    {entity.field_count ?? '-'}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(entity.last_introspected_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/metadata/entities/${entity.id}`}
                      className="text-primary hover:underline text-sm"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No entities found for this datasource</h3>
          <p className="text-muted-foreground mb-4">
            {search
              ? 'Try adjusting your search or filters'
              : 'Go back to Data Sources and click "Inspect Schema" to import entities from this datasource'
            }
          </p>
          {!search && (
            <Link href="/data-sources">
              <Button>
                <RefreshCw className="h-4 w-4 mr-2" />
                Inspect Schema
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
