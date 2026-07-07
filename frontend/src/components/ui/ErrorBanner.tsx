import { cn } from "@/lib/utils";

type ErrorBannerProps = {
  message: string;
  className?: string;
};

export function ErrorBanner({ message, className }: ErrorBannerProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-error bg-surface-raised px-4 py-3 text-sm text-error",
        className,
      )}
      role="alert"
    >
      {message}
    </div>
  );
}
