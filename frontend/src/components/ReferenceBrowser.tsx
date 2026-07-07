"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResponsiveDataList, type DataColumn } from "@/components/ui/ResponsiveDataList";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import type { ReferenceCatalog } from "@/lib/types";

type ReferenceBrowserProps = {
  catalog: ReferenceCatalog;
};

type ReferenceRow = {
  code: string;
  name: string;
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

  const activeItems = tab === "products" ? filteredProducts : filteredOffices;

  const columns: DataColumn<ReferenceRow>[] = [
    {
      key: "code",
      header: "Code",
      className: "font-mono",
      render: (item) => item.code,
    },
    {
      key: "name",
      header: "Name",
      render: (item) => item.name,
    },
  ];

  const tabs = [
    { id: "products" as const, label: `Products (${catalog.product_types.length})` },
    { id: "offices" as const, label: `Offices (${catalog.offices.length})` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reference"
        description="NWS AWIPS product codes and forecast office identifiers."
      />

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-raised p-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-text-secondary">Search</span>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by code or name"
          />
        </label>
        <Tabs tabs={tabs} activeTab={tab} onTabChange={setTab} />
      </div>

      <TabPanel id={`tabpanel-${tab}`} labelledBy={`tab-${tab}`}>
        {activeItems.length === 0 ? (
          <EmptyState
            title="No matches found"
            description={
              normalizedQuery
                ? `No results for "${query.trim()}". Try a different search term.`
                : "No items to display."
            }
          />
        ) : (
          <ResponsiveDataList
            items={activeItems}
            columns={columns}
            getRowKey={(item) => item.code}
          />
        )}
      </TabPanel>
    </div>
  );
}
