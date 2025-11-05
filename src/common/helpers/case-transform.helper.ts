/**
 * Case transformation utilities for converting between camelCase and snake_case
 *
 * Used to maintain convention:
 * - API layer (DTOs, JSON): camelCase
 * - Database layer (SQL, queries): snake_case
 */

/**
 * Convert a string from snake_case to camelCase
 * @param str - The snake_case string to convert
 * @returns The camelCase string
 * @example toC amelCase('user_id') // 'userId'
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert a string from camelCase to snake_case
 * @param str - The camelCase string to convert
 * @returns The snake_case string
 * @example toSnakeCase('userId') // 'user_id'
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Recursively transform all keys in an object from snake_case to camelCase
 * Handles nested objects and arrays
 * @param obj - The object to transform
 * @returns New object with camelCase keys
 */
export function transformKeysToCamel<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeysToCamel(item)) as any;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const transformed: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const camelKey = toCamelCase(key);
        transformed[camelKey] = transformKeysToCamel(obj[key]);
      }
    }
    return transformed;
  }

  return obj;
}

/**
 * Recursively transform all keys in an object from camelCase to snake_case
 * Handles nested objects and arrays
 * @param obj - The object to transform
 * @returns New object with snake_case keys
 */
export function transformKeysToSnake<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeysToSnake(item)) as any;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const transformed: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const snakeKey = toSnakeCase(key);
        transformed[snakeKey] = transformKeysToSnake(obj[key]);
      }
    }
    return transformed;
  }

  return obj;
}
