import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  hasMore: boolean;
  onPrevious: () => void;
  onNext: () => void;
  loading?: boolean;
  className?: string;
};

export function Pagination({
  page,
  hasMore,
  onPrevious,
  onNext,
  loading = false,
  className,
}: PaginationProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <Button
        variant="outline"
        className="w-full sm:w-auto"
        disabled={page <= 1 || loading}
        onClick={onPrevious}
      >
        Previous
      </Button>
      <span className="text-center text-sm text-text-secondary" aria-live="polite">
        Page {page}
        {loading && <span className="ml-2 text-text-tertiary">Loading…</span>}
      </span>
      <Button
        variant="outline"
        className="w-full sm:w-auto"
        disabled={!hasMore || loading}
        onClick={onNext}
      >
        Next
      </Button>
    </div>
  );
}
