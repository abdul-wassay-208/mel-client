import { Button } from '@/components/ui/button';

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const go = (p: number) => onPageChange(Math.max(1, Math.min(totalPages, p)));

  return (
    <div className={className ?? ''}>
      <div className="flex items-center justify-between pt-2">
        <p className="text-[12px] text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => go(page - 1)}
            className="rounded-lg text-[12px]"
          >
            Previous
          </Button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => go(i + 1)}
              className={`h-8 w-8 rounded-lg text-[12px] font-medium transition-colors ${
                page === i + 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground'
              }`}
              aria-current={page === i + 1 ? 'page' : undefined}
            >
              {i + 1}
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => go(page + 1)}
            className="rounded-lg text-[12px]"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

