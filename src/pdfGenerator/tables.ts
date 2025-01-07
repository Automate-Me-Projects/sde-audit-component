import { jsPDF } from 'jspdf';
import { TableRow } from '../types';
import { MARGIN_X, CONTENT_WIDTH, HEADER_HEIGHT, HEADER_BG_COLOR } from './constants';

export const addInfoTable = (doc: jsPDF, rows: TableRow[], title?: string, startY: number = HEADER_HEIGHT + 10) => {
  if (title) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(HEADER_BG_COLOR[0], HEADER_BG_COLOR[1], HEADER_BG_COLOR[2]); // Green color for titles
    doc.text(title, MARGIN_X, startY);
    startY += 10;
  }

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  // Calculate table dimensions
  const tableWidth = CONTENT_WIDTH * 0.9; // Use 90% of content width
  const labelWidth = tableWidth * 0.3; // 30% for label
  const valueWidth = tableWidth * 0.7; // 70% for value
  
  // Center the table by calculating left margin
  const tableMarginX = MARGIN_X + (CONTENT_WIDTH - tableWidth) / 2;

  rows.forEach(row => {
    // Split text for both columns
    const label = String(row.label || '');
    const value = String(row.value || '');
    
    const labelLines = doc.splitTextToSize(label, labelWidth - 4);
    const valueLines = doc.splitTextToSize(value, valueWidth - 4);
    
    // Calculate the maximum number of lines needed
    const maxLines = Math.max(labelLines.length, valueLines.length);
    const actualRowHeight = Math.max(7, maxLines * 3.5 + 5);
    
    // Draw label cell
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(240, 240, 240);
    doc.rect(tableMarginX, startY - 3, labelWidth, actualRowHeight, 'FD');
    
    // Draw value cell
    doc.setFillColor(255, 255, 255);
    doc.rect(tableMarginX + labelWidth, startY - 3, valueWidth, actualRowHeight, 'FD');
    
    // Add text with vertical centering
    const textStartY = startY + (5 / 2);
    doc.text(labelLines, tableMarginX + 2, textStartY);
    doc.text(valueLines, tableMarginX + labelWidth + 2, textStartY);

    startY += actualRowHeight + 2; // Small gap between rows
  });

  return startY;
};
