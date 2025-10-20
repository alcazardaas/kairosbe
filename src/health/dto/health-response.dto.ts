import { ApiProperty } from '@nestjs/swagger';

// ===== Entity DTOs =====

export class HealthCheckDto {
  @ApiProperty({
    description: 'Whether the service is healthy',
    example: true,
  })
  ok: boolean;

  @ApiProperty({
    description: 'Current timestamp',
    example: '2025-01-20T12:00:00.000Z',
  })
  ts: string;

  @ApiProperty({
    description: 'Database connection status',
    example: 'connected',
    enum: ['connected', 'disconnected'],
  })
  database: string;

  @ApiProperty({
    description: 'Error message if health check failed',
    example: 'Connection timeout',
    required: false,
  })
  error?: string;
}
