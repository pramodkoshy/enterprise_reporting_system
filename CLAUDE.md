# CLAUDE.md - Enterprise Reporting System

## Project Overview

Enterprise Reporting and Dashboard System built with **Next.js 14 (App Router)**, **Bun runtime**, **SQLite** (via better-sqlite3/Knex.js), and **shadcn/ui**. Provides data visualization, SQL querying, role-based access control, job scheduling, and multi-format export capabilities.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun >= 1.3.0 |
| Framework | Next.js 14.2.11 (App Router, standalone output) |
| Language | TypeScript (strict mode, ES2022 target) |
| UI Components | shadcn/ui (Radix UI + Tailwind CSS 3) |
| State/Data | TanStack Query, TanStack Table, TanStack Form |
| Database | SQLite via better-sqlite3 + Knex.js query builder |
| Auth | NextAuth v5 (beta) with credentials provider |
| Charts | Recharts |
| Job Queue | BullMQ + Redis (ioredis) |
| AI/NL Query | OpenAI (via @ai-sdk/openai), CopilotKit |
| Testing | Playwright (E2E only) |
| Styling | Tailwind CSS with CSS variables (HSL color system) |
| Deployment | Docker (Bun Alpine), Nginx reverse proxy, Hostinger VPS |

## Quick Reference Commands

```bash
# Development
bun run dev              # Start dev server on port 4050 (with --watch)
bun run build            # Production build
bun run start            # Start production server on port 4050

# Quality checks
bun run lint             # ESLint (next/core-web-vitals + next/typescript)
bun run lint:fix         # ESLint with auto-fix
bun run typecheck        # TypeScript type checking (tsc --noEmit)
bun run format           # Prettier formatting
bun run format:check     # Check formatting without writing
bun run precommit        # lint + typecheck + format:check
bun run build:check      # lint + typecheck + build

# Database
bun run db:migrate       # Run pending migrations
bun run db:migrate:make  # Create new migration file
bun run db:seed          # Run seed files
bun run db:rollback      # Rollback last migration batch
bun run db:sample        # Seed sample data (src/lib/db/sample-data/seed.ts)

# Testing (Playwright E2E)
bun run test:e2e         # Run all E2E tests
bun run test:e2e:headed  # Run with browser visible
bun run test:e2e:debug   # Run in debug mode
bun run test:e2e:ui      # Interactive Playwright UI
bun run test:e2e:all     # Setup data + run E2E tests
bun run test:ci          # Full CI pipeline: lint + typecheck + setup + e2e

# Individual test suites
bun run test:app         # e2e/app.spec.ts
bun run test:dashboard   # e2e/dashboards.spec.ts
bun run test:sql         # e2e/sql-editor.spec.ts
bun run test:reports     # e2e/reports.spec.ts
bun run test:charts      # e2e/charts.spec.ts
bun run test:granular-permissions  # e2e/granular-permissions.spec.ts

# Background services
bun run jobs:worker      # Start BullMQ job worker

# Docker
./rebuild.sh             # Rebuild Docker containers
./rebuildDocker.sh       # Full Docker rebuild script
./start.sh               # Start services
./stop.sh                # Stop services
```

## Project Structure

