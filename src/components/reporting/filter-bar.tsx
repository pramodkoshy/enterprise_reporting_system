'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

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
}

export interface FilterOption {
  value: string | number;
  label: string;
}

interface FilterBarProps {
  reportId: string | chartId: string;
  filters: ReportFilter[];
  type: 'report' | 'chart';
}

export function FilterBar({ reportId, chartId, filters, type }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});

  // Initialize selected values from URL
  useEffect(() => {
    const initialValues: Record<string, string> = {};
    filters.forEach((filter) => {
      const value = searchParams.get(`filter_${filter.filter_id}`);
      if (value) {
        initialValues[filter.filter_id] = value;
      }
    });
    setSelectedValues(initialValues);
  }, [filters, searchParams]);

  // Fetch filter options for each filter
  const filterOptionsQueries = filters.map((filter) => ({
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

  const handleFilterChange = (filterId: string, value: string) => {
    const newValues = { ...selectedValues, [filterId]: value };
    setSelectedValues(newValues);

    // Update URL with new filter values
    const params = new URLSearchParams(searchParams);
    Object.entries(newValues).forEach(([fid, val]) => {
      params.set(`filter_${fid}`, val);
    });
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleFilterClear = (filterId: string) => {
    const newValues = { ...selectedValues };
    delete newValues[filterId];
    setSelectedValues(newValues);

    // Update URL without this filter
    const params = new URLSearchParams(searchParams);
    params.delete(`filter_${filterId}`);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  if (filters.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filterOptionsQueries.map(({ data: options, isLoading, filter }) => (
            <div key={filter.id} className="space-y-2">
              <Label htmlFor={`filter-${filter.id}`}>
                {filter.filter_name}
                {filter.description && (
                  <span className="text-muted-foreground text-xs ml-2">
                    {filter.description}
                  </span>
                )}
              </Label>
              <Select
                value={selectedValues[filter.filter_id] || ''}
                onValueChange={(value) => {
                  if (value === '__clear__') {
                    handleFilterClear(filter.filter_id);
                  } else {
                    handleFilterChange(filter.filter_id, value);
                  }
                }}
              >
                <SelectTrigger id={`filter-${filter.id}`}>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder={`Select ${filter.filter_name}...`} />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {selectedValues[filter.filter_id] && (
                    <SelectItem value="__clear__">— Clear —</SelectItem>
                  )}
                  {options?.map((option) => (
                    <SelectItem key={String(option.value)} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
