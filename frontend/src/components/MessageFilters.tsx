"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatOfficeLabel } from "@/lib/offices";
import { cn } from "@/lib/utils";
import type { OfficeInfo } from "@/lib/types";

type MessageFiltersProps = {
  offices: OfficeInfo[];
};

export function MessageFilters({ offices }: MessageFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [awipsId, setAwipsId] = useState(() => searchParams.get("awips_id") ?? "");
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [productCategory, setProductCategory] = useState(
    () => searchParams.get("product_category") ?? "",
  );

  const debouncedAwipsId = useDebouncedValue(awipsId);
  const debouncedQuery = useDebouncedValue(query);
  const debouncedProductCategory = useDebouncedValue(productCategory);

  const searchKey = searchParams.toString();

  useEffect(() => {
    if (
      awipsId !== debouncedAwipsId ||
      query !== debouncedQuery ||
      productCategory !== debouncedProductCategory
    ) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync inputs when URL changes externally
    setAwipsId(searchParams.get("awips_id") ?? "");
    setQuery(searchParams.get("q") ?? "");
    setProductCategory(searchParams.get("product_category") ?? "");
    // Sync text inputs when URL changes externally (selects, pagination, navigation).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchKey captures non-text param changes
  }, [searchKey]);

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
        const queryString = params.toString();
        router.push(queryString ? `${pathname}?${queryString}` : pathname);
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const next = debouncedAwipsId.trim();
    const current = searchParams.get("awips_id") ?? "";
    if (next !== current) {
      updateFilter("awips_id", next);
    }
  }, [debouncedAwipsId, searchParams, updateFilter]);

  useEffect(() => {
    const next = debouncedQuery.trim();
    const current = searchParams.get("q") ?? "";
    if (next !== current) {
      updateFilter("q", next);
    }
  }, [debouncedQuery, searchParams, updateFilter]);

  useEffect(() => {
    const next = debouncedProductCategory.trim();
    const current = searchParams.get("product_category") ?? "";
    if (next !== current) {
      updateFilter("product_category", next);
    }
  }, [debouncedProductCategory, searchParams, updateFilter]);

  return (
    <form
      className={cn(
        "grid gap-4 rounded-xl border border-border bg-surface-raised p-4 transition-opacity md:grid-cols-2 lg:grid-cols-4",
        isPending && "opacity-70",
      )}
      onSubmit={(event) => event.preventDefault()}
      aria-busy={isPending}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-secondary">Office</span>
        <Select
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
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-secondary">AWIPS ID</span>
        <Input
          type="text"
          className="uppercase"
          placeholder="e.g. TORBOU"
          value={awipsId}
          onChange={(event) => setAwipsId(event.target.value)}
          disabled={isPending}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-secondary">Search</span>
        <Input
          type="search"
          placeholder="Summary or body text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={isPending}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-secondary">Product type</span>
        <Input
          type="text"
          className="uppercase"
          placeholder="e.g. TOR, FFA, HSF"
          value={productCategory}
          onChange={(event) => setProductCategory(event.target.value)}
          disabled={isPending}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-secondary">Class</span>
        <Select
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
        </Select>
      </label>

      <label className="flex min-h-11 items-center gap-2 text-sm md:col-span-2 lg:col-span-4">
        <Checkbox
          defaultChecked={searchParams.get("alerts_only") === "true"}
          onChange={(event) =>
            updateFilter("alerts_only", event.target.checked ? "true" : "")
          }
          disabled={isPending}
        />
        <span>Alerts only (warnings & watches)</span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-secondary">Received since (UTC)</span>
        <Input
          type="datetime-local"
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
