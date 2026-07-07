"use client";

import { useMemo, useState } from "react";

import type { ReferenceCatalog } from "@/lib/types";

type ReferenceBrowserProps = {
  catalog: ReferenceCatalog;
};

export function ReferenceBrowser({ catalog }: ReferenceBrowserProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"products" | "offices">("products");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredProducts = useMemo(() => {
    if (!normalizedQuery) {
      return catalog.product_types;
    }
    return catalog.product_types.filter(
      (product) =>
        product.code.toLowerCase().includes(normalizedQuery) ||
        product.name.toLowerCase().includes(normalizedQuery),
    );
  }, [catalog.product_types, normalizedQuery]);

  const filteredOffices = useMemo(() => {
    if (!normalizedQuery) {
      return catalog.offices;
    }
    return catalog.offices.filter(
      (office) =>
        office.code.toLowerCase().includes(normalizedQuery) ||
        office.name.toLowerCase().includes(normalizedQuery),
    );
  }, [catalog.offices, normalizedQuery]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reference</h1>
        <p className="mt-1 text-sm text-text-secondary">
          NWS AWIPS product codes and forecast office identifiers.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-raised p-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-text-secondary">Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by code or name"
            className="rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("products")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === "products" ? "bg-primary text-white" : "border border-border"
            }`}
          >
            Products ({catalog.product_types.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("offices")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === "offices" ? "bg-primary text-white" : "border border-border"
            }`}
          >
            Offices ({catalog.offices.length})
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-surface-raised text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {tab === "products"
              ? filteredProducts.map((product) => (
                  <tr key={product.code}>
                    <td className="px-4 py-3 font-mono">{product.code}</td>
                    <td className="px-4 py-3">{product.name}</td>
                  </tr>
                ))
              : filteredOffices.map((office) => (
                  <tr key={office.code}>
                    <td className="px-4 py-3 font-mono">{office.code}</td>
                    <td className="px-4 py-3">{office.name}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
