"use client";

type OfficeCellProps = {
  code: string;
  name?: string | null;
};

export function OfficeCell({ code, name }: OfficeCellProps) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-sm">{code}</div>
      {name && (
        <div className="truncate text-xs text-text-secondary" title={name}>
          {name.replace(/^NWS Forecast Office /, "")}
        </div>
      )}
    </div>
  );
}
