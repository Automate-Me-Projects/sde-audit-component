import { jsPDF } from 'jspdf';
import { Regulatory, Building, Audit } from '../types';
import { MARGIN_X, CONTENT_WIDTH, FOOTER_HEIGHT, HEADER_HEIGHT } from './constants';
import { addHeader } from './headerFooter';

export const renderRegulatory = (regulatory: Regulatory, doc: jsPDF, yPosition: number, building: Building, audit: Audit): number => {
  doc.setFontSize(8); // Smaller font size
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(240, 240, 240);
  
  const text = String(regulatory.text || '');
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH - 8); // More padding
  const height = lines.length * 3.5 + 6; // Adjusted line height
  
  // Check if regulatory would overflow page
  if (yPosition + height > doc.internal.pageSize.height - FOOTER_HEIGHT) {
    doc.addPage();
    addHeader(doc, building, audit);
    yPosition = HEADER_HEIGHT + 10;
  }
  
  doc.rect(MARGIN_X, yPosition - 3, CONTENT_WIDTH, height, 'F');
  doc.text(lines, MARGIN_X + 4, yPosition + 2); // Added padding and vertical centering
  return height;
};
