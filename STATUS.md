# Enterprise Reporting System - Status Document

**Last Updated:** 2026-01-31
**Application Version:** 1.0.0
**Server Port:** 4050

---

## Application Overview

Enterprise Reporting and Dashboard System with:
- TanStack Query + Knex.js + shadcn/ui
- Next.js 14.2.11
- SQLite databases (better-sqlite3)
- Authentication with NextAuth
- SQL Editor with Monaco Editor
- Report Builder with Filters
- Dashboard Builder
- Chart Builder
- Export functionality (CSV, Excel, PDF)

---

## ✅ Working Features

### 1. Authentication System
- **Location:** `src/lib/auth/config.ts`, `src/app/(auth)/login/page.tsx`
- **Default Credentials:**
  - Email: `admin@admin.com` | Password: `admin`
  - Email: `analyst@example.com` | Password: `analyst123`
- **Features:**
  - JWT-based sessions (30-day expiry)
  - Role-based access control (RBAC)
  - User roles: Admin, Analyst, Viewer
  - Permission checks on API routes

### 2. SQL Editor
- **Location:** `src/app/(dashboard)/sql-editor/page.tsx`
- **Features:**
  - Monaco Editor with SQL syntax highlighting
  - Multiple data source support
  - Query execution with results table
  - Schema browser (table and column introspection)
  - Keyboard shortcuts: `Cmd+Enter` (Execute), `Shift+Alt+F` (Format)
  - **Mouse paste support** (via custom context menu)
- **Known Issue:** Use keyboard shortcuts (Cmd+V) for paste; mouse paste via context menu also works

### 3. Report System
- **Locations:**
  - List: `src/app/(dashboard)/reports/page.tsx`
  - Editor: `src/app/(dashboard)/reports/editor/[id]/page.tsx`
  - Viewer: `src/app/(dashboard)/reports/viewer/[id]/page.tsx`
- **Features:**
  - Create/Edit/Delete reports
  - Link reports to saved queries
  - Column configuration (show/hide, custom headers)
  - **Filter builder** (AND/OR logic, multiple operators)
  - Pagination
  - Virtual scrolling support

### 4. Export Functionality
- **Location:** `src/app/api/reports/[id]/export/route.ts`
- **Formats:**
  - **CSV:** Standard CSV format with proper escaping
  - **Excel:** Proper `.xlsx` format using ExcelJS with:
    - Styled headers (bold, gray background)
    - Cell borders
    - Auto-fitted column widths
  - **PDF:** Landscape PDF with:
    - Title and timestamp
    - Paginated tables
    - Headers on each page
    - Row count footer
- **Configuration:** Export formats stored in `report_definitions.export_formats`
- **Format keys:** `csv`, `xlsx`, `pdf` (all boolean true/false)

### 5. Dashboard System
- **Location:** `src/app/(dashboard)/dashboards/[id]/page.tsx`
- **Features:**
  - Create/Edit/Delete dashboards
  - Widget-based layout (drag-and-drop with react-grid-layout)
  - Public/Private visibility
  - Multiple widget types: Charts, Tables, Metrics

### 6. Chart System
- **Location:** `src/app/(dashboard)/charts/page.tsx`
- **Features:**
  - Create/Edit/Delete charts
  - Multiple chart types (Bar, Line, Pie, Area)
  - Data visualization from queries

### 7. Job Queue (Background Jobs)
- **Locations:**
  - Queue: `src/lib/jobs/queue.ts`
  - Workers: `src/lib/jobs/workers/`
  - Runner: `src/lib/jobs/worker-runner.ts`
- **Features:**
  - BullMQ for job queue
  - Email batch workers
  - Job execution tracking
  - Redis for queue storage

