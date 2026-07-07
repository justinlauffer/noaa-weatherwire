import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import { Card } from "@/components/ui/Card";
import { formatDateTime, getMessage } from "@/lib/api";

type MessageDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getBackLink(from: string | undefined): { href: string; label: string } {
  switch (from) {
    case "alerts":
      return { href: "/alerts", label: "Back to alerts" };
    case "map":
      return { href: "/map", label: "Back to map" };
    case "events":
      return { href: "/events", label: "Back to VTEC events" };
    default:
      return { href: "/", label: "Back to feed" };
  }
}

export default async function MessageDetailPage({ params, searchParams }: MessageDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const from = typeof query.from === "string" ? query.from : undefined;
  const backLink = getBackLink(from);

  let message;
  try {
    message = await getMessage(id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <Link
          href={backLink.href}
          className="text-sm text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
        >
          {backLink.label}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{message.summary}</h1>
        <div className="mt-3">
          <ProductTypeBadge
            category={message.product_category}
            typeName={message.product_type_name}
            productClass={message.product_class}
            isAlert={message.is_alert}
          />
          {message.product_type_name && (
            <p className="mt-2 text-sm text-text-secondary">{message.product_type_name}</p>
          )}
        </div>
        <Card className="mt-4 p-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-text-secondary">Issued</dt>
              <dd className="font-mono">{formatDateTime(message.issued_at, { seconds: true })}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Received</dt>
              <dd className="font-mono">{formatDateTime(message.received_at, { seconds: true })}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Office</dt>
              <dd>
                <div className="font-mono">{message.issuing_office}</div>
                {message.issuing_office_name && (
                  <div className="text-sm text-text-secondary">
                    {message.issuing_office_name.replace(/^NWS Forecast Office /, "")}
                  </div>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">AWIPS / WMO</dt>
              <dd className="font-mono">
                {message.awips_id} / {message.wmo_product_id}
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">NWWS ID</dt>
              <dd className="font-mono">{message.nwws_id}</dd>
            </div>
            {message.wmo_heading && (
              <div>
                <dt className="text-text-secondary">WMO heading</dt>
                <dd className="font-mono">{message.wmo_heading}</dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      {message.parsed_metadata && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-medium text-text-secondary">Parsed metadata</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-text-secondary">Format</dt>
              <dd className="font-mono uppercase">{message.parsed_metadata.format}</dd>
            </div>
            {(message.parsed_metadata.ugc_zones?.length ?? 0) > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-text-secondary">UGC zones</dt>
                <dd className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  {message.parsed_metadata.ugc_zones?.map((zone) => (
                    <div key={zone.code}>
                      <span className="font-mono text-xs">{zone.code}</span>
                      <span className="text-text-secondary"> — {zone.name}</span>
                    </div>
                  ))}
                </dd>
              </div>
            )}
            {!message.parsed_metadata.ugc_zones?.length &&
              message.parsed_metadata.ugc_codes.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-text-secondary">UGC codes</dt>
                  <dd className="font-mono text-xs leading-relaxed">
                    {message.parsed_metadata.ugc_codes.join(", ")}
                  </dd>
                </div>
              )}
          </dl>
          {message.parsed_metadata.vtec.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="text-text-secondary">
                  <tr>
                    <th className="px-2 py-1 font-medium">Action</th>
                    <th className="px-2 py-1 font-medium">Phenomena</th>
                    <th className="px-2 py-1 font-medium">Significance</th>
                    <th className="px-2 py-1 font-medium">Office</th>
                    <th className="px-2 py-1 font-medium">ETN</th>
                    <th className="px-2 py-1 font-medium">Valid</th>
                  </tr>
                </thead>
                <tbody>
                  {message.parsed_metadata.vtec.map((entry) => (
                    <tr key={entry.raw} className="border-t border-border">
                      <td className="px-2 py-2">{entry.action_label}</td>
                      <td className="px-2 py-2">{entry.phenomena_label}</td>
                      <td className="px-2 py-2">{entry.significance_label}</td>
                      <td className="px-2 py-2 font-mono">{entry.office}</td>
                      <td className="px-2 py-2 font-mono">{entry.etn}</td>
                      <td className="whitespace-nowrap px-2 py-2 font-mono">
                        {entry.start_time} – {entry.end_time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-medium text-text-secondary">Full bulletin</h2>
        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-relaxed">
          {message.raw_body}
        </pre>
      </Card>
    </div>
  );
}
