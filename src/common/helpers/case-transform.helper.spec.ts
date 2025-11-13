import { describe, it, expect } from 'vitest';
import {
  toCamelCase,
  toSnakeCase,
  transformKeysToCamel,
  transformKeysToSnake,
} from './case-transform.helper';

/**
 * Case Transform Helper Unit Tests
 * Tests string and object key transformations between camelCase and snake_case
 * Target Coverage: 100%
 */
describe('Case Transform Helpers', () => {
  describe('toCamelCase', () => {
    it('should convert snake_case to camelCase', () => {
      expect(toCamelCase('user_id')).toBe('userId');
      expect(toCamelCase('week_start_date')).toBe('weekStartDate');
      expect(toCamelCase('created_at')).toBe('createdAt');
    });

    it('should handle single word strings', () => {
      expect(toCamelCase('user')).toBe('user');
      expect(toCamelCase('project')).toBe('project');
    });

    it('should handle multiple underscores', () => {
      // Multiple underscores: only the first char after underscore is capitalized
      expect(toCamelCase('user__id')).toBe('user_Id');
      expect(toCamelCase('very_long_field_name')).toBe('veryLongFieldName');
    });

    it('should handle leading underscores', () => {
      // Leading underscore is removed (matches only _[a-z])
      expect(toCamelCase('_private_field')).toBe('PrivateField');
    });

    it('should handle trailing underscores', () => {
      expect(toCamelCase('field_name_')).toBe('fieldName_');
    });

    it('should preserve uppercase letters that are not after underscores', () => {
      expect(toCamelCase('HTTP_HEADER')).toBe('HTTP_HEADER');
    });

    it('should handle empty string', () => {
      expect(toCamelCase('')).toBe('');
    });

    it('should handle strings without underscores', () => {
      expect(toCamelCase('alreadycamel')).toBe('alreadycamel');
    });
  });

  describe('toSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(toSnakeCase('userId')).toBe('user_id');
      expect(toSnakeCase('weekStartDate')).toBe('week_start_date');
      expect(toSnakeCase('createdAt')).toBe('created_at');
    });

    it('should handle single word strings', () => {
      expect(toSnakeCase('user')).toBe('user');
      expect(toSnakeCase('project')).toBe('project');
    });

    it('should handle consecutive uppercase letters', () => {
      expect(toSnakeCase('HTTPHeader')).toBe('_h_t_t_p_header');
      expect(toSnakeCase('XMLParser')).toBe('_x_m_l_parser');
    });

    it('should handle leading uppercase', () => {
      expect(toSnakeCase('UserId')).toBe('_user_id');
    });

    it('should handle empty string', () => {
      expect(toSnakeCase('')).toBe('');
    });

    it('should handle already lowercase strings', () => {
      expect(toSnakeCase('alreadylower')).toBe('alreadylower');
    });

    it('should handle mixed case strings', () => {
      expect(toSnakeCase('getUserById')).toBe('get_user_by_id');
    });
  });

  describe('transformKeysToCamel', () => {
    it('should transform snake_case keys to camelCase', () => {
      const input = {
        user_id: 'user-123',
        project_id: 'proj-456',
        week_start_date: '2025-01-06',
      };

      const result = transformKeysToCamel(input);

      expect(result).toEqual({
        userId: 'user-123',
        projectId: 'proj-456',
        weekStartDate: '2025-01-06',
      });
    });

    it('should handle nested objects', () => {
      const input = {
        user_id: 'user-123',
        user_profile: {
          first_name: 'John',
          last_name: 'Doe',
          manager_id: 'mgr-456',
        },
      };

      const result = transformKeysToCamel(input);

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
      const input = {
        time_entries: [
          { entry_id: '1', hours_logged: 8 },
          { entry_id: '2', hours_logged: 6 },
        ],
      };

      const result = transformKeysToCamel(input);

      expect(result).toEqual({
        timeEntries: [
          { entryId: '1', hoursLogged: 8 },
          { entryId: '2', hoursLogged: 6 },
        ],
      });
    });

    it('should handle top-level arrays', () => {
      const input = [
        { user_id: 'user-1', first_name: 'John' },
        { user_id: 'user-2', first_name: 'Jane' },
      ];

      const result = transformKeysToCamel(input);

      expect(result).toEqual([
        { userId: 'user-1', firstName: 'John' },
        { userId: 'user-2', firstName: 'Jane' },
      ]);
    });

    it('should handle empty objects', () => {
      expect(transformKeysToCamel({})).toEqual({});
    });

    it('should handle empty arrays', () => {
      expect(transformKeysToCamel([])).toEqual([]);
    });

    it('should preserve null values', () => {
      const input = {
        user_id: 'user-123',
        manager_id: null,
        notes: null,
      };

      const result = transformKeysToCamel(input);

      expect(result).toEqual({
        userId: 'user-123',
        managerId: null,
        notes: null,
      });
    });

    it('should preserve undefined values', () => {
      const input = {
        user_id: 'user-123',
        optional_field: undefined,
      };

      const result = transformKeysToCamel(input);

      expect(result.userId).toBe('user-123');
      expect(result.optionalField).toBeUndefined();
    });

    it('should handle deeply nested structures', () => {
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

      const result = transformKeysToCamel(input);

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

    it('should handle mixed arrays and nested objects', () => {
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

      const result = transformKeysToCamel(input);

      expect(result.userProjects[0].teamMembers[0]).toEqual({
        userId: 'user-1',
        userName: 'John',
      });
    });

    it('should return null for null input', () => {
      expect(transformKeysToCamel(null)).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      expect(transformKeysToCamel(undefined)).toBeUndefined();
    });

    it('should not transform non-object values', () => {
      expect(transformKeysToCamel('string')).toBe('string');
      expect(transformKeysToCamel(123)).toBe(123);
      expect(transformKeysToCamel(true)).toBe(true);
      expect(transformKeysToCamel(false)).toBe(false);
    });

    it('should handle Date objects', () => {
      const date = new Date('2025-01-06');
      const input = {
        created_at: date,
      };

      const result = transformKeysToCamel(input);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.createdAt.getTime()).toBe(date.getTime());
    });

    it('should handle numeric keys', () => {
      const input = {
        user_id: 'user-123',
        '0': 'first',
        '1': 'second',
      };

      const result = transformKeysToCamel(input);

      expect(result.userId).toBe('user-123');
      expect(result['0']).toBe('first');
      expect(result['1']).toBe('second');
    });

    it('should only transform own properties', () => {
      const proto = { proto_field: 'value' };
      const input = Object.create(proto);
      input.own_field = 'own';

      const result = transformKeysToCamel(input);

      expect(result.ownField).toBe('own');
      expect(result.protoField).toBeUndefined();
    });

    it('should not mutate original object', () => {
      const input = {
        user_id: 'user-123',
        nested: {
          field_name: 'value',
        },
      };

      const originalInput = JSON.parse(JSON.stringify(input));
      transformKeysToCamel(input);

      expect(input).toEqual(originalInput);
    });
  });

  describe('transformKeysToSnake', () => {
    it('should transform camelCase keys to snake_case', () => {
      const input = {
        userId: 'user-123',
        projectId: 'proj-456',
        weekStartDate: '2025-01-06',
      };

      const result = transformKeysToSnake(input);

      expect(result).toEqual({
        user_id: 'user-123',
        project_id: 'proj-456',
        week_start_date: '2025-01-06',
      });
    });

    it('should handle nested objects', () => {
      const input = {
        userId: 'user-123',
        userProfile: {
          firstName: 'John',
          lastName: 'Doe',
          managerId: 'mgr-456',
        },
      };

      const result = transformKeysToSnake(input);

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
      const input = [
        { userId: 'user-1', firstName: 'John' },
        { userId: 'user-2', firstName: 'Jane' },
      ];

      const result = transformKeysToSnake(input);

      expect(result).toEqual([
        { user_id: 'user-1', first_name: 'John' },
        { user_id: 'user-2', first_name: 'Jane' },
      ]);
    });

    it('should handle empty objects', () => {
      expect(transformKeysToSnake({})).toEqual({});
    });

    it('should handle empty arrays', () => {
      expect(transformKeysToSnake([])).toEqual([]);
    });

    it('should preserve null values', () => {
      const input = {
        userId: 'user-123',
        managerId: null,
      };

      const result = transformKeysToSnake(input);

      expect(result).toEqual({
        user_id: 'user-123',
        manager_id: null,
      });
    });

    it('should return null for null input', () => {
      expect(transformKeysToSnake(null)).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      expect(transformKeysToSnake(undefined)).toBeUndefined();
    });

    it('should not transform primitive values', () => {
      expect(transformKeysToSnake('string')).toBe('string');
      expect(transformKeysToSnake(123)).toBe(123);
      expect(transformKeysToSnake(true)).toBe(true);
    });

    it('should not mutate original object', () => {
      const input = {
        userId: 'user-123',
        nested: {
          fieldName: 'value',
        },
      };

      const originalInput = JSON.parse(JSON.stringify(input));
      transformKeysToSnake(input);

      expect(input).toEqual(originalInput);
    });
  });

  describe('roundtrip transformations', () => {
    it('should be reversible: snake -> camel -> snake', () => {
      const original = {
        user_id: 'user-123',
        project_id: 'proj-456',
        week_start_date: '2025-01-06',
        nested_data: {
          first_name: 'John',
          last_name: 'Doe',
        },
      };

      const camelCase = transformKeysToCamel(original);
      const backToSnake = transformKeysToSnake(camelCase);

      expect(backToSnake).toEqual(original);
    });

    it('should be reversible: camel -> snake -> camel', () => {
      const original = {
        userId: 'user-123',
        projectId: 'proj-456',
        weekStartDate: '2025-01-06',
        nestedData: {
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      const snakeCase = transformKeysToSnake(original);
      const backToCamel = transformKeysToCamel(snakeCase);

      expect(backToCamel).toEqual(original);
    });

    it('should preserve primitive values in roundtrip', () => {
      const original = {
        stringValue: 'test',
        numberValue: 123,
        booleanValue: true,
        nullValue: null,
        undefinedValue: undefined,
      };

      const snakeCase = transformKeysToSnake(original);
      const backToCamel = transformKeysToCamel(snakeCase);

      expect(backToCamel.stringValue).toBe('test');
      expect(backToCamel.numberValue).toBe(123);
      expect(backToCamel.booleanValue).toBe(true);
      expect(backToCamel.nullValue).toBeNull();
      expect(backToCamel.undefinedValue).toBeUndefined();
    });

    it('should preserve Date objects in roundtrip', () => {
      const date = new Date('2025-01-06');
      const original = {
        createdAt: date,
      };

      const snakeCase = transformKeysToSnake(original);
      const backToCamel = transformKeysToCamel(snakeCase);

      expect(backToCamel.createdAt).toBeInstanceOf(Date);
      expect(backToCamel.createdAt.getTime()).toBe(date.getTime());
    });

    it('should preserve array structures in roundtrip', () => {
      const original = {
        items: [
          { itemId: '1', itemName: 'First' },
          { itemId: '2', itemName: 'Second' },
        ],
      };

      const snakeCase = transformKeysToSnake(original);
      const backToCamel = transformKeysToCamel(snakeCase);

      expect(backToCamel).toEqual(original);
    });
  });
});
