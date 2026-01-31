'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ChartType, ChartConfig, DataMapping } from '@/types/database';

interface ChartRendererProps {
  data: Record<string, unknown>[];
  chartType: ChartType;
  chartConfig: ChartConfig | null | undefined;
  dataMapping: DataMapping | null | undefined;
  height?: number;
}

const DEFAULT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const DEFAULT_CHART_CONFIG: ChartConfig = {
  title: { show: true, text: '' },
  legend: { show: true, position: 'bottom' },
  tooltip: { enabled: true },
  animation: true,
  colors: DEFAULT_COLORS,
  xAxis: { label: '', hide: false },
  yAxis: { label: '', hide: false },
};

const DEFAULT_DATA_MAPPING: DataMapping = {
  xAxis: { field: '', label: '' },
  yAxis: [],
  groupBy: '',
  colorBy: '',
};

export function ChartRenderer({
  data,
  chartType,
  chartConfig,
  dataMapping,
  height = 400,
}: ChartRendererProps) {
  // Use safe defaults if configs are undefined
  const safeConfig: ChartConfig = chartConfig || DEFAULT_CHART_CONFIG;
  const safeMapping: DataMapping = dataMapping || DEFAULT_DATA_MAPPING;

  const colors = safeConfig.colors || DEFAULT_COLORS;

  const commonAxisProps = useMemo(
    () => ({
      xAxis: {
        dataKey: safeMapping.xAxis?.field,
        label: safeConfig.xAxis?.label
          ? { value: safeConfig.xAxis.label, position: 'bottom' }
          : undefined,
        hide: safeConfig.xAxis?.hide,
      },
      yAxis: {
        label: safeConfig.yAxis?.label
          ? { value: safeConfig.yAxis.label, angle: -90, position: 'insideLeft' }
          : undefined,
        hide: safeConfig.yAxis?.hide,
      },
    }),
    [safeMapping, safeConfig]
  );

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis {...commonAxisProps.xAxis} />
            <YAxis {...commonAxisProps.yAxis} />
            {safeConfig.tooltip?.enabled !== false && <Tooltip />}
            {safeConfig.legend?.show !== false && (
              <Legend verticalAlign={safeConfig.legend?.position === 'top' ? 'top' : 'bottom'} />
            )}
            {safeMapping.yAxis?.map((field, index) => (
              <Bar
                key={field.field}
                dataKey={field.field}
                name={field.label || field.field}
                fill={colors[index % colors.length]}
              />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis {...commonAxisProps.xAxis} />
            <YAxis {...commonAxisProps.yAxis} />
            {safeConfig.tooltip?.enabled !== false && <Tooltip />}
            {safeConfig.legend?.show !== false && (
              <Legend verticalAlign={safeConfig.legend?.position === 'top' ? 'top' : 'bottom'} />
            )}
            {safeMapping.yAxis?.map((field, index) => (
              <Line
                key={field.field}
                type="monotone"
                dataKey={field.field}
                name={field.label || field.field}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis {...commonAxisProps.xAxis} />
            <YAxis {...commonAxisProps.yAxis} />
            {safeConfig.tooltip?.enabled !== false && <Tooltip />}
            {safeConfig.legend?.show !== false && (
              <Legend verticalAlign={safeConfig.legend?.position === 'top' ? 'top' : 'bottom'} />
            )}
            {safeMapping.yAxis?.map((field, index) => (
              <Area
                key={field.field}
                type="monotone"
                dataKey={field.field}
                name={field.label || field.field}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
              />
            ))}
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            {safeConfig.tooltip?.enabled !== false && <Tooltip />}
            {safeConfig.legend?.show !== false && <Legend />}
            {safeMapping.yAxis?.map((field, index) => (
              <Pie
                key={field.field}
                dataKey={field.field}
                name={field.label || field.field}
                fill={colors[index % colors.length]}
                label
              />
            ))}
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis {...commonAxisProps.xAxis} />
            <YAxis {...commonAxisProps.yAxis} />
            {safeConfig.tooltip?.enabled !== false && <Tooltip />}
            {safeConfig.legend?.show !== false && <Legend />}
            {safeMapping.yAxis?.map((field, index) => (
              <Scatter
                key={field.field}
                dataKey={field.field}
                name={field.label || field.field}
                fill={colors[index % colors.length]}
              />
            ))}
          </ScatterChart>
        );

      case 'column':
        return (
          <BarChart data={data} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis {...commonAxisProps.xAxis} type="number" />
            <YAxis {...commonAxisProps.yAxis} type="category" dataKey={safeMapping.xAxis?.field} />
            {safeConfig.tooltip?.enabled !== false && <Tooltip />}
            {safeConfig.legend?.show !== false && (
              <Legend verticalAlign={safeConfig.legend?.position === 'top' ? 'top' : 'bottom'} />
            )}
            {safeMapping.yAxis?.map((field, index) => (
              <Bar
                key={field.field}
                dataKey={field.field}
                name={field.label || field.field}
                fill={colors[index % colors.length]}
              />
            ))}
          </BarChart>
        );

      case 'doughnut':
        return (
          <PieChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            {safeConfig.tooltip?.enabled !== false && <Tooltip />}
            {safeConfig.legend?.show !== false && <Legend />}
            {safeMapping.yAxis?.map((field, index) => (
              <Pie
                key={field.field}
                dataKey={field.field}
                name={field.label || field.field}
                fill={colors[index % colors.length]}
                innerRadius={60}
                outerRadius={80}
                label
              />
            ))}
          </PieChart>
        );

      case 'composed':
        return (
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis {...commonAxisProps.xAxis} />
            <YAxis {...commonAxisProps.yAxis} />
            {safeConfig.tooltip?.enabled !== false && <Tooltip />}
            {safeConfig.legend?.show !== false && (
              <Legend verticalAlign={safeConfig.legend?.position === 'top' ? 'top' : 'bottom'} />
            )}
            {safeMapping.yAxis?.map((field, index) => {
              // First series as bar, rest as line
              if (index === 0) {
                return (
                  <Bar
                    key={field.field}
                    dataKey={field.field}
                    name={field.label || field.field}
                    fill={colors[index % colors.length]}
                  />
                );
              }
              return (
                <Line
                  key={field.field}
                  type="monotone"
                  dataKey={field.field}
                  name={field.label || field.field}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                />
              );
            })}
          </ComposedChart>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Unsupported chart type: {chartType}</p>
          </div>
        );
    }
  };

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
