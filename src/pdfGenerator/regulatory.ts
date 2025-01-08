import { jsPDF } from 'jspdf';
import { Regulatory, Building, Audit } from '../types';
import { MARGIN_X, CONTENT_WIDTH, FOOTER_HEIGHT, HEADER_HEIGHT, HEADER_BOTTOM_MARGIN } from './constants';
import { addHeader } from './headerFooter';

export const renderRegulatory = (regulatory: Regulatory, doc: jsPDF, yPosition: number, building: Building, audit: Audit): number => {
  doc.setFontSize(8); // Smaller font size
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFillColor(240, 240, 240);
  
  const text = String(regulatory.text || '');
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH - 8);
  const height = lines.length * 3.5 + 3; // Reduced padding
  
  // Check if regulatory would overflow page
  if (yPosition + height > doc.internal.pageSize.height - FOOTER_HEIGHT) {
    doc.addPage();
    addHeader(doc, building, audit);
    yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
  }
  
  // Draw background
  doc.rect(MARGIN_X, yPosition, CONTENT_WIDTH, height, 'F');
  
  // Draw thin grey border
  doc.setDrawColor(128, 128, 128);
  doc.setLineWidth(0.1);
  doc.rect(MARGIN_X, yPosition, CONTENT_WIDTH, height, 'D');
  
  // Add text
  doc.text(lines, MARGIN_X + 4, yPosition + 3);
  return height;
};
