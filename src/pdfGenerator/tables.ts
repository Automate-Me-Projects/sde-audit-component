import { jsPDF } from 'jspdf';
import { MARGIN_X, CONTENT_WIDTH } from './constants';

export const addInfoTable = (doc: jsPDF, rows: { label: string; value: string }[], title: string, yPosition: number): number => {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const titleWidth = doc.getTextWidth(title);
  
  const sectionWidth = CONTENT_WIDTH;
  const titleHeight = 8;
  
  // Title with green background
  doc.setFillColor(0, 106, 60);
  doc.rect(MARGIN_X, yPosition - 5, sectionWidth, titleHeight, 'F');
  doc.setTextColor(255, 255, 255);
  const titleX = MARGIN_X + (sectionWidth - titleWidth) / 2;
  doc.text(title, titleX, yPosition);
  
  // Table
  const labelColumnWidth = sectionWidth * 0.25; // 25% for labels
  const valueColumnWidth = sectionWidth * 0.75; // 75% for values
  let currentY = yPosition - 5 + titleHeight;
  
  rows.forEach((row, index) => {
    // Calculate row height based on content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const labelLines = doc.splitTextToSize(row.label, labelColumnWidth - 4);
    const valueLines = doc.splitTextToSize(row.value, valueColumnWidth - 4);
    const maxLines = Math.max(labelLines.length, valueLines.length);
    const rowHeight = maxLines * 5 + 4;
    
    // Label column background (sde-light-green)
    doc.setFillColor(232, 251, 211); // #e8fbd3
    doc.rect(MARGIN_X, currentY, labelColumnWidth, rowHeight, 'F');
    
    // Value column background (alternate gray for odd rows)
    if (index % 2 === 1) {
      doc.setFillColor(240, 240, 240); // Light gray for odd rows
      doc.rect(MARGIN_X + labelColumnWidth, currentY, valueColumnWidth, rowHeight, 'F');
    }
    
    // Row borders (light grey)
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN_X, currentY, labelColumnWidth, rowHeight, 'S');
    doc.rect(MARGIN_X + labelColumnWidth, currentY, valueColumnWidth, rowHeight, 'S');
    
    // Label text (left column, centered)
    doc.setTextColor(0, 0, 0);
    const labelY = currentY + (rowHeight / 2) - ((labelLines.length * 5) / 2) + 3;
    labelLines.forEach((line: string, lineIndex: number) => {
      const labelWidth = doc.getTextWidth(line);
      const labelX = MARGIN_X + (labelColumnWidth - labelWidth) / 2;
      doc.text(line, labelX, labelY + (lineIndex * 5));
    });
    
    // Value text (right column, centered)
    const valueY = currentY + (rowHeight / 2) - ((valueLines.length * 5) / 2) + 3;
    valueLines.forEach((line: string, lineIndex: number) => {
      const valueWidth = doc.getTextWidth(line);
      const valueX = MARGIN_X + labelColumnWidth + (valueColumnWidth - valueWidth) / 2;
      doc.text(line, valueX, valueY + (lineIndex * 5));
    });
    
    currentY += rowHeight;
  });
  
  return currentY + 5;
};
