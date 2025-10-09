import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      const zodError = error as {
        errors?: Array<{ path: Array<string | number>; message: string }>;
      };
      throw new BadRequestException({
        statusCode: 400,
        error: 'Validation failed',
        message:
          zodError.errors?.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ') ||
          'Invalid input',
      });
    }
  }
}
