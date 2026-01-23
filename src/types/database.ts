// User Types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string;
  created_at: string;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  assigned_at: string;
}

// Data Source Types
export type DatabaseClientType =
  | 'pg'
  | 'mysql'
  | 'mssql'
  | 'sqlite3'
  | 'oracledb';

export interface DataSource {
  id: string;
  name: string;
  description?: string;
  client_type: DatabaseClientType;
  connection_config: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DataSourceConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  filename?: string;
  ssl?: boolean;
  pool?: {
    min: number;
    max: number;
  };
}

// Query Types
export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  data_source_id: string;
  sql_content: string;
  parameters_schema?: string;
  is_validated: boolean;
  validation_result?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface QueryParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime';
  label?: string;
  defaultValue?: unknown;
  required?: boolean;
  options?: Array<{ label: string; value: unknown }>;
}

// Report Types
export interface ReportDefinition {
  id: string;
  name: string;
  description?: string;
  saved_query_id?: string;
  column_config: string;
  filter_config?: string;
  sort_config?: string;
  pagination_config?: string;
  export_formats: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ColumnDefinition {
  id: string;
  field: string;
  header: string;
  visible: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable: boolean;
  filterable: boolean;
  resizable: boolean;
  formatter?: FormatterDefinition;
  conditionalFormatting?: ConditionalFormat[];
  aggregation?: AggregationType;
  cellRenderer?: CellRendererType;
  cellRendererConfig?: Record<string, unknown>;
}

export type FormatterType =
  | 'text'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'custom';

export interface FormatterDefinition {
  type: FormatterType;
  options?: {
    locale?: string;
    currency?: string;
    decimals?: number;
    dateFormat?: string;
    prefix?: string;
    suffix?: string;
    trueLabel?: string;
    falseLabel?: string;
    customFormatter?: string;
  };
}

export interface ConditionalFormat {
  id: string;
  condition: {
    operator: ConditionalOperator;
    value: unknown;
    value2?: unknown;
  };
  style: {
    backgroundColor?: string;
    textColor?: string;
    fontWeight?: 'normal' | 'bold';
    icon?: string;
    iconColor?: string;
  };
}

export type ConditionalOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'between'
  | 'in';

export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max';

export type CellRendererType =
  | 'default'
  | 'link'
  | 'badge'
  | 'progress'
  | 'custom';

// Chart Types
export type ChartType =
  | 'bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'scatter'
  | 'composed';

export interface ChartDefinition {
  id: string;
  name: string;
  description?: string;
  saved_query_id?: string;
  chart_type: ChartType;
  chart_config: string;
  data_mapping: string;
  refresh_interval?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ChartConfig {
  title?: {
    text: string;
    fontSize?: number;
    fontWeight?: string;
  };
  legend?: {
    show: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  colors?: string[];
  tooltip?: {
    enabled: boolean;
    formatter?: string;
  };
  animation?: {
    enabled: boolean;
    duration?: number;
  };
}

export interface AxisConfig {
  label?: string;
  tickFormatter?: string;
  domain?: [number | 'auto', number | 'auto'];
  hide?: boolean;
}

export interface DataMapping {
  xAxis: FieldMapping;
  yAxis: FieldMapping[];
  groupBy?: FieldMapping;
  colorBy?: FieldMapping;
}

export interface FieldMapping {
  field: string;
  label?: string;
  formatter?: FormatterDefinition;
  aggregation?: AggregationType;
}

// Dashboard Types
export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  layout_config: string;
  theme_config?: string;
  refresh_config?: string;
  is_public: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardLayoutConfig {
  cols: { lg: number; md: number; sm: number; xs: number };
  rowHeight: number;
  containerPadding: [number, number];
  margin: [number, number];
  layouts: {
    lg: LayoutItem[];
    md: LayoutItem[];
    sm: LayoutItem[];
    xs: LayoutItem[];
  };
}

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export interface DashboardThemeConfig {
  backgroundColor?: string;
  widgetBackgroundColor?: string;
  widgetBorderRadius?: number;
  widgetShadow?: string;
  fontFamily?: string;
}

export interface DashboardRefreshConfig {
  enabled: boolean;
  intervalSeconds: number;
  pauseOnHidden: boolean;
}

export type WidgetType = 'report' | 'chart' | 'metric' | 'text';

export interface DashboardWidget {
  id: string;
  dashboard_id: string;
  widget_type: WidgetType;
  report_id?: string;
  chart_id?: string;
  position_config: string;
  widget_config?: string;
  created_at: string;
  updated_at: string;
}

export interface WidgetConfig {
  title?: string;
  showTitle?: boolean;
  showBorder?: boolean;
  backgroundColor?: string;
  padding?: number;
  overrides?: Record<string, unknown>;
}

// Job Types
export type JobType = 'report' | 'chart' | 'export';

export type JobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface JobDefinition {
  id: string;
  name: string;
  job_type: JobType;
  target_id: string;
  schedule_cron?: string;
  parameters?: string;
  notification_config?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface JobExecution {
  id: string;
  job_definition_id: string;
  status: JobStatus;
  started_at?: string;
  completed_at?: string;
  result_location?: string;
  error_message?: string;
  execution_metadata?: string;
  created_at: string;
}

export interface JobNotificationConfig {
  email?: string;
  webhookUrl?: string;
}

// Permission Types
export type ResourceType =
  | 'data_source'
  | 'query'
  | 'report'
  | 'chart'
  | 'dashboard'
  | 'job'
  | 'queue'
  | 'user'
  | 'role';

export type PermissionLevel = 'view' | 'edit' | 'execute' | 'admin';

export interface ResourcePermission {
  id: string;
  resource_type: ResourceType;
  resource_id: string;
  role_id: string;
  permission_level: PermissionLevel;
  created_at: string;
}

// Audit Types
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'execute'
  | 'view'
  | 'export'
  | 'retry'
  | 'pause'
  | 'resume'
  | 'clean';

export interface AuditLog {
  id: string;
  user_id?: string;
  action: AuditAction;
  resource_type: ResourceType;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
