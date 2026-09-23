"use client";

import { Button } from "@/components/ui/button";

type ListPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  label: string;
};

export function ListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  label,
}: ListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  return (
    <nav
      aria-label={label}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total === 0
          ? "No items"
          : `Showing ${from}–${to} of ${total} · Page ${current} of ${totalPages}`}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="touch"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
          aria-label="Previous page"
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="touch"
          disabled={current >= totalPages}
          onClick={() => onPageChange(current + 1)}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
