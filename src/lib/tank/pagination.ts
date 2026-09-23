export const TANK_LIST_PAGE_SIZE = 10;

export type PageResult<T> = {
  rows: T[];
  total: number;
};

/** Pure page slice used by the local-storage repository boundary (and unit tests). */
export function pageOf<T>(items: T[], page: number, pageSize: number): PageResult<T> {
  const size = Math.max(1, Math.floor(pageSize) || 1);
  const safePage = Math.max(1, Math.floor(page) || 1);
  const total = items.length;
  const start = (safePage - 1) * size;
  return { rows: items.slice(start, start + size), total };
}

export function pageRange(page: number, pageSize: number) {
  const size = Math.max(1, Math.floor(pageSize) || 1);
  const safePage = Math.max(1, Math.floor(page) || 1);
  const from = (safePage - 1) * size;
  return { from, to: from + size - 1, pageSize: size, page: safePage };
}