```
enterprise-reporting-system/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (Inter font, ErrorBoundary, Providers)
│   │   ├── providers.tsx             # Client providers (QueryClient, Theme, Session)
│   │   ├── (auth)/                   # Auth route group
│   │   │   └── login/                # Login page
│   │   ├── (dashboard)/              # Main app route group (authenticated)
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   │   ├── charts/               # Chart editor & viewer (editor/[id], viewer/[id])
│   │   │   ├── dashboards/           # Dashboard management ([id] detail view)
│   │   │   ├── data-sources/         # Data source config ([id]/permissions)
│   │   │   ├── reports/              # Report editor & viewer
│   │   │   ├── sql-editor/           # SQL editor page
│   │   │   ├── jobs/                 # Job queue monitoring
│   │   │   ├── metadata/             # Metadata entity management (entities/[id])
│   │   │   ├── nl-query/             # Natural language query interface
│   │   │   ├── filters/              # Filter management
│   │   │   ├── queries/              # Saved queries
│   │   │   ├── settings/             # App settings (email config)
│   │   │   ├── email-templates/      # Email template management
│   │   │   └── bull-board/           # BullMQ dashboard
│   │   ├── admin/                    # Admin panel
│   │   │   ├── users/                # User management
│   │   │   ├── roles/                # Role management
│   │   │   └── permissions/          # Permission management
│   │   └── api/                      # API routes (see API section below)
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives (button, dialog, select, etc.)
│   │   ├── charts/                   # Chart-specific components
│   │   ├── dashboard/                # Dashboard builder components
│   │   ├── reporting/                # Report components (DataTable, etc.)
│   │   ├── sql-editor/               # SQL editor components
│   │   ├── metadata/                 # Metadata entity components
│   │   ├── nl-query/                 # NL query components
│   │   ├── layout/                   # Layout components (sidebar, navigation)
│   │   ├── email/                    # Email template components
│   │   ├── jobs/                     # Job monitoring components
│   │   └── errors/                   # Error boundary components
│   ├── lib/
│   │   ├── db/                       # Database layer
│   │   │   ├── config.ts             # Knex connection (getDb(), getConfigDB())
│   │   │   ├── knexfile.ts           # Knex config (dev: better-sqlite3, prod: better-sqlite3)
│   │   │   ├── connection-manager.ts # Connection management
│   │   │   ├── bun-sqlite-wrapper.ts # Bun SQLite wrapper
│   │   │   ├── migrations/           # Knex migrations (timestamped .ts files)
│   │   │   ├── seeds/                # Seed data (001_initial_data.ts)
│   │   │   └── sample-data/          # Sample schema and seed scripts
│   │   ├── auth/                     # Authentication (NextAuth config, RBAC)
│   │   │   ├── config.ts             # NextAuth configuration
│   │   │   └── rbac.ts               # Role-based access control
│   │   ├── permissions/              # Permission system
│   │   │   ├── permissions.ts        # Permission definitions and checks
│   │   │   └── ds-rbac.ts            # Data source RBAC
│   │   ├── security/                 # Security utilities
│   │   │   ├── encryption.ts         # AES-256-GCM encryption for credentials
│   │   │   └── audit.ts              # Audit logging
│   │   ├── sql/                      # SQL utilities
│   │   │   ├── validator.ts          # SQL query validation
│   │   │   ├── schema-introspection.ts # Database schema discovery
│   │   │   └── __tests__/            # SQL validator tests
│   │   ├── reports/                  # Report engine
│   │   │   └── filter-to-sql.ts      # Filter-to-SQL conversion
│   │   ├── jobs/                     # Job processing
│   │   │   ├── queue.ts              # BullMQ queue config
│   │   │   ├── worker-runner.ts      # Worker process entry point
│   │   │   └── workers/              # Job workers (export, report, email-batch)
│   │   ├── queue/                    # Queue management
│   │   │   ├── config.ts             # Queue configuration
│   │   │   ├── queue-manager.ts      # Queue manager
│   │   │   ├── bull-board.ts         # Bull Board UI integration
│   │   │   ├── index.ts              # Queue exports
│   │   │   └── types.ts              # Queue type definitions
│   │   ├── email/                    # Email service
│   │   │   └── email-service.ts      # Nodemailer SMTP integration
│   │   ├── metadata/                 # Metadata services
│   │   │   ├── entity-service.ts     # Entity CRUD
│   │   │   ├── field-service.ts      # Field management
│   │   │   ├── data-service.ts       # Data operations
│   │   │   ├── permissions.ts        # Entity permissions
│   │   │   └── sync-service.ts       # Sync operations
│   │   ├── config/                   # App configuration
│   │   │   └── pagination.ts         # Server-side pagination config
│   │   ├── api/                      # API client utilities
│   │   │   └── nl-query-client.ts    # NL query API client
│   │   ├── mastra/                   # Mastra AI agent integration
│   │   ├── hooks/                    # Server-side hooks
│   │   ├── errors/                   # Error handling utilities
│   │   ├── utils.ts                  # General utilities (cn(), etc.)
│   │   └── notifications.ts          # Notification system
│   ├── hooks/                        # React hooks
│   │   └── metadata/                 # Metadata-related hooks
│   ├── types/
│   │   ├── api.ts                    # API type definitions
│   │   └── database.ts               # Database type definitions
│   └── styles/
│       └── globals.css               # Global styles + Tailwind + CSS variables
├── e2e/                              # Playwright E2E tests
│   ├── *.spec.ts                     # Test files
│   ├── test-auth.ts                  # Auth helper for tests
│   ├── helpers/                      # Test helper utilities
│   │   ├── test-helpers.ts           # Main test helpers
│   │   └── test-helpers-improved.ts  # Enhanced helpers
│   └── fixtures/                     # Test fixtures
│       └── auth.fixture.ts           # Auth fixture
├── tests/                            # Additional tests
│   ├── setup-data.ts                 # Test data setup script
│   └── api/                          # API test utilities
├── scripts/                          # Utility scripts
│   ├── init-db.ts                    # Database initialization
│   ├── run-migrations.ts             # Migration runner
│   ├── create-admin.ts               # Admin user creation
│   ├── seed-sakila-analytics.ts      # Sakila demo data seeder
│   └── deploy-*.sh                   # Deployment scripts
├── database/                         # Database files (SQLite)
├── docs/                             # Project documentation
├── nginx/                            # Nginx config (reverse proxy)
├── .claude/                          # Claude Code configuration
│   ├── settings.json                 # Plugin settings
│   └── skills/                       # Claude skills documentation
├── playwright.config.ts              # Playwright configuration
├── next.config.js                    # Next.js configuration
├── tailwind.config.ts                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
├── package.json                      # Dependencies and scripts
├── docker-compose.yml                # Docker Compose (Nginx + Redis + App)
├── Dockerfile                        # Multi-stage Bun Alpine build
└── components.json                   # shadcn/ui configuration
```

