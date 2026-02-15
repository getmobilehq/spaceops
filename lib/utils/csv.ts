/**
 * CSV generation utilities.
 * Handles escaping, BOM for Excel, and row/string construction.
 */

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values.map(escapeCell).join(",");
}

export function toCsvString(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const bom = "\uFEFF";
  const headerLine = toCsvRow(headers);
  const dataLines = rows.map((row) => toCsvRow(row));
  return bom + [headerLine, ...dataLines].join("\r\n");
}
