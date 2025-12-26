// src/utils/exportToCSV.ts

export function exportToCSV(filename: string, rows: any[]) {
  if (!rows || rows.length === 0) {
    console.warn("No data to export.");
    return;
  }

  // Extract headers
  const headers = Object.keys(rows[0]);

  const csvContent = [
    headers.join(","), // header line
    ...rows.map((row) =>
      headers
        .map((h) => {
          let val = row[h];

          if (val === null || val === undefined) return "";

          if (typeof val === "string") {
            // escape quotes
            val = val.replace(/"/g, '""');
            return `"${val}"`;
          }

          return val;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}
