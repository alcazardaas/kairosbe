import { PaginatedResponse } from '../types/pagination.types';

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}
