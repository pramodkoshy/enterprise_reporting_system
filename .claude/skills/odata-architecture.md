# OData v4 Server Architecture Skills

## Overview

This skill provides comprehensive architectural guidelines for implementing OData v4 services using `jaystack/odata-v4-server` in the ERDwithAI project. This guide follows OData v4 standards and is designed for the Bun.js runtime.

## Table of Contents

1. [OData v4 Fundamentals](#odata-v4-fundamentals)
2. [Project Structure](#project-structure)
3. [Server Configuration](#server-configuration)
4. [Entity Data Model](#entity-data-model)
5. [Controllers and Actions](#controllers-and-actions)
6. [Query Options](#query-options)
7. [CRUD Operations](#crud-operations)
8. [Relationships and Navigation](#relationships-and-navigation)
11. [Security and Authorization](#security-and-authorization)
12. [Performance Optimization](#performance-optimization)
13. [Testing Strategies](#testing-strategies)
14. [Bun.js Runtime Specifics](#bunjs-runtime-specifics)

---

## OData v4 Fundamentals

### OData v4 Protocol Overview

OData (Open Data Protocol) v4 is a REST-based protocol for creating and consuming data APIs. Key concepts:

- **Entity Set**: Collection of entities (like a database table)
- **Entity Type**: Schema definition (like a database schema)
- **Complex Type**: Structured type without key (like an embedded object)
- **Navigation Property**: Relationship between entities
- **Action**: Custom operation with side effects
- **Function**: Operation without side effects (idempotent)

### OData Request/Response Flow

```
Client Request → OData Server → Query Processing → Data Access → Response
     ↓               ↓              ↓                ↓            ↓
  URL Format    Route Handler   $filter/$select   Repository   JSON/Atom
```

---

## Project Structure

### Standard OData Project Structure

```
packages/backend/
├── src/
│   ├── odata/
│   │   ├── server.ts                 # OData server configuration
│   │   ├── config/
│   │   │   ├── entities.config.ts    # Entity definitions
│   │   │   └── processor.config.ts   # Query processors
│   │   ├── controllers/
│   │   │   ├── project.controller.ts
│   │   │   ├── entity.controller.ts
│   │   │   └── relationship.controller.ts
│   │   ├── entities/
│   │   │   ├── project.entity.ts
│   │   │   ├── entity.entity.ts
│   │   │   └── relationship.entity.ts
│   │   ├── processors/
│   │   │   ├── query.processor.ts
│   │   │   ├── filter.processor.ts
│   │   │   └── expand.processor.ts
│   │   └── types/
│   │       └── odata.types.ts
│   └── modules/
│       └── odata/
│           ├── odata.module.ts
│           └── odata.controller.ts
```

---

## Server Configuration

### Basic OData Server Setup

```typescript
// src/odata/server.ts
import { ODataServer, ODataController, odata, ODataQuery } from 'odata-v4-server';
import { createConnection } from 'typeorm';
import { ProjectController } from './controllers/project.controller';
import { EntityController } from './controllers/entity.controller';

@ODataController
export class ProjectODataController {
  // Controller implementation
}

export class ERDwithAIODataServer extends ODataServer {
  constructor() {
    super();
    this.controller(ProjectController);
    this.controller(EntityController);
  }
}

// In main.ts
import { ERDwithAIODataServer } from './odata/server';

const odataServer = new ERDwithAIODataServer();
const port = process.env.ODATA_PORT || 3002;

odataServer.listen(port, () => {
  console.log(`OData server running on port ${port}`);
});
```

### NestJS Integration

```typescript
// src/modules/odata/odata.module.ts
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ODataController } from './odata.controller';
import { ProjectService } from '../project/project.service';
import { EntityService } from '../entity/entity.service';

@Module({
  controllers: [ODataController],
  providers: [ProjectService, EntityService],
  exports: [ProjectService, EntityService],
})
export class ODataModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // OData middleware configuration
  }
}

// src/modules/odata/odata.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ODataQuery, ODataResult } from 'odata-v4-server';

@Controller('odata')
export class ODataController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly entityService: EntityService,
  ) {}

  @Get('projects')
  async getProjects(@Query() query: ODataQuery): Promise<ODataResult<Project>> {
    const result = await this.projectService.findAll(query);
    return {
      value: result.data,
      '@odata.context': '$metadata#Projects',
    };
  }
}
```

---

## Entity Data Model

### Entity Type Definition

```typescript
// src/odata/entities/project.entity.ts
import { Entity, Edm, edm } from 'odata-v4-server';

@Entity
export class Project {
  @Edm.Key
  @Edm.Int32
  id: number;

  @Edm.String
  @Edm.Required
  @Edm.MaxLength(100)
  name: string;

  @Edm.String
  @Edm.MaxLength(500)
  @Edm.Nullable
  description: string;

  @Edm.EnumType
  type: ProjectType;

  @Edm.DateTimeOffset
  createdAt: Date;

  @Edm.DateTimeOffset
  updatedAt: Date;

  // Navigation properties
  @Edm.NavigationProperty
  entities: Entity[];

  @Edm.NavigationProperty
  relationships: Relationship[];
}

export enum ProjectType {
  Web = 'web',
  Mobile = 'mobile',
  Desktop = 'desktop',
}
```

### Complex Type Definition

```typescript
// src/odata/entities/metadata.entity.ts
import { ComplexType, Edm } from 'odata-v4-server';

@ComplexType
export class ProjectMetadata {
  @Edm.String
  version: string;

  @Edm.String
  schema: string;

  @Edm.Collection(Edm.String)
  tags: string[];

  @Edm.Int32
  entityCount: number;
}
```

### Entity Set Configuration

```typescript
// src/odata/config/entities.config.ts
import { EntitySet, Singleton, Edm } from 'odata-v4-server';
import { Project } from '../entities/project.entity';
import { Entity } from '../entities/entity.entity';

export class ERDwithAIEntities {
  @EntitySet
  projects: Project[];

  @EntitySet
  entities: Entity[];

  @Singleton
  metadata: ProjectMetadata;
}
```

---

## Controllers and Actions

### Standard CRUD Controller

```typescript
// src/odata/controllers/project.controller.ts
import { ODataController, odata, ODataQuery } from 'odata-v4-server';
import { ProjectService } from '../../modules/project/project.service';
import { Project } from '../entities/project.entity';

@ODataController
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  // GET /odata/Projects
  @odata.GET
  async findAll(@odata.query query: ODataQuery): Promise<Project[]> {
    return this.projectService.findAll(query);
  }

  // GET /odata/Projects(:id)
  @odata.GET
  async findOne(@odata.key id: number): Promise<Project> {
    return this.projectService.findOne(id);
  }

  // POST /odata/Projects
  @odata.POST
  async create(@odata.body project: Partial<Project>): Promise<Project> {
    return this.projectService.create(project);
  }

  // PATCH /odata/Projects(:id)
  @odata.PATCH
  async update(
    @odata.key id: number,
    @odata.body project: Partial<Project>
  ): Promise<Project> {
    return this.projectService.update(id, project);
  }

  // DELETE /odata/Projects(:id)
  @odata.DELETE
  async remove(@odata.key id: number): Promise<void> {
    return this.projectService.remove(id);
  }
}
```

### Custom Actions

```typescript
// src/odata/controllers/project.controller.ts
import { ODataController, odata, ODataAction, ODataFunction } from 'odata-v4-server';

@ODataController
export class ProjectController {
  // Action: POST /odata/Projects(:id)/Export
  @ODataAction
  async export(@odata.key id: number, @odata.body options: ExportOptions): Promise<string> {
    return this.projectService.export(id, options);
  }

  // Bound Action: POST /odata/Projects(:id)/Validate
  @ODataAction
  async validate(@odata.key id: number): Promise<ValidationResult> {
    return this.projectService.validate(id);
  }

  // Unbound Action: POST /odata/GenerateSchema
  @ODataAction
  async generateSchema(@odata.body request: SchemaRequest): Promise<SchemaResponse> {
    return this.schemaService.generate(request);
  }
}
```

### Custom Functions

```typescript
// Functions are idempotent and don't have side effects
@ODataController
export class ProjectController {
  // Function: GET /odata/Projects(:id)/GetEntityCount
  @ODataFunction
  async getEntityCount(@odata.key id: number): Promise<number> {
    return this.projectService.getEntityCount(id);
  }

  // Unbound Function: GET /odata/SearchProjects(searchTerm='example')
  @ODataFunction
  async searchProjects(@odata.param('searchTerm') searchTerm: string): Promise<Project[]> {
    return this.projectService.search(searchTerm);
  }

  // Function with collection return
  @ODataFunction
  @odata.collection
  async getRecentProjects(@odata.param('days') days: number): Promise<Project[]> {
    return this.projectService.getRecent(days);
  }
}
```

---

## Query Options

### Processing $filter

```typescript
// src/odata/processors/filter.processor.ts
import { ODataQuery, filter as parseFilter } from 'odata-v4-server';

export class FilterProcessor {
  static process(query: ODataQuery, dbQuery: any): any {
    if (query.$filter) {
      const filterAST = parseFilter(query.$filter);
      dbQuery = this.applyFilter(dbQuery, filterAST);
    }
    return dbQuery;
  }

  private static applyFilter(dbQuery: any, filter: any): any {
    switch (filter.type) {
      case 'And':
        return this.applyLogicalOperator(dbQuery, filter.left, filter.right, 'and');
      case 'Or':
        return this.applyLogicalOperator(dbQuery, filter.left, filter.right, 'or');
      case 'Not':
        return this.applyNotOperator(dbQuery, filter.operand);
      case 'Eq':
        return dbQuery.where(filter.left.raw, filter.right.raw);
      case 'Ne':
        return dbQuery.whereNot(filter.left.raw, filter.right.raw);
      case 'Gt':
        return dbQuery.where(filter.left.raw, '>', filter.right.raw);
      case 'Ge':
        return dbQuery.where(filter.left.raw, '>=', filter.right.raw);
      case 'Lt':
        return dbQuery.where(filter.left.raw, '<', filter.right.raw);
      case 'Le':
        return dbQuery.where(filter.left.raw, '<=', filter.right.raw);
      case 'Contains':
        return dbQuery.where(filter.left.raw, 'ilike', `%${filter.right.raw}%`);
      case 'StartsWith':
        return dbQuery.where(filter.left.raw, 'ilike', `${filter.right.raw}%`);
      case 'EndsWith':
        return dbQuery.where(filter.left.raw, 'ilike', `%${filter.right.raw}`);
      default:
        return dbQuery;
    }
  }

  private static applyLogicalOperator(
    dbQuery: any,
    left: any,
    right: any,
    operator: 'and' | 'or'
  ): any {
    const method = operator === 'and' ? 'where' : 'orWhere';
    dbQuery = this.applyFilter(dbQuery, left);
    dbQuery = this.applyFilter(dbQuery, right);
    return dbQuery;
  }
}
```

### Processing $select

```typescript
// src/odata/processors/select.processor.ts
export class SelectProcessor {
  static process(query: ODataQuery, dbQuery: any): any {
    if (query.$select) {
      const fields = query.$select.split(',').map((f) => f.trim());
      return dbQuery.select(fields);
    }
    return dbQuery.select('*');
  }
}
```

### Processing $expand

```typescript
// src/odata/processors/expand.processor.ts
export class ExpandProcessor {
  static process(query: ODataQuery, dbQuery: any): any {
    if (query.$expand) {
      const expands = Array.isArray(query.$expand) ? query.$expand : [query.$expand];

      for (const expand of expands) {
        dbQuery = this.applyExpand(dbQuery, expand);
      }
    }
    return dbQuery;
  }

  private static applyExpand(dbQuery: any, expand: any): any {
    const relationName = expand.$expand || expand;
    return dbQuery.withGraphFetched(relationName);
  }
}
```

### Processing $orderby

```typescript
// src/odata/processors/orderby.processor.ts
export class OrderByProcessor {
  static process(query: ODataQuery, dbQuery: any): any {
    if (query.$orderby) {
      const orders = query.$orderby.split(',').map((o) => o.trim().split(' '));

      for (const [field, direction] of orders) {
        const order = direction === 'desc' ? 'desc' : 'asc';
        dbQuery = dbQuery.orderBy(field, order);
      }
    }
    return dbQuery;
  }
}
```

### Processing $top and $skip

```typescript
// src/odata/processors/pagination.processor.ts
export class PaginationProcessor {
  static process(query: ODataQuery, dbQuery: any): any {
    if (query.$top) {
      dbQuery = dbQuery.limit(parseInt(query.$top));
    }

    if (query.$skip) {
      dbQuery = dbQuery.offset(parseInt(query.$skip));
    }

    return dbQuery;
  }

  static getCount(query: ODataQuery, dbQuery: any): Promise<number> {
    if (query.$count === 'true') {
      return dbQuery.clone().count('* as count').first().then((r) => r.count);
    }
    return Promise.resolve(0);
  }
}
```

### Complete Query Processor

```typescript
// src/odata/processors/query.processor.ts
import { ODataQuery } from 'odata-v4-server';
import { FilterProcessor } from './filter.processor';
import { SelectProcessor } from './select.processor';
import { ExpandProcessor } from './expand.processor';
import { OrderByProcessor } from './orderby.processor';
import { PaginationProcessor } from './pagination.processor';

export class QueryProcessor {
  static process(query: ODataQuery, dbQuery: any): any {
    dbQuery = FilterProcessor.process(query, dbQuery);
    dbQuery = SelectProcessor.process(query, dbQuery);
    dbQuery = ExpandProcessor.process(query, dbQuery);
    dbQuery = OrderByProcessor.process(query, dbQuery);
    dbQuery = PaginationProcessor.process(query, dbQuery);

    return dbQuery;
  }

  static async execute(query: ODataQuery, dbQuery: any): Promise<{
    data: any[];
    total: number;
  }> {
    const processedQuery = this.process(query, dbQuery);
    const total = await PaginationProcessor.getCount(query, dbQuery);
    const data = await processedQuery;

    return { data, total };
  }
}
```

---

## CRUD Operations

### Service Implementation with Query Processing

```typescript
// src/modules/project/project.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { ODataQuery } from 'odata-v4-server';
import { QueryProcessor } from '../../odata/processors/query.processor';
import { ProjectRepository } from './project.repository';
import { Project } from './entities/project.entity';

@Injectable()
export class ProjectService {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async findAll(query: ODataQuery): Promise<Project[]> {
    const dbQuery = this.projectRepository.getQueryBuilder();
    const processed = await QueryProcessor.execute(query, dbQuery);
    return processed.data;
  }

  async findOne(id: number, query?: ODataQuery): Promise<Project> {
    let dbQuery = this.projectRepository.getQueryBuilder().where('id', id);

    if (query) {
      dbQuery = QueryProcessor.process(query, dbQuery);
    }

    const project = await dbQuery.first();

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project;
  }

  async create(data: Partial<Project>): Promise<Project> {
    return this.projectRepository.create(data);
  }

  async update(id: number, data: Partial<Project>): Promise<Project> {
    const existing = await this.findOne(id);
    return this.projectRepository.update(id, data);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    return this.projectRepository.remove(id);
  }

  async getEntityCount(id: number): Promise<number> {
    return this.projectRepository.getEntityCount(id);
  }
}
```

---

## Relationships and Navigation

### Navigation Property Configuration

```typescript
// src/odata/entities/project.entity.ts
@Entity
export class Project {
  @Edm.Key
  @Edm.Int32
  id: number;

  @Edm.String
  name: string;

  // One-to-Many: Project has many Entities
  @Edm.NavigationProperty
  @Edm.Partner('project')
  @Edm.ForeignKey('projectId')
  entities: Entity[];

  // Many-to-Many: Project has many Relationships
  @Edm.NavigationProperty
  @Edm.Partner('projects')
  @Edm.ForeignKey('projectIds')
  relationships: Relationship[];
}

// src/odata/entities/entity.entity.ts
@Entity
export class Entity {
  @Edm.Key
  @Edm.Int32
  id: number;

  @Edm.String
  name: string;

  @Edm.Int32
  @Edm.Nullable
  projectId: number;

  // Many-to-One: Entity belongs to Project
  @Edm.NavigationProperty
  @Edm.Partner('entities')
  project: Project;
}
```

### Navigation Property Controller

```typescript
// src/odata/controllers/project.controller.ts
@ODataController
export class ProjectController {
  // GET /odata/Projects(:id)/entities
  @odata.GET
  @odata.navigation('entities')
  async getEntities(
    @odata.key projectId: number,
    @odata.query query: ODataQuery
  ): Promise<Entity[]> {
    return this.entityService.findByProjectId(projectId, query);
  }

  // GET /odata/Projects(:id)/entities(:entityId)
  @odata.GET
  @odata.navigation('entities')
  async getEntity(
    @odata.key projectId: number,
    @odata.key entityId: number
  ): Promise<Entity> {
    return this.entityService.findOneInProject(projectId, entityId);
  }

  // POST /odata/Projects(:id)/entities
  @odata.POST
  @odata.navigation('entities')
  async createEntity(
    @odata.key projectId: number,
    @odata.body entity: Partial<Entity>
  ): Promise<Entity> {
    return this.entityService.createForProject(projectId, entity);
  }

  // DELETE /odata/Projects(:id)/entities(:entityId)
  @odata.DELETE
  @odata.navigation('entities')
  async deleteEntity(
    @odata.key projectId: number,
    @odata.key entityId: number
  ): Promise<void> {
    return this.entityService.removeFromProject(projectId, entityId);
  }
}
```

### Reference Handling

```typescript
// Handling $ref for relationships
@ODataController
export class ProjectController {
  // GET /odata/Projects(:id)/entities(:id2)/$ref
  @odata.GET
  @odata.navigation('entities')
  async getEntityReference(
    @odata.key projectId: number,
    @odata.key entityId: number
  ): Promise<{ '@odata.id': string }> {
    const entity = await this.entityService.findOneInProject(projectId, entityId);
    return {
      '@odata.id': `/Projects(${projectId})/entities(${entityId})`,
    };
  }

  // DELETE /odata/Projects(:id)/entities(:id2)/$ref
  @odata.DELETE
  @odata.navigation('entities')
  async deleteEntityReference(
    @odata.key projectId: number,
    @odata.key entityId: number
  ): Promise<void> {
    return this.entityService.removeFromProject(projectId, entityId);
  }

  // POST /odata/Projects(:id)/entities/$ref
  @odata.POST
  @odata.navigation('entities')
  async addEntityReference(
    @odata.key projectId: number,
    @odata.body ref: { '@odata.id': string }
  ): Promise<void> {
    const entityId = this.extractIdFromRef(ref['@odata.id']);
    return this.entityService.addToProject(projectId, entityId);
  }

  private extractIdFromRef(odataId: string): number {
    const match = odataId.match(/\((\d+)\)/);
    return match ? parseInt(match[1]) : 0;
  }
}
```

---

## Security and Authorization

### Authorization Filter

```typescript
// src/odata/processors/authorization.processor.ts
import { ODataQuery } from 'odata-v4-server';

export class AuthorizationProcessor {
  static process(
    query: ODataQuery,
    dbQuery: any,
    userId: string,
    userRoles: string[]
  ): any {
    // Apply row-level security
    if (!userRoles.includes('admin')) {
      dbQuery = dbQuery.where('userId', userId);
    }

    // Apply field-level security
    if (query.$select) {
      query.$select = this.filterAccessibleFields(query.$select, userRoles);
    }

    return dbQuery;
  }

  private static filterAccessibleFields(fields: string, roles: string[]): string {
    const adminOnlyFields = ['internalNotes', 'auditLog'];
    if (roles.includes('admin')) {
      return fields;
    }
    return fields
      .split(',')
      .filter((f) => !adminOnlyFields.includes(f.trim()))
      .join(',');
  }
}
```

### Role-Based Access Control

```typescript
// src/odata/guards/odata.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ODataGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

// Usage
@ODataController
export class AdminProjectController {
  @odata.GET
  @UseGuards(ODataGuard)
  @Roles('admin')
  async getAllProjects(@odata.query query: ODataQuery): Promise<Project[]> {
    return this.projectService.findAll(query);
  }
}
```

---

## Performance Optimization

### Caching Strategy

```typescript
// src/odata/cache/odata.cache.ts
import { Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class ODataCache {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    return this.cacheManager.get<T>(key);
  }

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async invalidate(pattern: string): Promise<void> {
    // Implementation depends on cache provider
    await this.cacheManager.del(pattern);
  }

  generateCacheKey(entity: string, query: ODataQuery): string {
    const hash = this.hashQuery(query);
    return `odata:${entity}:${hash}`;
  }

  private hashQuery(query: ODataQuery): string {
    return Buffer.from(JSON.stringify(query)).toString('base64');
  }
}
```

### Batch Processing

```typescript
// src/odata/batch/batch.processor.ts
import { Injectable } from '@nestjs/common';

interface BatchRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
}

interface BatchResponse {
  id: string;
  status: number;
  headers: Record<string, string>;
  body: any;
}

@Injectable()
export class BatchProcessor {
  async processBatch(requests: BatchRequest[]): Promise<BatchResponse[]> {
    const responses: BatchResponse[] = [];

    // Execute requests in transaction
    await this.knex.transaction(async (trx) => {
      for (const request of requests) {
        const response = await this.executeRequest(request, trx);
        responses.push(response);
      }
    });

    return responses;
  }

  private async executeRequest(
    request: BatchRequest,
    trx: any
  ): Promise<BatchResponse> {
    // Implementation depends on request type
    return {
      id: request.id,
      status: 200,
      headers: {},
      body: {},
    };
  }
}
```

---

## Testing Strategies

### Unit Testing Controllers

```typescript
// test/odata/project.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectController } from '../../src/odata/controllers/project.controller';
import { ProjectService } from '../../src/modules/project/project.service';

describe('ProjectController', () => {
  let controller: ProjectController;
  let service: ProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        {
          provide: ProjectService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProjectController>(ProjectController);
    service = module.get<ProjectService>(ProjectService);
  });

  describe('findAll', () => {
    it('should return an array of projects', async () => {
      const expectedProjects = [
        { id: 1, name: 'Project 1' },
        { id: 2, name: 'Project 2' },
      ];

      jest.spyOn(service, 'findAll').mockResolvedValue(expectedProjects);

      const result = await controller.findAll({});

      expect(result).toEqual(expectedProjects);
      expect(service.findAll).toHaveBeenCalledWith({});
    });

    it('should apply $filter', async () => {
      const query = { $filter: "name eq 'Project 1'" };
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should apply $select', async () => {
      const query = { $select: 'id,name' };
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });
});
```

---

## Bun.js Runtime Specifics

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "commonjs",
    "lib": ["ESNext"],
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Server Configuration

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ODataServer } from 'odata-v4-server';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  });

  // Start OData server
  const odataServer = new ODataServer();
  odataServer.listen(3002, () => {
    console.log('OData server running on port 3002');
  });

  // Start NestJS
  await app.listen(3001);
  console.log('Application running on port 3001');
}

bootstrap();
```

---

## Additional Resources

- [OData v4 Official Documentation](https://docs.oasis-open.org/odata/odata/v4.0/odata-v4.0-part1-protocol.html)
- [jaystack/odata-v4-server](https://github.com/jaystack/odata-v4-server)
- [OData URI Conventions](https://docs.oasis-open.org/odata/odata/v4.0/odata-v4.0-part2-url-conventions.html)