## API Routes

All API routes live under `src/app/api/`:

| Route | Purpose |
|-------|---------|
| `api/auth/` | NextAuth authentication endpoints |
| `api/admin/` | Admin operations (users, roles, permissions, data-sources, audit-log, metadata) |
| `api/reports/` | Report data and management |
| `api/dashboards/` | Dashboard CRUD |
| `api/charts/` | Chart configuration |
| `api/data-sources/` | Data source management (CRUD, test, schema, entity permissions) |
| `api/sql/` | SQL execution, validation, saved queries, schema introspection |
| `api/jobs/` | Job queue management (create, status, results, download, retry, cleanup) |
| `api/filters/` | Filter management |
| `api/queries/` | Saved query management |
| `api/metadata/` | Metadata entity operations |
| `api/nl-query/` | Natural language to SQL |
| `api/email-templates/` | Email template CRUD |
| `api/notifications/` | Notification system |
| `api/settings/` | Application settings |
| `api/health/` | Health check endpoint |
| `api/copilotkit/` | CopilotKit integration |
| `api/seed/` | Database seeding |
| `api/setup/` | Initial setup |
| `api/test/` | Test utilities |

## Architecture & Conventions

### Path Aliases

Use `@/*` to import from `src/*`:
```typescript
import { getDb } from '@/lib/db/config';
import { Button } from '@/components/ui/button';
```

### Database Access

- **Always use Knex.js** for database queries - never raw SQL strings
- Get database instance via `getDb()` or `getConfigDB()` from `@/lib/db/config`
- SQLite is the sole database (config + business data in same DB)
- Foreign keys are enabled via PRAGMA
- All migrations are in `src/lib/db/migrations/` with timestamp prefixes
- Migration naming: `YYYYMMDDHHMMSS_description.ts`

### Authentication

- NextAuth v5 with credentials provider
- Session managed via `authjs.session-token` cookie
- RBAC defined in `src/lib/auth/rbac.ts`
- Granular permissions in `src/lib/permissions/`
- Default admin credentials for dev: `admin@admin.com` / `admin`

### Component Patterns

- **UI primitives**: shadcn/ui in `src/components/ui/` - do not modify directly, add via `npx shadcn@latest add`
- **Feature components**: Organized by domain (charts, dashboard, reporting, sql-editor, etc.)
- **Client components**: Mark with `'use client'` directive at top of file
- **Server components**: Default in App Router - used for data fetching
- **Styling**: Tailwind utility classes + `cn()` helper from `@/lib/utils` for conditional classes
- **Forms**: react-hook-form + zod validation + @hookform/resolvers
- **Data tables**: TanStack Table with server-side pagination (critical: always use LIMIT/OFFSET)

### Server-Side Pagination (Critical Rule)

**All data queries MUST use server-side pagination.** Never fetch all data and paginate client-side. Key config values:
- `DEFAULT_PAGE_SIZE=50`
- `MAX_PAGE_SIZE=1000`
- `DATA_TABLE_PAGE_SIZE=100`
- Pagination config in `src/lib/config/pagination.ts`

### Error Handling

- `ErrorBoundary` component wraps the app (`src/components/errors/error-boundary`)
- API routes should return proper HTTP status codes with JSON error bodies
- Encryption errors should include debug context

### Security Conventions

- Credentials encrypted with AES-256-GCM (`src/lib/security/encryption.ts`)
- SQL queries validated before execution (`src/lib/sql/validator.ts`)
- Audit logging for sensitive operations (`src/lib/security/audit.ts`)
- Data source RBAC for entity-level access control (`src/lib/permissions/ds-rbac.ts`)

