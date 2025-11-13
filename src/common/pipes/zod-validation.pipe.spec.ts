import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from './zod-validation.pipe';
import { z } from 'zod';

/**
 * ZodValidationPipe Unit Tests
 * Tests validation pipe for zod schema validation
 * Target Coverage: 100%
 */
describe('ZodValidationPipe', () => {
  describe('basic validation', () => {
    it('should validate and return valid data', () => {
      // Arrange
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      const pipe = new ZodValidationPipe(schema);
      const validData = {
        email: 'test@example.com',
        age: 25,
      };

      // Act
      const result = pipe.transform(validData);

      // Assert
      expect(result).toEqual(validData);
    });

    it('should throw BadRequestException for invalid data', () => {
      // Arrange
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      const pipe = new ZodValidationPipe(schema);
      const invalidData = {
        email: 'not-an-email',
        age: 15,
      };

      // Act & Assert
      expect(() => pipe.transform(invalidData)).toThrow(BadRequestException);
    });

    it('should include validation error messages', () => {
      // Arrange
      const schema = z.object({
        email: z.string().email('Invalid email format'),
      });

      const pipe = new ZodValidationPipe(schema);
      const invalidData = {
        email: 'not-an-email',
      };

      // Act & Assert
      try {
        pipe.transform(invalidData);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        expect(response.error).toBe('Validation failed');
        expect(response.message).toContain('email');
        expect(response.statusCode).toBe(400);
      }
    });

    it('should return error with statusCode 400', () => {
      // Arrange
      const schema = z.object({
        name: z.string().min(3),
      });

      const pipe = new ZodValidationPipe(schema);
      const invalidData = { name: 'ab' };

      // Act & Assert
      try {
        pipe.transform(invalidData);
        expect.fail('Should have thrown');
      } catch (error) {
        const response = (error as BadRequestException).getResponse() as any;
        expect(response.statusCode).toBe(400);
      }
    });
  });

  describe('string validation', () => {
    it('should validate email format', () => {
      // Arrange
      const schema = z.object({
        email: z.string().email(),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: Valid email
      const validResult = pipe.transform({ email: 'user@example.com' });
      expect(validResult.email).toBe('user@example.com');

      // Invalid email
      expect(() => pipe.transform({ email: 'invalid' })).toThrow(BadRequestException);
    });

    it('should validate string min length', () => {
      // Arrange
      const schema = z.object({
        password: z.string().min(8, 'Password must be at least 8 characters'),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: Valid
      const validResult = pipe.transform({ password: 'password123' });
      expect(validResult.password).toBe('password123');

      // Invalid
      expect(() => pipe.transform({ password: 'short' })).toThrow(BadRequestException);
    });

    it('should validate string max length', () => {
      // Arrange
      const schema = z.object({
        username: z.string().max(20),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: Valid
      const validResult = pipe.transform({ username: 'john' });
      expect(validResult.username).toBe('john');

      // Invalid
      expect(() => pipe.transform({ username: 'a'.repeat(21) })).toThrow(BadRequestException);
    });

    it('should validate UUID format', () => {
      // Arrange
      const schema = z.object({
        id: z.string().uuid(),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: Valid
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      const validResult = pipe.transform({ id: validId });
      expect(validResult.id).toBe(validId);

      // Invalid
      expect(() => pipe.transform({ id: 'not-a-uuid' })).toThrow(BadRequestException);
    });
  });

  describe('number validation', () => {
    it('should validate number range', () => {
      // Arrange
      const schema = z.object({
        age: z.number().min(18).max(100),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: Valid
      const validResult = pipe.transform({ age: 25 });
      expect(validResult.age).toBe(25);

      // Too small
      expect(() => pipe.transform({ age: 17 })).toThrow(BadRequestException);

      // Too large
      expect(() => pipe.transform({ age: 101 })).toThrow(BadRequestException);
    });

    it('should validate integer', () => {
      // Arrange
      const schema = z.object({
        count: z.number().int(),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: Valid
      const validResult = pipe.transform({ count: 5 });
      expect(validResult.count).toBe(5);

      // Invalid (float)
      expect(() => pipe.transform({ count: 5.5 })).toThrow(BadRequestException);
    });

    it('should validate positive numbers', () => {
      // Arrange
      const schema = z.object({
        hours: z.number().positive(),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: Valid
      const validResult = pipe.transform({ hours: 8 });
      expect(validResult.hours).toBe(8);

      // Invalid (negative)
      expect(() => pipe.transform({ hours: -1 })).toThrow(BadRequestException);

      // Invalid (zero)
      expect(() => pipe.transform({ hours: 0 })).toThrow(BadRequestException);
    });
  });

  describe('optional fields', () => {
    it('should handle optional fields', () => {
      // Arrange
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: With optional
      const withOptional = pipe.transform({
        required: 'value',
        optional: 'optional-value',
      });
      expect(withOptional.optional).toBe('optional-value');

      // Without optional
      const withoutOptional = pipe.transform({
        required: 'value',
      });
      expect(withoutOptional.optional).toBeUndefined();
    });

    it('should handle nullable fields', () => {
      // Arrange
      const schema = z.object({
        field: z.string().nullable(),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: With value
      const withValue = pipe.transform({ field: 'value' });
      expect(withValue.field).toBe('value');

      // With null
      const withNull = pipe.transform({ field: null });
      expect(withNull.field).toBeNull();
    });

    it('should handle default values', () => {
      // Arrange
      const schema = z.object({
        status: z.string().default('active'),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: With value
      const withValue = pipe.transform({ status: 'inactive' });
      expect(withValue.status).toBe('inactive');

      // Without value (should use default)
      const withoutValue = pipe.transform({});
      expect(withoutValue.status).toBe('active');
    });
  });

  describe('nested objects', () => {
    it('should validate nested objects', () => {
      // Arrange
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: Valid
      const validData = {
        user: {
          name: 'John',
          email: 'john@example.com',
        },
      };
      const result = pipe.transform(validData);
      expect(result).toEqual(validData);

      // Invalid nested
      expect(() =>
        pipe.transform({
          user: {
            name: 'John',
            email: 'invalid',
          },
        }),
      ).toThrow(BadRequestException);
    });

    it('should include nested field paths in error messages', () => {
      // Arrange
      const schema = z.object({
        user: z.object({
          email: z.string().email(),
        }),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert
      try {
        pipe.transform({
          user: {
            email: 'invalid',
          },
        });
        expect.fail('Should have thrown');
      } catch (error) {
        const response = (error as BadRequestException).getResponse() as any;
        expect(response.message).toContain('user.email');
      }
    });
  });

  describe('arrays', () => {
    it('should validate arrays', () => {
      // Arrange
      const schema = z.object({
        tags: z.array(z.string()),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: Valid
      const validResult = pipe.transform({ tags: ['tag1', 'tag2'] });
      expect(validResult.tags).toEqual(['tag1', 'tag2']);

      // Invalid (not an array)
      expect(() => pipe.transform({ tags: 'not-an-array' })).toThrow(BadRequestException);

      // Invalid (wrong type in array)
      expect(() => pipe.transform({ tags: [1, 2, 3] })).toThrow(BadRequestException);
    });

    it('should validate array min length', () => {
      // Arrange
      const schema = z.object({
        items: z.array(z.string()).min(1),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: Valid
      const validResult = pipe.transform({ items: ['item1'] });
      expect(validResult.items).toHaveLength(1);

      // Invalid (empty array)
      expect(() => pipe.transform({ items: [] })).toThrow(BadRequestException);
    });

    it('should validate array of objects', () => {
      // Arrange
      const schema = z.object({
        users: z.array(
          z.object({
            name: z.string(),
            age: z.number(),
          }),
        ),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: Valid
      const validData = {
        users: [
          { name: 'John', age: 25 },
          { name: 'Jane', age: 30 },
        ],
      };
      const result = pipe.transform(validData);
      expect(result).toEqual(validData);

      // Invalid
      expect(() =>
        pipe.transform({
          users: [{ name: 'John', age: 'not-a-number' }],
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('custom validation', () => {
    it('should handle custom refinement', () => {
      // Arrange
      const schema = z
        .object({
          password: z.string(),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: 'Passwords do not match',
          path: ['confirmPassword'],
        });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: Valid
      const validData = {
        password: 'secret123',
        confirmPassword: 'secret123',
      };
      const result = pipe.transform(validData);
      expect(result).toEqual(validData);

      // Invalid
      expect(() =>
        pipe.transform({
          password: 'secret123',
          confirmPassword: 'different',
        }),
      ).toThrow(BadRequestException);
    });

    it('should handle transform', () => {
      // Arrange
      const schema = z.object({
        email: z
          .string()
          .email()
          .transform((val) => val.toLowerCase()),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act
      const result = pipe.transform({ email: 'USER@EXAMPLE.COM' });

      // Assert: Email should be transformed to lowercase
      expect(result.email).toBe('user@example.com');
    });
  });

  describe('enum validation', () => {
    it('should validate enum values', () => {
      // Arrange
      const schema = z.object({
        role: z.enum(['admin', 'manager', 'employee']),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: Valid
      const validResult = pipe.transform({ role: 'admin' });
      expect(validResult.role).toBe('admin');

      // Invalid
      expect(() => pipe.transform({ role: 'invalid-role' })).toThrow(BadRequestException);
    });
  });

  describe('union types', () => {
    it('should validate union types', () => {
      // Arrange
      const schema = z.object({
        value: z.union([z.string(), z.number()]),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: Valid string
      const stringResult = pipe.transform({ value: 'text' });
      expect(stringResult.value).toBe('text');

      // Valid number
      const numberResult = pipe.transform({ value: 123 });
      expect(numberResult.value).toBe(123);

      // Invalid
      expect(() => pipe.transform({ value: true })).toThrow(BadRequestException);
    });
  });

  describe('date validation', () => {
    it('should validate date strings', () => {
      // Arrange
      const schema = z.object({
        date: z.string().datetime(),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert: Valid
      const validResult = pipe.transform({ date: '2025-01-06T00:00:00Z' });
      expect(validResult.date).toBe('2025-01-06T00:00:00Z');

      // Invalid
      expect(() => pipe.transform({ date: 'not-a-date' })).toThrow(BadRequestException);
    });

    it('should coerce strings to dates', () => {
      // Arrange
      const schema = z.object({
        date: z.coerce.date(),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act
      const result = pipe.transform({ date: '2025-01-06' });

      // Assert: Should be converted to Date
      expect(result.date).toBeInstanceOf(Date);
    });
  });

  describe('error handling', () => {
    it('should format multiple validation errors', () => {
      // Arrange
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
        username: z.string().min(3),
      });

      const pipe = new ZodValidationPipe(schema);
      const invalidData = {
        email: 'invalid',
        age: 15,
        username: 'ab',
      };

      // Act & Assert
      try {
        pipe.transform(invalidData);
        expect.fail('Should have thrown');
      } catch (error) {
        const response = (error as BadRequestException).getResponse() as any;
        expect(response.message).toContain('email');
        expect(response.message).toContain('age');
        expect(response.message).toContain('username');
      }
    });

    it('should handle missing required fields', () => {
      // Arrange
      const schema = z.object({
        required: z.string(),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert
      expect(() => pipe.transform({})).toThrow(BadRequestException);
    });

    it('should handle unexpected fields with strict mode', () => {
      // Arrange
      const schema = z
        .object({
          allowed: z.string(),
        })
        .strict();

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert
      expect(() =>
        pipe.transform({
          allowed: 'value',
          unexpected: 'field',
        }),
      ).toThrow(BadRequestException);
    });

    it('should handle null input', () => {
      // Arrange
      const schema = z.object({
        field: z.string(),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert
      expect(() => pipe.transform(null)).toThrow(BadRequestException);
    });

    it('should handle undefined input', () => {
      // Arrange
      const schema = z.object({
        field: z.string(),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert
      expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
    });

    it('should provide fallback error message when no errors array', () => {
      // Arrange
      const schema = z.object({
        field: z.string(),
      });

      const pipe = new ZodValidationPipe(schema);

      // Act & Assert
      try {
        pipe.transform({ field: 123 });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        expect(response.error).toBe('Validation failed');
        expect(response.message).toBeDefined();
      }
    });
  });

  describe('real-world schemas', () => {
    it('should validate login DTO', () => {
      // Arrange: Mimicking real login schema
      const loginSchema = z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        tenantId: z.string().uuid('Invalid tenant ID').optional(),
      });

      const pipe = new ZodValidationPipe(loginSchema);

      // Act & Assert: Valid
      const validResult = pipe.transform({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(validResult.email).toBe('user@example.com');

      // Invalid email
      expect(() =>
        pipe.transform({
          email: 'invalid',
          password: 'password123',
        }),
      ).toThrow(BadRequestException);

      // Invalid password
      expect(() =>
        pipe.transform({
          email: 'user@example.com',
          password: 'short',
        }),
      ).toThrow(BadRequestException);
    });

    it('should validate time entry DTO', () => {
      // Arrange: Mimicking time entry schema
      const timeEntrySchema = z.object({
        userId: z.string().uuid(),
        projectId: z.string().uuid(),
        hours: z.number().min(0).max(24),
        dayOfWeek: z.number().int().min(0).max(6),
        note: z.string().optional(),
      });

      const pipe = new ZodValidationPipe(timeEntrySchema);

      // Act & Assert: Valid
      const validData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        projectId: '123e4567-e89b-12d3-a456-426614174001',
        hours: 8,
        dayOfWeek: 1,
      };
      const result = pipe.transform(validData);
      expect(result.hours).toBe(8);

      // Invalid hours (too high)
      expect(() =>
        pipe.transform({
          ...validData,
          hours: 25,
        }),
      ).toThrow(BadRequestException);

      // Invalid dayOfWeek
      expect(() =>
        pipe.transform({
          ...validData,
          dayOfWeek: 7,
        }),
      ).toThrow(BadRequestException);
    });
  });
});
