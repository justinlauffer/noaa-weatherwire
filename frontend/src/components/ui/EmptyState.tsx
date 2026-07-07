import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  className?: string;
};

export function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-lg font-medium">{title}</p>
      <p className="mt-2 text-sm text-text-secondary">{description}</p>
    </div>
  );
}
