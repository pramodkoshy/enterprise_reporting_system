# Enterprise Reporting and Dashboard System

A professional, production-ready enterprise reporting system built with Next.js, featuring real-time data streaming, advanced filtering, automated scheduling, and comprehensive export capabilities.

## 🚀 Key Features

### Core Reporting Engine
- **TanStack Table** - Headless data grid with server-side pagination, sorting, and filtering
- **Knex.js** - SQL query builder for dynamic, secure data access
- **Row-Level Security** - Built-in RLS implementation at application level
- **Real-time Updates** - WebSocket-powered live data streaming
- **Advanced Filtering** - Dynamic query builder with multiple operators

### Data Visualization
- **Recharts Integration** - Professional charts (Bar, Line, Pie, Area)
- **Interactive Dashboards** - Drag-and-drop dashboard builder with React Grid Layout
- **Customizable Widgets** - Multiple visualization types per dashboard
- **Responsive Design** - Mobile-optimized interfaces

### Export & Delivery
- **CSV Export** - Fast, formatted CSV generation
- **Excel Export** - Professional spreadsheets with formatting and formulas
- **PDF Export** - Publication-ready PDF documents
- **Email Delivery** - SMTP-based report distribution
- **Scheduled Reports** - Cron-based automated generation and delivery

### Enterprise Features
- **Role-Based Access Control (RBAC)** - Fine-grained permissions
- **Audit Logging** - Complete export and email delivery history
- **Saved Views** - User-specific report configurations
- **Multi-Database** - SQLite for metadata, PostgreSQL for business data
- **Session Management** - Secure iron-session based authentication

## 📋 Technology Stack

- **Framework**: Next.js 14 (App Router)
- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **Data Management**: TanStack Query + TanStack Table
- **Database**: 
  - SQLite (Metadata: users, roles, reports, schedules)
  - PostgreSQL (Business Data)
- **Query Builder**: Knex.js
- **Real-time**: Socket.IO
- **Scheduling**: node-cron
- **Export**: ExcelJS, PDFKit, PapaParse
- **Email**: Nodemailer
- **Authentication**: iron-session + JWT

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- SMTP Server (for email delivery)

### Setup Steps

1. **Clone and Install**
```bash
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Setup Databases**
```bash
# Create PostgreSQL database
createdb enterprise_data

# Run migrations
npm run db:migrate

