export type OfficeInfo = {
  code: string;
  name: string | null;
};

export function formatOfficeLabel(code: string, name?: string | null): string {
  if (!name) {
    return code;
  }
  const shortName = name.replace(/^NWS Forecast Office /, "");
  return `${code} — ${shortName}`;
}
