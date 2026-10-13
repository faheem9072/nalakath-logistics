/**
 * Generates and downloads CSV file from an array of record objects with UTF-8 BOM
 * ensuring Excel and Google Sheets render all columns and characters cleanly.
 */
export function exportToCSV<T extends object>(
  filename: string,
  rows: T[],
  columnHeaders?: Partial<Record<keyof T, string>>
): void {
  if (!rows || rows.length === 0) {
    alert('No data available to export.');
    return;
  }

  const keys = (
    columnHeaders ? Object.keys(columnHeaders) : Object.keys(rows[0])
  ) as (keyof T)[];

  const headerRow = keys
    .map((key) => {
      const label = columnHeaders?.[key] ? columnHeaders[key] : String(key);
      return `"${String(label).replace(/"/g, '""')}"`;
    })
    .join(',');

  const dataRows = rows.map((row) => {
    return keys
      .map((key) => {
        const val = (row as Record<string, unknown>)[key as string];
        if (val === null || val === undefined) {
          return '""';
        }
        if (Array.isArray(val)) {
          return `"${val.join('; ').replace(/"/g, '""')}"`;
        }
        if (typeof val === 'object') {
          return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers browser print dialog for print-friendly PDF generation
 */
export function triggerPrintReport(): void {
  window.print();
}
