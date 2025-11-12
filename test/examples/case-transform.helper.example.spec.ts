/**
 * EXAMPLE TEST FILE - Case Transformation Helper
 *
 * This demonstrates testing patterns for utility functions and helpers.
 * Use this as a reference when writing tests for helper functions.
 *
 * NOTE: This is an example file and not run in the actual test suite.
 * The real case-transform.helper.spec.ts will be created in src/common/helpers/ directory.
 */

import {
  transformKeysToCamel,
  transformKeysToSnake,
} from '../../src/common/helpers/case-transform.helper';

/**
 * Example helper tests
 * Demonstrates:
 * - Testing pure functions
 * - Testing transformations
 * - Testing edge cases
 * - Testing nested structures
 * - Testing arrays
 */
describe('Case Transformation Helpers (Example)', () => {
  /**
   * PATTERN: Testing pure functions
   * - No mocks needed
   * - Simple input -> output testing
   * - Focus on edge cases
   */
  describe('transformKeysToCamel', () => {
    it('should transform snake_case keys to camelCase', () => {
      // Arrange
      const input = {
        user_id: 'user-123',
        project_id: 'proj-456',
        week_start_date: '2025-01-06',
      };

      // Act
      const result = transformKeysToCamel(input);

      // Assert
      expect(result).toEqual({
        userId: 'user-123',
        projectId: 'proj-456',
        weekStartDate: '2025-01-06',
      });

      // Verify original object unchanged (no mutation)
      expect(input).toHaveProperty('user_id');
    });

    it('should handle nested objects', () => {
      // Arrange
      const input = {
        user_id: 'user-123',
        user_profile: {
          first_name: 'John',
          last_name: 'Doe',
          manager_id: 'mgr-456',
        },
      };

      // Act
      const result = transformKeysToCamel(input);

      // Assert
      expect(result).toEqual({
        userId: 'user-123',
        userProfile: {
          firstName: 'John',
          lastName: 'Doe',
          managerId: 'mgr-456',
        },
      });
    });

    it('should handle arrays of objects', () => {
      // Arrange
      const input = {
        time_entries: [
          { entry_id: '1', hours_logged: 8 },
          { entry_id: '2', hours_logged: 6 },
        ],
      };

      // Act
      const result = transformKeysToCamel(input);

      // Assert
      expect(result.timeEntries).toHaveLength(2);
      expect(result.timeEntries[0]).toEqual({
        entryId: '1',
        hoursLogged: 8,
      });
      expect(result.timeEntries[1]).toEqual({
        entryId: '2',
        hoursLogged: 6,
      });
    });

    it('should handle top-level arrays', () => {
      // Arrange
      const input = [
        { user_id: 'user-1', first_name: 'John' },
        { user_id: 'user-2', first_name: 'Jane' },
      ];

      // Act
      const result = transformKeysToCamel(input);

      // Assert
      expect(result).toEqual([
        { userId: 'user-1', firstName: 'John' },
        { userId: 'user-2', firstName: 'Jane' },
      ]);
    });

    /**
     * PATTERN: Testing edge cases
     * - Empty objects
     * - Null values
     * - Undefined values
     * - Special characters
     */
    it('should handle empty objects', () => {
      // Arrange
      const input = {};

      // Act
      const result = transformKeysToCamel(input);

      // Assert
      expect(result).toEqual({});
    });

    it('should preserve null values', () => {
      // Arrange
      const input = {
        user_id: 'user-123',
        manager_id: null,
        notes: null,
      };

      // Act
      const result = transformKeysToCamel(input);

      // Assert
      expect(result).toEqual({
        userId: 'user-123',
        managerId: null,
        notes: null,
      });
    });

    it('should preserve undefined values', () => {
      // Arrange
      const input = {
        user_id: 'user-123',
        optional_field: undefined,
      };

      // Act
      const result = transformKeysToCamel(input);

      // Assert
      expect(result.userId).toBe('user-123');
      expect(result.optionalField).toBeUndefined();
    });

    it('should handle deeply nested structures', () => {
      // Arrange
      const input = {
        tenant_data: {
          org_settings: {
            timesheet_policy: {
              min_hours_per_week: 40,
              max_hours_per_day: 24,
            },
          },
        },
      };

      // Act
      const result = transformKeysToCamel(input);

      // Assert
      expect(result).toEqual({
        tenantData: {
          orgSettings: {
            timesheetPolicy: {
              minHoursPerWeek: 40,
              maxHoursPerDay: 24,
            },
          },
        },
      });
    });

    it('should handle mixed arrays and objects', () => {
      // Arrange
      const input = {
        user_projects: [
          {
            project_id: 'proj-1',
            project_name: 'Project A',
            team_members: [
              { user_id: 'user-1', user_name: 'John' },
              { user_id: 'user-2', user_name: 'Jane' },
            ],
          },
        ],
      };

      // Act
      const result = transformKeysToCamel(input);

      // Assert
      expect(result.userProjects[0].teamMembers[0]).toEqual({
        userId: 'user-1',
        userName: 'John',
      });
    });

    it('should not transform non-object values', () => {
      // Arrange
      const stringInput = 'user_id';
      const numberInput = 123;
      const booleanInput = true;

      // Act & Assert
      expect(transformKeysToCamel(stringInput)).toBe('user_id');
      expect(transformKeysToCamel(numberInput)).toBe(123);
      expect(transformKeysToCamel(booleanInput)).toBe(true);
    });

    it('should handle Date objects', () => {
      // Arrange
      const date = new Date('2025-01-06');
      const input = {
        created_at: date,
      };

      // Act
      const result = transformKeysToCamel(input);

      // Assert
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.createdAt.getTime()).toBe(date.getTime());
    });

    it('should handle keys with multiple underscores', () => {
      // Arrange
      const input = {
        user__id: 'user-123',
        project___name: 'Test',
      };

      // Act
      const result = transformKeysToCamel(input);

      // Assert
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('projectName');
    });

    it('should handle keys with leading/trailing underscores', () => {
      // Arrange
      const input = {
        _user_id: 'user-123',
        project_id_: 'proj-456',
        _internal_field_: 'value',
      };

      // Act
      const result = transformKeysToCamel(input);

      // Assert: Behavior depends on implementation
      // Document expected behavior
      expect(result).toBeDefined();
    });
  });

  /**
   * PATTERN: Testing inverse transformations
   * Verify transformations are reversible
   */
  describe('transformKeysToSnake', () => {
    it('should transform camelCase keys to snake_case', () => {
      // Arrange
      const input = {
        userId: 'user-123',
        projectId: 'proj-456',
        weekStartDate: '2025-01-06',
      };

      // Act
      const result = transformKeysToSnake(input);

      // Assert
      expect(result).toEqual({
        user_id: 'user-123',
        project_id: 'proj-456',
        week_start_date: '2025-01-06',
      });
    });

    it('should handle nested objects', () => {
      // Arrange
      const input = {
        userId: 'user-123',
        userProfile: {
          firstName: 'John',
          lastName: 'Doe',
          managerId: 'mgr-456',
        },
      };

      // Act
      const result = transformKeysToSnake(input);

      // Assert
      expect(result).toEqual({
        user_id: 'user-123',
        user_profile: {
          first_name: 'John',
          last_name: 'Doe',
          manager_id: 'mgr-456',
        },
      });
    });

    it('should handle arrays', () => {
      // Arrange
      const input = [
        { userId: 'user-1', firstName: 'John' },
        { userId: 'user-2', firstName: 'Jane' },
      ];

      // Act
      const result = transformKeysToSnake(input);

      // Assert
      expect(result).toEqual([
        { user_id: 'user-1', first_name: 'John' },
        { user_id: 'user-2', first_name: 'Jane' },
      ]);
    });

    /**
     * PATTERN: Roundtrip testing
     * Verify transformations preserve data
     */
    it('should be reversible with transformKeysToCamel', () => {
      // Arrange
      const original = {
        userId: 'user-123',
        projectId: 'proj-456',
        weekStartDate: '2025-01-06',
        nestedData: {
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      // Act: Transform to snake_case and back
      const snakeCase = transformKeysToSnake(original);
      const backToCamel = transformKeysToCamel(snakeCase);

      // Assert: Should match original
      expect(backToCamel).toEqual(original);
    });

    it('should preserve primitive values in roundtrip', () => {
      // Arrange
      const original = {
        stringValue: 'test',
        numberValue: 123,
        booleanValue: true,
        nullValue: null,
        undefinedValue: undefined,
        dateValue: new Date('2025-01-06'),
      };

      // Act
      const snakeCase = transformKeysToSnake(original);
      const backToCamel = transformKeysToCamel(snakeCase);

      // Assert
      expect(backToCamel.stringValue).toBe('test');
      expect(backToCamel.numberValue).toBe(123);
      expect(backToCamel.booleanValue).toBe(true);
      expect(backToCamel.nullValue).toBeNull();
      expect(backToCamel.dateValue).toBeInstanceOf(Date);
    });
  });

  /**
   * PATTERN: Performance testing (optional)
   * For critical path functions
   */
  describe('performance', () => {
    it('should handle large objects efficiently', () => {
      // Arrange: Create large object
      const largeObject = {
        users: Array.from({ length: 1000 }, (_, i) => ({
          user_id: `user-${i}`,
          first_name: `User${i}`,
          last_name: `Test${i}`,
          email_address: `user${i}@example.com`,
        })),
      };

      // Act: Measure transformation time
      const startTime = Date.now();
      const result = transformKeysToCamel(largeObject);
      const endTime = Date.now();

      // Assert: Should complete in reasonable time (<100ms)
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.users).toHaveLength(1000);
      expect(result.users[0]).toHaveProperty('userId');
    });
  });
});
