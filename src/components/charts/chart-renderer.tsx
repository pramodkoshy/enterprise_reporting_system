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
  chartConfig: ChartConfig;
  dataMapping: DataMapping;
  height?: number;
}

const DEFAULT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function ChartRenderer({
  data,
  chartType,
  chartConfig,
  dataMapping,
  height = 400,
}: ChartRendererProps) {
  const colors = chartConfig.colors || DEFAULT_COLORS;

  const commonAxisProps = useMemo(
    () => ({
      xAxis: {
        dataKey: dataMapping.xAxis?.field,
        label: chartConfig.xAxis?.label
          ? { value: chartConfig.xAxis.label, position: 'bottom' }
          : undefined,
        hide: chartConfig.xAxis?.hide,
      },
      yAxis: {
        label: chartConfig.yAxis?.label
          ? { value: chartConfig.yAxis.label, angle: -90, position: 'insideLeft' }
          : undefined,
        hide: chartConfig.yAxis?.hide,
      },
    }),
    [dataMapping, chartConfig]
  );

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis {...commonAxisProps.xAxis} />
            <YAxis {...commonAxisProps.yAxis} />
            {chartConfig.tooltip?.enabled !== false && <Tooltip />}
            {chartConfig.legend?.show !== false && (
              <Legend verticalAlign={chartConfig.legend?.position === 'top' ? 'top' : 'bottom'} />
            )}
            {dataMapping.yAxis?.map((field, index) => (
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
            {chartConfig.tooltip?.enabled !== false && <Tooltip />}
            {chartConfig.legend?.show !== false && (
              <Legend verticalAlign={chartConfig.legend?.position === 'top' ? 'top' : 'bottom'} />
            )}
            {dataMapping.yAxis?.map((field, index) => (
              <Line
                key={field.field}
                type="monotone"
                dataKey={field.field}
                name={field.label || field.field}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
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
            {chartConfig.tooltip?.enabled !== false && <Tooltip />}
            {chartConfig.legend?.show !== false && (
              <Legend verticalAlign={chartConfig.legend?.position === 'top' ? 'top' : 'bottom'} />
            )}
            {dataMapping.yAxis?.map((field, index) => (
              <Area
                key={field.field}
                type="monotone"
                dataKey={field.field}
                name={field.label || field.field}
                fill={colors[index % colors.length]}
                fillOpacity={0.3}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );

      case 'pie':
        const pieDataKey = dataMapping.yAxis?.[0]?.field || 'value';
        const pieNameKey = dataMapping.xAxis?.field || 'name';
        return (
          <PieChart>
            {chartConfig.tooltip?.enabled !== false && <Tooltip />}
            {chartConfig.legend?.show !== false && (
              <Legend verticalAlign={chartConfig.legend?.position === 'top' ? 'top' : 'bottom'} />
            )}
            <Pie
              data={data}
              dataKey={pieDataKey}
              nameKey={pieNameKey}
              cx="50%"
              cy="50%"
              outerRadius={height / 3}
              label
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              {...commonAxisProps.xAxis}
              type="number"
              dataKey={dataMapping.xAxis?.field}
            />
            <YAxis
              {...commonAxisProps.yAxis}
              type="number"
              dataKey={dataMapping.yAxis?.[0]?.field}
            />
            {chartConfig.tooltip?.enabled !== false && <Tooltip cursor={{ strokeDasharray: '3 3' }} />}
            {chartConfig.legend?.show !== false && (
              <Legend verticalAlign={chartConfig.legend?.position === 'top' ? 'top' : 'bottom'} />
            )}
            <Scatter
              name={dataMapping.yAxis?.[0]?.label || 'Data'}
              data={data}
              fill={colors[0]}
            />
          </ScatterChart>
        );

      case 'composed':
        return (
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis {...commonAxisProps.xAxis} />
            <YAxis {...commonAxisProps.yAxis} />
            {chartConfig.tooltip?.enabled !== false && <Tooltip />}
            {chartConfig.legend?.show !== false && (
              <Legend verticalAlign={chartConfig.legend?.position === 'top' ? 'top' : 'bottom'} />
            )}
            {dataMapping.yAxis?.map((field, index) => {
              // Alternate between bar and line for composed chart
              if (index % 2 === 0) {
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
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Unsupported chart type: {chartType}
          </div>
        );
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      {renderChart()}
    </ResponsiveContainer>
  );
}
