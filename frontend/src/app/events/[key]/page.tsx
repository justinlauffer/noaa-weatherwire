import Link from "next/link";
import { notFound } from "next/navigation";

import { VtecActionBadge } from "@/components/VtecActionBadge";
import { formatDateTime, getEvent } from "@/lib/api";

type EventDetailPageProps = {
  params: Promise<{ key: string }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { key } = await params;
  const eventKey = decodeURIComponent(key);

  let event;
  try {
    event = await getEvent(eventKey);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <Link href="/events" className="text-sm text-primary hover:underline">
          Back to VTEC events
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {event.phenomena_label} {event.significance_label}
        </h1>
        <p className="mt-2 font-mono text-sm text-text-secondary">{event.event_key}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <VtecActionBadge action={event.latest_action} label={event.latest_action_label} />
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              event.is_active
                ? "bg-warning/10 text-warning"
                : "bg-surface-raised text-text-secondary"
            }`}
          >
            {event.is_active ? "Active" : "Ended"}
          </span>
          <span className="text-sm text-text-secondary">
            {event.message_count} bulletin{event.message_count === 1 ? "" : "s"}
          </span>
        </div>
        {event.office_name && (
          <p className="mt-2 text-sm text-text-secondary">
            {event.office} — {event.office_name.replace(/^NWS Forecast Office /, "")}
          </p>
        )}
      </div>

      {event.ugc_zones.length > 0 && (
        <section className="rounded-xl border border-border bg-surface-raised p-4">
          <h2 className="mb-3 text-sm font-medium text-text-secondary">Affected zones</h2>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {event.ugc_zones.map((zone) => (
              <li key={zone.code}>
                <span className="font-mono text-xs">{zone.code}</span>
                <span className="text-text-secondary"> — {zone.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-border">
        <h2 className="border-b border-border px-4 py-3 text-sm font-medium text-text-secondary">
          Event timeline
        </h2>
        <ol className="divide-y divide-border">
          {event.timeline.map((entry) => (
            <li key={`${entry.weather_message_id}-${entry.vtec_raw}`} className="px-4 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <time className="font-mono text-xs">{formatDateTime(entry.issued_at)}</time>
                <VtecActionBadge action={entry.action} label={entry.action_label} />
                <span className="text-xs text-text-secondary">{entry.issuing_office}</span>
              </div>
              <p className="mt-2 text-sm">
                <Link
                  href={`/messages/${entry.weather_message_id}`}
                  className="text-primary hover:underline"
                >
                  {entry.summary}
                </Link>
              </p>
              {entry.end_time && (
                <p className="mt-1 font-mono text-xs text-text-tertiary">
                  Valid through {entry.end_time}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
