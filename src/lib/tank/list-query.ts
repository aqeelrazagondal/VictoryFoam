export type ListSort = "name" | "newest" | "oldest" | "qty";

export function filterByQuery<T>(items: T[], q: string, text: (item: T) => string): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) => text(item).toLowerCase().includes(needle));
}

export function sortBy<T>(
  items: T[],
  sort: ListSort,
  value: (item: T) => string | number,
): T[] {
  const copy = [...items];
  copy.sort((left, right) => {
    const a = value(left);
    const b = value(right);
    if (typeof a === "number" && typeof b === "number") {
      return sort === "newest" ? b - a : a - b;
    }
    const compared = String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
    if (sort === "newest" || sort === "oldest") {
      return sort === "newest" ? -compared : compared;
    }
    return compared;
  });
  return copy;
}

export function chemicalSearchText(name: string, extra?: string | null) {
  return extra ? `${name} ${extra}` : name;
}
