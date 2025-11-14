import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../guards/auth.guard';

/**
 * Decorator to get the current authenticated user from the request
 */
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user;
});

/**
 * Decorator to get the current session from the request
 */
export const CurrentSession = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.session;
});

/**
 * Decorator to get the current tenant ID from the request
 */
export const CurrentTenantId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.tenantId;
});

/**
 * Decorator to get the current user ID from the request
 */
export const CurrentUserId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.session?.userId;
});