### TypeScript

- Strict mode enabled
- `@typescript-eslint/no-unused-vars`: error (prefix unused args with `_`)
- `@typescript-eslint/no-explicit-any`: warn
- Types defined in `src/types/api.ts` and `src/types/database.ts`
- Path alias `@/*` maps to `./src/*`

### ESLint

Config extends `next/core-web-vitals` and `next/typescript`. Run with:
```bash
bun run lint       # Check
bun run lint:fix   # Auto-fix
```

### Formatting

Prettier configured for `src/**/*.{ts,tsx,js,jsx,json,css,md}`:
```bash
bun run format        # Write
bun run format:check  # Check only
```

## Testing

### E2E Tests (Playwright)

- Test directory: `e2e/`
- Config: `playwright.config.ts`
- Browser: Chromium only
- Workers: 1 (serial execution to prevent session interference)
- Tests run against a live server (default base URL: `http://148.135.137.110`, override with `BASE_URL` env var)
- Auth helper: `e2e/test-auth.ts` - caches auth cookies
- Test helpers: `e2e/helpers/test-helpers.ts`
- Fixtures: `e2e/fixtures/auth.fixture.ts`
- Screenshot on failure, trace on first retry

### Running Tests

```bash
# Setup test data first
bun run test:setup

# Then run tests
bun run test:e2e

# Or combined
bun run test:e2e:all
```

### Test Batches

Tests can be run in batches using `@batch1` through `@batch6` grep tags:
```bash
bun run test:phase1   # Tests tagged @batch1
bun run test:batches  # All batches sequentially
```

## Database Migrations

Create and run migrations using Knex CLI through Bun:

```bash
# Create a new migration
bun run db:migrate:make -- my_migration_name

# Run pending migrations
bun run db:migrate

# Rollback last batch
bun run db:rollback
```

Migrations live in `src/lib/db/migrations/` and follow the pattern:
`YYYYMMDDHHMMSS_description.ts`

## Docker & Deployment

### Docker Build

Multi-stage build using `oven/bun:1.3-alpine`:
1. **Builder stage**: Install deps, compile migrations/seeds, init DB, build Next.js
2. **Runner stage**: Copy standalone output + node_modules + migrations + DB

### Services (docker-compose.yml)