### 8. Database Schema
- **Migrations:** `src/lib/db/migrations/`
- **Seeds:** `src/lib/db/seeds/001_initial_data.ts`
- **Tables:**
  - `users` - User accounts
  - `roles` - Role definitions
  - `user_roles` - User-role associations
  - `data_sources` - Database connections
  - `saved_queries` - SQL query templates
  - `report_definitions` - Report configurations
  - `chart_definitions` - Chart configurations
  - `dashboard_layouts` - Dashboard layouts
  - `dashboard_widgets` - Widget definitions
  - `job_definitions` - Job definitions
  - `job_executions` - Job execution logs
  - `audit_log` - Audit trail
  - `email_templates` - Email templates
  - `resource_permissions` - Resource-level permissions

---

## 🔧 Critical Fixes Applied

### Fix #1: SQL Clause Ordering in Filters
**Problem:** WHERE clause was being appended after ORDER BY, causing syntax errors
**Files Modified:**
- `src/app/api/reports/[id]/data/route.ts`
- `src/app/api/reports/[id]/export/route.ts`

**Solution:** Updated `buildSQLWithFilters()` to properly position WHERE clause:
```typescript
// Correct SQL order: SELECT -> FROM -> WHERE -> GROUP BY -> HAVING -> ORDER BY
let finalSQL = baseQuery;
finalSQL += ` WHERE ${whereSQL}`;

if (groupByMatch) {
  finalSQL += ` ${groupByMatch[0]}`;
}

if (havingMatch) {
  finalSQL += ` ${havingMatch[0]}`;
}

if (orderByMatch) {
  finalSQL += ` ${orderByMatch[0]}`;
}
```

### Fix #2: Sakila Database Setup
**Problem:** Missing tables (regions, orders) and customer columns
**Solution:** Created migration script to add:
- `regions` table (10 regions)
- `orders` table (2,407 orders linked to customers and regions)
- `customer` table columns: `region_id`, `is_active`, `total_orders`, `total_invoice_value`, `total_cash_reserves`

**Files Created:**
- Migration scripts in project root (run once, then deleted)

### Fix #3: Data Source Encryption
**Problem:** Connection configs must be encrypted for connection manager
**Solution:** Updated Sakila Demo DB data source with encrypted connection config
**Script:** Used encryption utility from `src/lib/security/encryption.ts`

### Fix #4: Monaco Editor Mouse Paste
**Problem:** Paste via mouse (Edit menu, context menu) not working
**File Modified:** `src/components/sql-editor/monaco-editor-wrapper.tsx`

**Solution:** Added:
- Custom context menu on right-click
- Global paste event handler using Clipboard API
- Monaco's `executeEdits()` for text insertion

### Fix #5: Export Format Keys
**Problem:** Frontend sends `xlsx` but database had `excel` key
**Solution:** Updated `report_definitions.export_formats` to use `xlsx` key
**Format:** `{"csv":true,"xlsx":true,"pdf":true}`

---

## 🗄️ Database Setup

### Main Application Database
**Path:** `data/config.sqlite`
**Purpose:** Stores application configuration, users, reports, dashboards, etc.

### Sakila Demo Database
**Path:** `data/uploads/sakila.db`
**Purpose:** Sample data for testing and demos

**Tables in Sakila:**
- Original: actor, address, category, city, country, customer, film, film_actor, film_category, film_text, inventory, language, payment, rental, staff, store
- **Added:** regions, orders

**Customer Table Columns Added:**
```sql
ALTER TABLE customer ADD COLUMN region_id INTEGER;
ALTER TABLE customer ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE customer ADD COLUMN total_orders INTEGER DEFAULT 0;
ALTER TABLE customer ADD COLUMN total_invoice_value DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE customer ADD COLUMN total_cash_reserves DECIMAL(10, 2) DEFAULT 0.00;
```

**Data Source Configuration:**
```
ID: sakila-demo-db
Name: Sakila Demo DB
Client Type: sqlite3
Connection Config (encrypted): {"filename":"/path/to/data/uploads/sakila.db"}
```

