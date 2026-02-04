'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Play, AlertTriangle } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import type { FilterFieldType, FilterOperator } from '@/types/database';

export interface ReportFilter {
  id: string;
  filter_id: string;
  target_column: string;
  filter_order: number;
  filter_name: string;
  description: string | null;
  data_source_id: string;
  filter_query: string;
  display_field: string;
  value_field: string;
  field_type?: FilterFieldType;
  operator?: FilterOperator;
  date_validation_config?: string;
}

export interface FilterOption {
  value: string | number;
  label: string;
}

interface FilterBarProps {
  reportId?: string;
  chartId?: string;
  filters: ReportFilter[];
  type: 'report' | 'chart';
}

export function FilterBar({ reportId, chartId, filters, type }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedValues, setSelectedValues] = useState<Record<string, string | string[]>>({});
  const [appliedValues, setAppliedValues] = useState<Record<string, string | string[]>>({});

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Initialize selected values from URL based on field type
  useEffect(() => {
    const initialValues: Record<string, string | string[]> = {};
    filters.forEach((filter) => {
      const value = searchParams.get(`filter_${filter.filter_id}`);
      const fieldType = filter.field_type || 'id';

      if (value) {
        if (fieldType === 'id') {
          // ID fields: comma-separated values
          initialValues[filter.filter_id] = value.split(',').map(v => v.trim()).filter(Boolean);
        } else if (fieldType === 'number') {
          // Number fields: single value
          initialValues[filter.filter_id] = value;
        } else if (fieldType === 'date') {
          // Date fields: two values separated by pipe (from|to)
          const [from, to] = value.split('|');
          initialValues[filter.filter_id] = {
            from: from || getTodayDate(),
            to: to || getTodayDate(),
          };
        } else if (fieldType === 'text') {
          // Text fields: single value
          initialValues[filter.filter_id] = value;
        }
      } else {
        // Set defaults
        if (fieldType === 'id') {
          initialValues[filter.filter_id] = [];
        } else if (fieldType === 'date') {
          initialValues[filter.filter_id] = {
            from: getTodayDate(),
            to: getTodayDate(),
          };
        } else {
          initialValues[filter.filter_id] = '';
        }
      }
    });
    setSelectedValues(initialValues);
    setAppliedValues(initialValues);
  }, [filters, searchParams]);

  // Fetch filter options for ID field types only
  const filterOptionsQueries = filters
    .filter(f => !f.field_type || f.field_type === 'id')
    .map((filter) => ({
      ...useQuery({
        queryKey: ['filter-options', filter.filter_id],
        queryFn: async (): Promise<FilterOption[]> => {
          const res = await fetch(`/api/filters/${filter.filter_id}/options`);
          if (!res.ok) throw new Error('Failed to fetch filter options');
          return res.json();
        },
      }),
      filter,
    }));

  const handleFilterChange = (filterId: string, value: string | string[] | { from: string; to: string }) => {
    const newValues = { ...selectedValues, [filterId]: value };
    setSelectedValues(newValues);
    // Don't update URL immediately - wait for Run button
  };

  const handleRun = () => {
    // Update URL with selected filter values based on field type
    const params = new URLSearchParams(searchParams);
    Object.entries(selectedValues).forEach(([fid, val]) => {
      const filter = filters.find(f => f.filter_id === fid);
      const fieldType = filter?.field_type || 'id';

      if (fieldType === 'id') {
        // ID fields: comma-separated
        const vals = val as string[];
        if (vals.length > 0) {
          params.set(`filter_${fid}`, vals.join(','));
        } else {
          params.delete(`filter_${fid}`);
        }
      } else if (fieldType === 'date') {
        // Date fields: pipe-separated (from|to)
        const dateVal = val as { from: string; to: string };
        params.set(`filter_${fid}`, `${dateVal.from}|${dateVal.to}`);
      } else if (fieldType === 'number' || fieldType === 'text') {
        // Number and text fields: single value
        const strVal = val as string;
        if (strVal) {
          params.set(`filter_${fid}`, strVal);
        } else {
          params.delete(`filter_${fid}`);
        }
      }
    });
    setAppliedValues(selectedValues);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  if (filters.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Filters</h3>
              <p className="text-sm text-muted-foreground">
                Select values and click Run to apply filters
              </p>
            </div>
            <Button onClick={handleRun} className="gap-2">
              <Play className="h-4 w-4" />
              Run Report
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => {
              const fieldType = filter.field_type || 'id';
              const value = selectedValues[filter.filter_id];
              const appliedValue = appliedValues[filter.filter_id];

              // Check for pending changes
              const hasPendingChanges = JSON.stringify(value) !== JSON.stringify(appliedValue);

              // Find filter options query for ID fields
              const optionsQuery = filterOptionsQueries.find(q => q.filter.id === filter.id);
              const isLoading = optionsQuery?.isLoading;
              const options = optionsQuery?.data;

              return (
                <div key={filter.id} className="space-y-2">
                  <Label className="flex items-center gap-2">
                    {filter.filter_name}
                    {hasPendingChanges && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                        Pending
                      </span>
                    )}
                    {filter.description && (
                      <span className="text-muted-foreground text-xs ml-2">
                        {filter.description}
                      </span>
                    )}
                  </Label>

                  {/* ID Field Type: MultiSelect Dropdown */}
                  {fieldType === 'id' && (
                    isLoading ? (
                      <div className="flex items-center gap-2 h-10 px-3 py-2 border rounded-md">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading...</span>
                      </div>
                    ) : (
                      <MultiSelect
                        options={options?.map((opt) => ({
                          label: opt.label,
                          value: String(opt.value),
                        })) || []}
                        value={(value as string[]) || []}
                        onValueChange={(vals) => handleFilterChange(filter.filter_id, vals)}
                        placeholder={`Select ${filter.filter_name}...`}
                        className="w-full"
                      />
                    )
                  )}

                  {/* Number Field Type: Number Input */}
                  {fieldType === 'number' && (
                    <Input
                      type="number"
                      value={(value as string) || ''}
                      onChange={(e) => handleFilterChange(filter.filter_id, e.target.value)}
                      placeholder={`Enter ${filter.filter_name.toLowerCase()}...`}
                    />
                  )}

                  {/* Date Field Type: Date Range Picker */}
                  {fieldType === 'date' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">From</Label>
                        <Input
                          type="date"
                          value={(value as { from: string; to: string })?.from || getTodayDate()}
                          onChange={(e) =>
                            handleFilterChange(filter.filter_id, {
                              ...(value as { from: string; to: string }),
                              from: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">To</Label>
                        <Input
                          type="date"
                          value={(value as { from: string; to: string })?.to || getTodayDate()}
                          onChange={(e) =>
                            handleFilterChange(filter.filter_id, {
                              ...(value as { from: string; to: string }),
                              to: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Text Field Type: Text Input with Warning */}
                  {fieldType === 'text' && (
                    <div>
                      <Input
                        type="text"
                        value={(value as string) || ''}
                        onChange={(e) => handleFilterChange(filter.filter_id, e.target.value)}
                        placeholder={`Enter ${filter.filter_name.toLowerCase()}...`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