- **nginx**: Reverse proxy with SSL (Let's Encrypt via certbot)
- **redis**: BullMQ job queue backend
- **app**: Main application (port 3000 internal)

### Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_PATH` | SQLite database file path |
| `AUTH_SECRET` | NextAuth secret (min 32 chars) |
| `REDIS_URL` | Redis connection for BullMQ |
| `ENCRYPTION_KEY` | AES-256 key for credential encryption |
| `OPENAI_API_KEY` | OpenAI API key for NL query feature |
| `DEFAULT_PAGE_SIZE` | Default pagination size (50) |
| `MAX_PAGE_SIZE` | Max allowed page size (1000) |

## Common Development Patterns

### Adding a New Page

1. Create directory under `src/app/(dashboard)/your-feature/`
2. Add `page.tsx` (server component by default)
3. For client interactivity, create components in `src/components/your-feature/` with `'use client'`

### Adding a New API Route

1. Create `src/app/api/your-route/route.ts`
2. Export named handlers: `GET`, `POST`, `PUT`, `DELETE`
3. Use `getDb()` for database access
4. Validate input with Zod schemas
5. Check permissions via RBAC utilities

### Adding a UI Component

For shadcn/ui primitives:
```bash
npx shadcn@latest add component-name
```

For custom components, place in the appropriate `src/components/` subdirectory.

### Adding a Database Migration

```bash
bun run db:migrate:make -- descriptive_name
# Edit the new file in src/lib/db/migrations/
bun run db:migrate
```

## Database Schema

Key tables created by migrations in `src/lib/db/migrations/`:

| Table | Purpose |
|-------|---------|
| `users` | User accounts with auth credentials and profile |
| `roles` | Role definitions with JSON-encoded permissions |
| `user_roles` | Many-to-many join between users and roles |
| `data_sources` | External database connections (encrypted config) |
| `saved_queries` | SQL queries linked to data sources |
| `report_definitions` | Report config with column/filter/sort/export settings |
| `chart_definitions` | Chart config with type, data mapping, and styling |
| `dashboard_layouts` | Dashboard layout configs (React Grid Layout format) |
| `dashboard_widgets` | Individual widgets placed on dashboards |
| `job_definitions` | Scheduled job definitions (cron-based) |
| `job_executions` | Job execution history with status and results |
| `resource_permissions` | Fine-grained permissions for all resources |
| `audit_log` | Audit trail of user actions |
| `filter_definitions` | Reusable filters with query templates |
| `report_filters` | Join table linking filters to reports |
| `chart_filters` | Join table linking filters to charts |
| `ds_roles` | Data source-specific role definitions |
| `ds_user_roles` | Data source role assignments |
| `ds_entity_permissions` | Entity-level permissions (table/view access control) |
| `ds_schema_cache` | Cached schema introspection results |
| `metadata_entity_header` | Metadata registry for discovered tables/views |
| `metadata_entity_field` | Field-level metadata for entity columns |
| `email_templates` | Email template definitions |
| `notification_config` | Notification configuration |
| `export_history` | Export operation logs |
| `email_delivery_log` | Email delivery tracking |

## API Response Format

All API routes follow a consistent response pattern:

```typescript
// Success response
{
  success: true,
  data: {
    items?: T[],             // For list endpoints
    meta?: {                 // Pagination metadata
      total: number,
      page: number,
      pageSize: number,
      totalPages: number
    }
  }
}

// Error response
{
  success: false,
  error: {
    code: string,            // UNAUTHORIZED | FORBIDDEN | INVALID_INPUT | SERVER_ERROR
    message: string
  }
}
```

**HTTP status codes**: 200 (success), 201 (created), 400 (bad request), 401 (unauthorized), 403 (forbidden), 500 (server error).

## Authentication & Authorization in API Routes

All API routes check authentication via NextAuth:

```typescript
const session = await auth();
if (!session?.user) {
  return NextResponse.json(
    { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
    { status: 401 }
  );
}
```

The session object contains: `user.id`, `user.email`, `user.roles[]`, `user.permissions[]`.

**Authorization layers:**
- **RBAC**: `hasPermission(context, 'resource:action')` from `@/lib/auth/rbac`
- **Resource permissions**: `filterAccessibleResources(userId, items, resourceType, action)` from `@/lib/permissions/permissions`
- **Data source RBAC**: Entity-level permissions (select/insert/update/delete) with column restrictions and row filters via `@/lib/permissions/ds-rbac`
- **Audit logging**: `logAudit({ userId, action, resourceType, resourceId, details })` from `@/lib/security/audit`

## Pagination Utilities

Helper functions in `src/lib/config/pagination.ts`:

```typescript
import { paginationConfig, validatePageSize, calculateOffset, buildSqlPagination, createPaginationMeta } from '@/lib/config/pagination';

// Config values
paginationConfig.defaultPageSize    // 50
paginationConfig.maxPageSize        // 1000
paginationConfig.dataTablePageSize  // 500
paginationConfig.exportPageSize     // 1000

// Helpers
validatePageSize(size)                          // Clamps to [1, maxPageSize]
calculateOffset(page, pageSize)                 // (page - 1) * pageSize
buildSqlPagination(page?, pageSize?)            // Returns { limit, offset }
createPaginationMeta(page, pageSize, totalRows) // Returns PaginationMeta object
```

SQL Editor has separate config: `sqlEditorConfig.serverPageSize` (500), `sqlEditorConfig.maxClientRows` (5000).

## Key Type Definitions

Main types in `src/types/database.ts`:

- **Core**: `User`, `Role`, `UserRole`, `DataSource`, `SavedQuery`
- **Reporting**: `ReportDefinition`, `ColumnDefinition`, `ChartDefinition`, `ChartConfig`
- **Dashboards**: `DashboardLayout`, `DashboardWidget`, `WidgetConfig`
- **Jobs**: `JobDefinition`, `JobExecution`, `JobNotificationConfig`
- **Permissions**: `ResourcePermission`, `PermissionLevel` (view|edit|execute|admin)
- **Data Source RBAC**: `DsRole`, `DsUserRole`, `DsEntityPermission`
- **Formatting**: `FormatterDefinition`, `ConditionalFormat`, `CellRendererType`
- **Filters**: `FilterDefinition`, `FilterOperator`, `FilterFieldType`
- **Charts**: `ChartType` (bar|line|area|pie|scatter|composed), `AggregationType`
- **Metadata**: `MetadataEntityHeader`, `MetadataEntityField`
- **NL Query**: `NlQueryPipelineResult`, `NlAccessCheckResult`

API request/response types are in `src/types/api.ts`.

## Pre-commit Checklist

Before committing, run:
```bash
bun run precommit   # lint + typecheck + format:check
```

Or the full build check:
```bash
bun run build:check  # lint + typecheck + build
```