**Sample Query that Works:**
```sql
SELECT
    r.id AS region_id,
    r.name AS region_name,
    COUNT(DISTINCT c.customer_id) AS customer_count,
    SUM(c.total_orders) AS total_orders_in_region,
    SUM(c.total_invoice_value) AS total_invoice_value_in_region,
    ROUND(AVG(c.total_invoice_value), 2) AS avg_customer_value,
    SUM(c.total_cash_reserves) AS total_cash_reserves_in_region,
    COUNT(DISTINCT o.id) AS total_orders_placed,
    SUM(o.total_amount) AS actual_order_value
FROM regions r
LEFT JOIN customer c ON r.id = c.region_id AND c.is_active = 1
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY r.id, r.name
ORDER BY total_invoice_value_in_region DESC;
```

---

## 🚀 Start/Stop Commands

### Start Development Server
```bash
npm run dev
# Runs on port 4050
```

### Start Job Worker
```bash
npm run jobs:worker
```

### Database Migrations
```bash
npm run db:migrate          # Run migrations
npm run db:migrate:make     # Create new migration
npm run db:rollback         # Rollback last migration
```

### Database Seeding
```bash
npm run db:seed            # Run seed data
npm run db:sample          # Load sample data
```

### Testing
```bash
npm run test:e2e           # Run E2E tests
npm run test:e2e:ui        # Run E2E tests with UI
npm run test:e2e:headed    # Run E2E tests in headed mode
```

---

## 📁 Key File Locations

### Configuration
- `src/lib/db/knexfile.ts` - Database configuration
- `src/lib/auth/config.ts` - NextAuth configuration
- `src/lib/db/config.ts` - Database connection factory
- `src/lib/db/connection-manager.ts` - Connection pool manager

### Components
- `src/components/sql-editor/monaco-editor-wrapper.tsx` - Monaco SQL editor
- `src/components/reporting/data-table.tsx` - Results table
- `src/components/dashboard/dashboard-grid.tsx` - Dashboard layout
- `src/components/charts/chart-renderer.tsx` - Chart display

### API Routes
- `src/app/api/sql/execute/route.ts` - SQL execution
- `src/app/api/sql/schema/[dataSourceId]/route.ts` - Schema introspection
- `src/app/api/reports/[id]/data/route.ts` - Report data with filters
- `src/app/api/reports/[id]/export/route.ts` - Report exports (CSV/Excel/PDF)
- `src/app/api/data-sources/route.ts` - Data source management
- `src/app/api/queries/route.ts` - Saved queries

---

## ⚠️ Known Issues & Workarounds

### 1. Monaco Editor Paste
**Issue:** Mouse paste via browser Edit menu doesn't work natively
**Workaround:** Use `Cmd+V` keyboard shortcut or right-click context menu
**Status:** Fixed with custom context menu implementation

### 2. Filter Aliases
**Issue:** Filters use column aliases (e.g., `region_name`) but WHERE clause can't reference aliases
**Workaround:** Use actual column names in filters (e.g., `name` or `r.name`)
**Status:** Works but requires user to know actual column names

### 3. Large Query Results
**Issue:** Export limited to 1000 rows (EXPORT_PAGE_SIZE env var)
**Workaround:** Adjust `EXPORT_PAGE_SIZE` or implement pagination in exports
**Status:** By design for performance

---

## 🔐 Security Notes

### Encryption
- All data source connection configs are encrypted using AES-256-GCM
- Encryption key from `ENCRYPTION_KEY` env var or default dev key
- **Never commit encrypted configs to public repos**

### SQL Injection Prevention
- Parameterized queries via Knex
- Input validation in `src/lib/sql/validator.ts`
- Escape functions in export routes for filter-based queries

### Audit Logging
- All query executions logged to `audit_log` table
- Includes user ID, action, resource type, and execution time

---

## 📊 Performance Notes

### Connection Pooling
- SQLite: Single connection with better-sqlite3
- Other DBs: Pool of 10 connections (min: 0, max: 10)
- Connections cached in `src/lib/db/connection-manager.ts`

### Virtual Scrolling
- Query results use `@tanstack/react-virtual` for large datasets
- Renders only visible rows
- Improves performance with 1000+ row results

---

## 🔄 Recent Changes Summary

