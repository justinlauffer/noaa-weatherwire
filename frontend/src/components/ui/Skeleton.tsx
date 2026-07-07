import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded bg-surface-raised", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
