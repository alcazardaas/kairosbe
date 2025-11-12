/**
 * Project test data builder
 * Provides a fluent API for creating test project objects
 */

import { TEST_TENANT_ID, TEST_ADMIN_ID } from '../constants';

export class ProjectBuilder {
  private data: any = {
    id: 'project-builder-default-id',
    tenantId: TEST_TENANT_ID,
    name: 'Default Project',
    code: 'PROJ-001',
    description: null,
    status: 'active',
    createdBy: TEST_ADMIN_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withTenantId(tenantId: string): this {
    this.data.tenantId = tenantId;
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withCode(code: string): this {
    this.data.code = code;
    return this;
  }

  withDescription(description: string): this {
    this.data.description = description;
    return this;
  }

  withStatus(status: 'active' | 'archived'): this {
    this.data.status = status;
    return this;
  }

  withCreatedBy(createdBy: string): this {
    this.data.createdBy = createdBy;
    return this;
  }

  asActive(): this {
    this.data.status = 'active';
    return this;
  }

  asArchived(): this {
    this.data.status = 'archived';
    return this;
  }

  build(): any {
    return { ...this.data };
  }
}
