import { jsPDF } from 'jspdf';
import { Regulatory, Building, Audit } from '../types';
import { MARGIN_X, CONTENT_WIDTH, FOOTER_HEIGHT, HEADER_HEIGHT, HEADER_BOTTOM_MARGIN } from './constants';
import { addHeader } from './headerFooter';

export const renderRegulatory = (regulatory: Regulatory, doc: jsPDF, yPosition: number, building: Building, audit: Audit): number => {
  doc.setFontSize(9); // Smaller font size
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFillColor(240, 240, 240);
  
  const text = String(regulatory.text || '');
  const textWidth = CONTENT_WIDTH - 12; // Subtract left and right padding
  const lineHeight = 3.5;
  const cellPadding = 3;
  
  // Split into paragraphs while preserving empty lines
  const paragraphs = text.split(/\n/);
  
  // Calculate total height needed for text only
  let totalTextHeight = 0;
  paragraphs.forEach(paragraph => {
    if (paragraph.trim() === '') {
      totalTextHeight += lineHeight;
    } else {
      const textDimensions = doc.getTextDimensions(paragraph, { maxWidth: textWidth });
      totalTextHeight += textDimensions.h;
      if (paragraph !== paragraphs[paragraphs.length - 1]) {
        totalTextHeight += lineHeight * 0.2; // Add spacing only between paragraphs
      }
    }
  });
  
  // Calculate cell height to ensure text is vertically centered
  const height = Math.max(totalTextHeight + (cellPadding * 2), lineHeight * 2);
  
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
  
  // Calculate starting Y position to center text vertically
  const verticalPadding = Math.max((height - totalTextHeight) / 2, cellPadding);
  let currentY = yPosition + verticalPadding + (lineHeight * 0.8); // Ajusté pour un meilleur centrage comme dans la table ICPE
  
  // Process each paragraph
  paragraphs.forEach((paragraph, index) => {
    if (paragraph.trim() === '') {
      // Empty line, just add spacing
      currentY += lineHeight;
      return;
    }
    
    // Calculate dimensions for this paragraph
    const textDimensions = doc.getTextDimensions(paragraph, { maxWidth: textWidth });
    const numberOfLines = Math.ceil(textDimensions.h / lineHeight);
    
    // If single line or text is not long enough to justify, use left alignment
    if (numberOfLines <= 1 || doc.getTextWidth(paragraph) < textWidth * 0.75) {
      doc.text(paragraph.trim(), MARGIN_X + 6, currentY, {
        align: 'left',
        maxWidth: textWidth
      });
    } else {
      // For multi-line paragraphs that are long enough, justify the text
      doc.text(paragraph.trim(), MARGIN_X + 6, currentY, {
        align: 'justify',
        maxWidth: textWidth,
        renderingMode: "fill"
      });
    }
    
    // Move to next paragraph position
    currentY += textDimensions.h;
    if (index < paragraphs.length - 1) {
      currentY += lineHeight * 0.2; // Add spacing only between paragraphs
    }
  });
  
  return height;
};