# Optional: Seed sample data
npm run db:seed
```

4. **Initialize Application**
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

5. **Start Background Services**
```bash
# In separate terminals:
npm run scheduler:start    # Report scheduling
npm run websocket:start    # Real-time updates
```

## 📁 Project Structure

```
enterprise-reporting-system/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (dashboard)/          # Dashboard layouts
│   │   └── api/                  # API routes
│   │       ├── reports/          # Report endpoints
│   │       ├── dashboards/       # Dashboard endpoints
│   │       └── exports/          # Export endpoints
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── reporting/            # Report components
│   │   │   ├── DataTable.tsx     # TanStack Table wrapper
│   │   │   ├── ChartView.tsx     # Recharts wrapper
│   │   │   └── QueryBuilder.tsx  # Filter UI
│   │   └── dashboard/            # Dashboard components
│   │       └── DashboardBuilder.tsx
│   └── lib/
│       ├── db/                   # Database connections
│       ├── auth/                 # Authentication
│       ├── reporting/            # Core engine
│       │   └── query-builder.ts  # Dynamic SQL builder
│       └── services/             # Business services
│           ├── export-service.ts
│           ├── email-service.ts
│           ├── scheduling-service.ts
│           └── websocket-service.ts
├── migrations/
│   ├── metadata/                 # SQLite migrations
│   └── business/                 # PostgreSQL migrations
├── data/
│   ├── metadata.db               # SQLite database (auto-created)
│   └── exports/                  # Generated export files
└── knexfile.ts                   # Database configuration
```

## 🔒 Security Features

### Application-Level Row-Level Security
```typescript
// Automatic injection based on user context
if (user.role === 'sales_rep') {
  query.where('region_id', user.regionId);
}
```

### SQL Injection Prevention
- Column name whitelisting
- Parameterized queries via Knex.js
- Operator validation

### Authentication
- Iron-session for secure cookies
- JWT for WebSocket authentication
- Bcrypt password hashing (12 rounds)

## 📊 Database Schema

### Metadata Database (SQLite)
- `users` - User accounts
- `roles` - Role definitions
- `permissions` - Permission registry
- `dashboard_layouts` - Dashboard configurations
- `report_definitions` - Report metadata
- `report_widgets` - Dashboard widgets
- `saved_views` - User preferences
- `scheduled_reports` - Cron schedules
- `export_history` - Export logs
- `email_delivery_log` - Email tracking

### Business Database (PostgreSQL)
- `sales_transactions` - Sample sales data
- `financial_metrics` - Financial reports
- `customer_engagement` - Customer interactions
- *Custom tables as needed*

## 🔄 Real-Time Architecture

### WebSocket Events
- `subscribe:report` - Subscribe to report updates
- `unsubscribe:report` - Unsubscribe from updates
- `request:refresh` - Manual data refresh
- `dashboard:join` - Join collaborative dashboard
- `dashboard:layout-update` - Share layout changes
- `report:data-update` - Receive data updates

### Monitoring Pattern
```typescript
// Automatic change detection every 5 seconds
// Broadcasts to subscribed clients
// Unsubscribed reports stop monitoring automatically
```

## 📧 Email Configuration

### SMTP Setup
Supports any SMTP provider (Gmail, SendGrid, AWS SES, etc.)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Email Templates
Professional HTML templates with:
- Branded header
- Formatted content
- Attachment indicators
- Responsive design

## 📅 Scheduled Reports

### Cron Expression Examples
```
0 9 * * 1       # Every Monday at 9 AM
0 0 1 * *       # First day of month at midnight
0 */4 * * *     # Every 4 hours
0 8-17 * * 1-5  # 8 AM to 5 PM, Monday to Friday
```

### Scheduler Features
- Timezone support
- Automatic retry logic
- Email delivery tracking
- Export history logging
- Manual trigger capability

## 🎨 Dashboard Builder

### Features
- Drag-and-drop widget placement
- Resize widgets
- Multiple widget types (Table, Chart, Metric)
- Real-time collaboration
- Layout persistence
- User-specific dashboards

### Widget Configuration
```typescript
{
  type: 'chart',
  reportId: 'sales-report-id',
  config: {
    chartType: 'bar',
    xAxisField: 'month',
    yAxisField: 'revenue',
    filters: [{ id: 'region', value: 'US', operator: '=' }]
  }
}
```

## 🔧 API Endpoints

### Reports
- `GET /api/reports/[reportId]/data` - Fetch report data
- `POST /api/reports/[reportId]/export` - Generate export
- `GET /api/reports/[reportId]/export?exportId=...` - Download export

### Dashboards
- `GET /api/dashboards/[dashboardId]` - Get dashboard
- `PUT /api/dashboards/[dashboardId]` - Update dashboard
- `POST /api/dashboards/[dashboardId]/widgets` - Add widget

### Scheduling
- `POST /api/schedules` - Create schedule
- `PUT /api/schedules/[scheduleId]` - Update schedule
- `POST /api/schedules/[scheduleId]/trigger` - Manual trigger

## 🚦 Performance Optimizations

- **Server-Side Operations**: Pagination, sorting, filtering on database
- **Query Optimization**: Indexed columns, efficient joins
- **Caching**: TanStack Query automatic caching
- **Lazy Loading**: Components and data loaded on demand
- **Aggregation Caching**: Computed metrics cached per query

## 📈 Monitoring & Logging

### Export History
Track all exports with:
- User ID
- Report definition
- Export format
- File size and row count
- Success/failure status
- Error messages

### Email Delivery Log
Monitor email delivery:
- Recipient tracking
- Delivery status
- Timestamp logging
- Error tracking

## 🤝 Contributing

This is a production-ready enterprise system. For customization:
1. Add new report definitions in metadata database
2. Create custom business data tables in PostgreSQL
3. Extend query builder for special cases
4. Add new chart types in ChartView component
5. Implement additional export formats in export-service

## 📄 License

Copyright © 2024 Enterprise Reporting System
All rights reserved.

## 🆘 Support

For issues or questions:
1. Check database migrations are up to date
2. Verify environment configuration
3. Review server logs for errors
4. Check WebSocket and Scheduler status

---

**Built with precision for enterprise-grade reporting needs.**
# enterprise_reporting_system
