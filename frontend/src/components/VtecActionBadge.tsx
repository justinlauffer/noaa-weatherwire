const ACTION_STYLES: Record<string, string> = {
  NEW: "border-error/40 bg-error/10 text-error",
  CON: "border-warning/40 bg-warning/10 text-warning",
  EXT: "border-warning/40 bg-warning/10 text-warning",
  UPG: "border-error/40 bg-error/10 text-error",
  CAN: "border-border bg-surface-raised text-text-tertiary",
  EXP: "border-border bg-surface-raised text-text-tertiary",
  COR: "border-primary/40 bg-primary/10 text-primary",
  ROU: "border-border bg-surface-raised text-text-secondary",
};

type VtecActionBadgeProps = {
  action: string;
  label?: string;
};

export function VtecActionBadge({ action, label }: VtecActionBadgeProps) {
  const style = ACTION_STYLES[action] ?? "border-border bg-surface-raised text-text-secondary";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${style}`}>
      {label ?? action}
    </span>
  );
}

export function getPrimaryVtecAction(
  parsedMetadata: { vtec?: Array<{ action: string; action_label?: string }> } | null | undefined,
): { action: string; label: string } | null {
  const vtec = parsedMetadata?.vtec?.[0];
  if (!vtec?.action) {
    return null;
  }
  return {
    action: vtec.action,
    label: vtec.action_label ?? vtec.action,
  };
}
