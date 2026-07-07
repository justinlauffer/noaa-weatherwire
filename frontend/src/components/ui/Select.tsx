import { cn } from "@/lib/utils";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:bg-disabled-background disabled:text-disabled-foreground",
        className,
      )}
      {...props}
    />
  );
}
