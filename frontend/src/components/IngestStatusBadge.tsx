import type { IngestStatus } from "@/lib/types";

type IngestStatusBadgeProps = {
  status: IngestStatus | null;
};

export function IngestStatusBadge({ status }: IngestStatusBadgeProps) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1 text-sm text-text-secondary">
        <span className="h-2 w-2 rounded-full bg-text-tertiary" aria-hidden />
        Ingest status unknown
      </span>
    );
  }

  const connected = status.connected;
  const hasGap = status.gap_detected;
  const label = connected
    ? hasGap
      ? "Connected — gap detected"
      : "Connected"
    : status.last_error
      ? "Disconnected"
      : "Disconnected";

  const dotColor = connected ? (hasGap ? "bg-warning" : "bg-success") : "bg-error";

  return (
    <div className="flex flex-col gap-1">
      <span
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1 text-sm"
        role="status"
        aria-live="polite"
      >
        <span className={`h-2 w-2 rounded-full ${dotColor}`} aria-hidden />
        {label}
      </span>
      {status.last_error && !connected && (
        <p className="text-sm text-error">{status.last_error}</p>
      )}
      {hasGap && status.last_gap_detail && (
        <p className="text-sm text-warning">{status.last_gap_detail}</p>
      )}
    </div>
  );
}
