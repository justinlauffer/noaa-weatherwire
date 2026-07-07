const PRODUCT_CLASS_STYLES: Record<string, string> = {
  warning: "border-error/40 bg-error/10 text-error",
  watch: "border-warning/40 bg-warning/10 text-warning",
  advisory: "border-primary/40 bg-primary/10 text-primary",
  statement: "border-border bg-surface-raised text-text-secondary",
  forecast: "border-border bg-surface-raised text-text-secondary",
  discussion: "border-border bg-surface-raised text-text-secondary",
  marine: "border-primary/30 bg-primary/5 text-primary",
  climate: "border-border bg-surface-raised text-text-secondary",
  admin: "border-border bg-surface-raised text-text-tertiary",
  alert: "border-error/40 bg-error/10 text-error",
  other: "border-border bg-surface-raised text-text-secondary",
};

type ProductTypeBadgeProps = {
  category: string;
  typeName: string | null;
  productClass: string;
  isAlert?: boolean;
};

export function ProductTypeBadge({
  category,
  typeName,
  productClass,
  isAlert = false,
}: ProductTypeBadgeProps) {
  const style = PRODUCT_CLASS_STYLES[productClass] ?? PRODUCT_CLASS_STYLES.other;
  const label = typeName ? `${category} · ${typeName}` : category;

  return (
    <span
      className={`inline-flex max-w-xs items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${style}`}
      title={label}
    >
      {isAlert && <span aria-hidden="true">!</span>}
      <span className="truncate">{category}</span>
    </span>
  );
}
