import { cn } from "@/lib/utils";

export type DataColumn<T> = {
  key: string;
  header: string;
  className?: string;
  hideOnMobile?: boolean;
  render: (item: T) => React.ReactNode;
  mobileLabel?: string;
};

type ResponsiveDataListProps<T> = {
  items: T[];
  columns: DataColumn<T>[];
  getRowKey: (item: T) => string;
  className?: string;
};

export function ResponsiveDataList<T>({
  items,
  columns,
  getRowKey,
  className,
}: ResponsiveDataListProps<T>) {
  const mobileColumns = columns.filter((column) => !column.hideOnMobile);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border", className)}>
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-raised text-left text-text-secondary">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className={cn("px-4 py-3 font-medium", column.className)}>
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {items.map((item) => (
                <tr key={getRowKey(item)} className="transition-colors hover:bg-surface-raised/60">
                  {columns.map((column) => (
                    <td key={column.key} className={cn("px-4 py-3", column.className)}>
                      {column.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="divide-y divide-border md:hidden">
        {items.map((item) => (
          <div key={getRowKey(item)} className="flex flex-col gap-3 bg-background p-4">
            {mobileColumns.map((column) => (
              <div key={column.key} className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  {column.mobileLabel ?? column.header}
                </span>
                <div className="text-sm">{column.render(item)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
