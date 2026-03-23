// =============================================================================
// BMS Session KPI Dashboard - Export Utilities
// Excel and PDF Export Support (Thai font aware)
// =============================================================================

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ---------------------------------------------------------------------------
// Excel Export
// ---------------------------------------------------------------------------

/**
 * Export data to an Excel file (.xlsx)
 * 
 * @param data - Array of objects to export
 * @param fileName - Target filename without extension
 * @param sheetName - Name of the worksheet
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Create binary string and save
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

// ---------------------------------------------------------------------------
// PDF Export (Basic - Note: Thai characters require embedded font)
// ---------------------------------------------------------------------------

interface PdfColumn {
  header: string;
  dataKey: string;
}

/**
 * Export data to a PDF file (.pdf)
 * 
 * Note: Default jsPDF fonts don't support Thai characters. 
 * This uses the autotable plugin with default settings.
 * 
 * @param title - Title shown at the top of the PDF
 * @param columns - Mapping of data keys to headers
 * @param data - Data array
 * @param fileName - Target filename
 */
export function exportToPdf(title: string, columns: PdfColumn[], data: any[], fileName: string) {
  const doc = new jsPDF();
  
  // Add Title
  doc.setFontSize(16);
  // Default font doesn't support Thai well, so we use it as-is for now
  // In a real production app, we would add doc.addFileToVFS('font.ttf', base64)
  doc.text(title, 14, 15);
  
  // Add Timestamp
  doc.setFontSize(10);
  doc.text(`Exported on: ${new Date().toLocaleString()}`, 14, 22);

  // Generate Table
  autoTable(doc, {
    startY: 28,
    head: [columns.map(c => c.header)],
    body: data.map(row => columns.map(c => row[c.dataKey])),
    styles: { 
      font: 'helvetica', // Default, won't show Thai correctly without custom font
      fontSize: 8,
      cellPadding: 2 
    },
    headStyles: { 
      fillColor: [59, 130, 246], // Blue-500
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Slate-50
    }
  });

  doc.save(`${fileName}.pdf`);
}
