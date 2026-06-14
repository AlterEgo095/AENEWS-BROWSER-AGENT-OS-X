/**
 * AENEWS Agent OS X — Phase 13: Cursor Pagination Utility
 *
 * Efficient cursor-based pagination for large datasets.
 * Avoids OFFSET which becomes O(n) for large tables.
 * Uses keyset pagination on indexed columns.
 */

export interface CursorPage<T> {
  data: T[];
  pagination: {
    cursor: string | null;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    totalApprox?: number;
  };
}

export interface CursorPaginationOptions {
  cursor?: string | null;
  limit?: number;
  order?: 'ASC' | 'DESC';
  cursorColumn?: string;
  where?: Record<string, any>;
}

export interface DecodedCursor {
  value: string;
  column: string;
  order: 'ASC' | 'DESC';
  id: string;
}

export function encodeCursor(data: DecodedCursor): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

export function decodeCursor(cursor: string): DecodedCursor | null {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
    if (!decoded.value || !decoded.column || !decoded.id) return null;
    return decoded as DecodedCursor;
  } catch {
    return null;
  }
}

export function buildCursorWhere(
  cursor: DecodedCursor | null,
  cursorColumn: string = 'created_at',
  order: 'ASC' | 'DESC' = 'DESC',
): Array<Record<string, any>> {
  if (!cursor) return [];
  const direction = order === 'ASC' ? 'MoreThanOrEqual' : 'LessThanOrEqual';
  return [{ [cursorColumn]: { [direction]: cursor.value } }];
}

export function createCursorPage<T extends { id?: string }>(
  items: T[],
  limit: number,
  cursorColumn: string = 'created_at',
  order: 'ASC' | 'DESC' = 'DESC',
): CursorPage<T> {
  const hasNextPage = items.length > limit;
  const data = hasNextPage ? items.slice(0, limit) : items;
  const lastItem = data[data.length - 1];
  let cursor: string | null = null;

  if (lastItem && hasNextPage) {
    const cursorValue = (lastItem as any)[cursorColumn];
    cursor = encodeCursor({
      value: cursorValue instanceof Date ? cursorValue.toISOString() : String(cursorValue),
      column: cursorColumn,
      order,
      id: lastItem.id || '',
    });
  }

  return {
    data,
    pagination: {
      cursor,
      hasNextPage,
      hasPreviousPage: false,
    },
  };
}

export interface OffsetPage<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function createOffsetPage<T>(
  items: T[],
  totalItems: number,
  page: number,
  limit: number,
): OffsetPage<T> {
  const totalPages = Math.ceil(totalItems / limit);
  return {
    data: items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