### 2026-01-31
1. Fixed SQL clause ordering in report data and export routes
2. Added regions and orders tables to Sakila database
3. Added customer statistics columns (total_orders, total_invoice_value, total_cash_reserves)
4. Created Sakila Demo DB data source with encrypted connection config
5. Fixed Excel export to use proper .xlsx format via ExcelJS
6. Fixed export format keys (xlsx instead of excel)
7. Implemented mouse paste support for Monaco Editor

---

## 🧪 Testing Checklist

### Manual Testing
- [x] User login (admin and analyst accounts)
- [x] SQL Editor - query execution
- [x] SQL Editor - keyboard paste (Cmd+V)
- [x] SQL Editor - mouse paste (context menu)
- [x] Report creation with filters
- [x] Report viewing with pagination
- [x] Export to CSV
- [x] Export to Excel (proper .xlsx format)
- [x] Export to PDF
- [x] Dashboard creation and widget management
- [x] Chart creation and rendering

### Test Queries
See saved queries in Sakila Demo DB data source for sample working queries.

---

## 📝 Environment Variables

```
DATABASE_PATH=./data/config.sqlite
ENCRYPTION_KEY=<your-encryption-key>
MAX_PAGE_SIZE=1000
EXPORT_PAGE_SIZE=1000
NODE_ENV=development
```

---

## 🔍 Debugging Tips

### Check Database Schema
```bash
sqlite3 data/config.sqlite ".schema"
sqlite3 data/uploads/sakila.db ".schema"
```

### Check Data Sources
```bash
sqlite3 data/config.sqlite "SELECT id, name, client_type FROM data_sources WHERE is_active = 1;"
```

### Check Report Configuration
```bash
sqlite3 data/config.sqlite "SELECT id, name, saved_query_id, export_formats FROM report_definitions;"
```

### Monitor Server Logs
```bash
# Dev server logs (if running in background)
tail -f /private/tmp/claude/-Users-pramodkoshy-projects-dynamic-test-enterprise-reporting-system/tasks/b2f0e04.output
```

---

## 🚨 Important: Do Not Break These

### 1. SQL Clause Order
**Always maintain:** SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY
**Function:** `buildSQLWithFilters()` in report data and export routes

### 2. Export Format Keys
**Use:** `csv`, `xlsx`, `pdf` (not `excel`)
**Validation:** `exportFormats[format as keyof typeof exportFormats]`

### 3. Data Source Encryption
**Connection configs must be encrypted** before storing in database
**Use:** `encrypt()` from `src/lib/security/encryption.ts`

### 4. Customer Table Schema
**Required columns:** `region_id`, `is_active`, `total_orders`, `total_invoice_value`, `total_cash_reserves`
**Database:** Sakila (`data/uploads/sakila.db`)

### 5. Monaco Editor Paste
**Two paste mechanisms:**
- Keyboard: Native Monaco (Cmd+V works automatically)
- Mouse: Custom context menu + Clipboard API (for Edit menu paste)

---

## 📚 Documentation Files

- `CHART_BUILDER_DOCUMENTATION.md` - Chart builder guide
- `TEST_DOCUMENTATION.md` - Testing documentation
- `E2E Test Files:` `e2e/*.spec.ts`
- Migration files: `src/lib/db/migrations/*.ts`

---

## 🎯 Quick Reference

### Default Credentials
- Admin: `admin@admin.com` / `admin`
- Analyst: `analyst@example.com` / `analyst123`

### URLs
- App: http://localhost:4050
- Login: http://localhost:4050/login
- SQL Editor: http://localhost:4050/sql-editor
- Reports: http://localhost:4050/reports
- Dashboards: http://localhost:4050/dashboards
- Charts: http://localhost:4050/charts

### Database Paths
- Main: `data/config.sqlite`
- Sakila: `data/uploads/sakila.db`

### Important IDs
- Sakila Demo DB Data Source ID: `sakila-demo-db`
- Sample Report ID: `35eba06a-69eb-4538-ad6e-99458e025c76`
- Sample Query ID: `e59738cb-286c-427c-856b-b7ef07e87cd0`

---

**End of Status Document**
