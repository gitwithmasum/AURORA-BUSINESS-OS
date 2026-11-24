import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export function exportRowsToCsv<T extends object>(
  filename: string,
  rows: T[]
) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function exportRowsToExcel<T extends object>(
  filename: string,
  sheetName: string,
  rows: T[]
) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 30));
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export async function parseSpreadsheetFile(file: File): Promise<{
  rows: Record<string, unknown>[];
  duplicates: string[];
}> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    defval: "",
  });

  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const row of rows) {
    const sku = String(row.sku ?? row.SKU ?? "").trim();
    if (!sku) continue;
    if (seen.has(sku.toUpperCase())) {
      duplicates.push(sku);
    } else {
      seen.add(sku.toUpperCase());
    }
  }
  return { rows, duplicates };
}

export function exportDocumentPdf(params: {
  title: string;
  subtitle?: string;
  businessName: string;
  businessAddress?: string;
  businessContact?: string;
  meta: { label: string; value: string }[];
  columns: string[];
  rows: (string | number)[][];
  totals?: { label: string; value: string }[];
  footerNote?: string;
  filename: string;
}) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(params.businessName || "AURORA BUSINESS OS", 14, 18);
  doc.setFontSize(9);
  doc.setTextColor(100);
  if (params.businessAddress) doc.text(params.businessAddress, 14, 24);
  if (params.businessContact) doc.text(params.businessContact, 14, 29);

  doc.setFontSize(14);
  doc.setTextColor(20);
  doc.text(params.title, 196, 18, { align: "right" });
  if (params.subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(params.subtitle, 196, 24, { align: "right" });
  }

  let y = 38;
  doc.setFontSize(9);
  doc.setTextColor(30);
  for (const item of params.meta) {
    doc.text(`${item.label}: ${item.value}`, 14, y);
    y += 5;
  }

  autoTable(doc, {
    startY: y + 3,
    head: [params.columns],
    body: params.rows,
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [17, 33, 45] },
  });

  const finalY =
    ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
      ?.finalY ?? y + 30) + 8;

  let ty = finalY;
  if (params.totals) {
    doc.setFontSize(10);
    for (const t of params.totals) {
      doc.text(`${t.label}: ${t.value}`, 196, ty, { align: "right" });
      ty += 6;
    }
  }

  if (params.footerNote) {
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text(params.footerNote, 14, ty + 6);
  }

  doc.save(
    params.filename.endsWith(".pdf") ? params.filename : `${params.filename}.pdf`
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
