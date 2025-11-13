/**
 * User test data builder
 * Provides a fluent API for creating test user objects
 */

import { TEST_TENANT_ID } from '../constants';

export class UserBuilder {
  private data: any = {
    id: 'user-builder-default-id',
    email: 'default@example.com',
    name: 'Default User',
    role: 'employee',
    tenantId: TEST_TENANT_ID,
    passwordHash: '$2b$10$dummyhash',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withRole(role: 'employee' | 'manager' | 'admin'): this {
    this.data.role = role;
    return this;
  }

  withTenantId(tenantId: string): this {
    this.data.tenantId = tenantId;
    return this;
  }

  asEmployee(): this {
    this.data.role = 'employee';
    return this;
  }

  asManager(): this {
    this.data.role = 'manager';
    return this;
  }

  asAdmin(): this {
    this.data.role = 'admin';
    return this;
  }

  inactive(): this {
    this.data.isActive = false;
    return this;
  }

  build(): any {
    return { ...this.data };
  }
}
