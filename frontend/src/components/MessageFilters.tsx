"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

import { formatOfficeLabel } from "@/lib/offices";
import type { OfficeInfo } from "@/lib/types";

type MessageFiltersProps = {
  offices: OfficeInfo[];
};

export function MessageFilters({ offices }: MessageFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`/?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  return (
    <form
      className="grid gap-4 rounded-xl border border-border bg-surface-raised p-4 md:grid-cols-2 lg:grid-cols-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-secondary">Office</span>
        <select
          className="rounded-lg border border-border bg-background px-3 py-2"
          value={searchParams.get("office") ?? ""}
          onChange={(event) => updateFilter("office", event.target.value)}
          disabled={isPending}
        >
          <option value="">All offices</option>
          {offices.map((office) => (
            <option key={office.code} value={office.code}>
              {formatOfficeLabel(office.code, office.name)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-secondary">AWIPS ID</span>
        <input
          type="text"
          className="rounded-lg border border-border bg-background px-3 py-2 uppercase"
          placeholder="e.g. TORBOU"
          defaultValue={searchParams.get("awips_id") ?? ""}
          onBlur={(event) => updateFilter("awips_id", event.target.value.trim())}
          disabled={isPending}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-secondary">Search</span>
        <input
          type="search"
          className="rounded-lg border border-border bg-background px-3 py-2"
          placeholder="Summary or body text"
          defaultValue={searchParams.get("q") ?? ""}
          onBlur={(event) => updateFilter("q", event.target.value.trim())}
          disabled={isPending}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-secondary">Product type</span>
        <input
          type="text"
          className="rounded-lg border border-border bg-background px-3 py-2 uppercase"
          placeholder="e.g. TOR, FFA, HSF"
          defaultValue={searchParams.get("product_category") ?? ""}
          onBlur={(event) => updateFilter("product_category", event.target.value.trim())}
          disabled={isPending}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-secondary">Class</span>
        <select
          className="rounded-lg border border-border bg-background px-3 py-2"
          value={searchParams.get("product_class") ?? ""}
          onChange={(event) => updateFilter("product_class", event.target.value)}
          disabled={isPending}
        >
          <option value="">All classes</option>
          <option value="warning">Warnings</option>
          <option value="watch">Watches</option>
          <option value="advisory">Advisories</option>
          <option value="statement">Statements</option>
          <option value="forecast">Forecasts</option>
          <option value="marine">Marine</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm md:col-span-2 lg:col-span-4">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border"
          defaultChecked={searchParams.get("alerts_only") === "true"}
          onChange={(event) =>
            updateFilter("alerts_only", event.target.checked ? "true" : "")
          }
          disabled={isPending}
        />
        <span>Alerts only (warnings & watches)</span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-secondary">Since (UTC)</span>
        <input
          type="datetime-local"
          className="rounded-lg border border-border bg-background px-3 py-2"
          defaultValue={searchParams.get("since")?.slice(0, 16) ?? ""}
          onBlur={(event) => {
            const value = event.target.value
              ? new Date(event.target.value).toISOString()
              : "";
            updateFilter("since", value);
          }}
          disabled={isPending}
        />
      </label>
    </form>
  );
}
