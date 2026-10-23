import type { CellValue, QueryResult } from '../database/types';

export function cellText(value: CellValue) {
  return value === null ? 'NULL' : String(value);
}

function quoteCell(value: string, delimiter: string) {
  return value.includes(delimiter) || /["\r\n]/.test(value)
    ? `"${value.replaceAll('"', '""')}"` : value;
}

export function resultText(result: QueryResult, format: 'csv' | 'tsv') {
  const delimiter = format === 'csv' ? ',' : '\t';
  const rows: CellValue[][] = [result.columns, ...result.values];
  return rows.map((row) => row.map((value) => {
    // Prevent spreadsheet applications treating exported text as formulas.
    const raw = cellText(value);
    const text = typeof value === 'string' && /^\s*[=+@-]/.test(value) ? `'${raw}` : raw;
    return quoteCell(text, delimiter);
  }).join(delimiter)).join('\r\n');
}
