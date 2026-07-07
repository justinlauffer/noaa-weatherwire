import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "outline" | "ghost";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "border border-primary bg-primary text-white hover:bg-primary/90 active:bg-primary/80",
  outline:
    "border border-border bg-background text-foreground hover:bg-surface-raised active:bg-surface-raised/80",
  ghost:
    "border border-transparent bg-transparent text-text-secondary hover:bg-surface-raised hover:text-foreground",
};

export function Button({
  variant = "outline",
  className,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:border-disabled-background disabled:bg-disabled-background disabled:text-disabled-foreground",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
