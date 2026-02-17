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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { NlChartConfig } from '@/types/database';

interface NlResultsChartProps {
  data: Record<string, unknown>[];
  config: NlChartConfig;
}

const DEFAULT_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c',
  '#d0ed57', '#8dd1e1', '#83a6ed', '#8e4585', '#ff6b6b',
];

export function NlResultsChart({ data, config }: NlResultsChartProps) {
  const colors = config.colors || DEFAULT_COLORS;

  // Prepare chart data
  const chartData = useMemo(() => {
    return data.map((row) => {
      const point: Record<string, unknown> = {};
      point[config.xAxis.field] = row[config.xAxis.field];

      for (const yField of config.yAxis) {
        const val = row[yField.field];
        point[yField.field] = typeof val === 'number' ? val : Number(val) || 0;
      }

      return point;
    });
  }, [data, config]);

  const renderChart = () => {
    switch (config.chartType) {
      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={config.xAxis.field}
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {config.yAxis.map((yField, idx) => (
              <Bar
                key={yField.field}
                dataKey={yField.field}
                name={yField.label}
                fill={colors[idx % colors.length]}
              />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={config.xAxis.field}
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {config.yAxis.map((yField, idx) => (
              <Line
                key={yField.field}
                type="monotone"
                dataKey={yField.field}
                name={yField.label}
                stroke={colors[idx % colors.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={config.xAxis.field}
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {config.yAxis.map((yField, idx) => (
              <Area
                key={yField.field}
                type="monotone"
                dataKey={yField.field}
                name={yField.label}
                fill={colors[idx % colors.length]}
                stroke={colors[idx % colors.length]}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie
              data={chartData}
              dataKey={config.yAxis[0]?.field || ''}
              nameKey={config.xAxis.field}
              cx="50%"
              cy="50%"
              outerRadius={150}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(1)}%`
              }
            >
              {chartData.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={config.xAxis.field}
              name={config.xAxis.label}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              dataKey={config.yAxis[0]?.field}
              name={config.yAxis[0]?.label}
              tick={{ fontSize: 12 }}
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter
              name={config.title}
              data={chartData}
              fill={colors[0]}
            />
          </ScatterChart>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Unsupported chart type: {config.chartType}
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-center">{config.title}</h3>
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          {renderChart()}
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-center text-muted-foreground">
        {chartData.length} data points &middot; {config.chartType} chart
      </p>
    </div>
  );
}
