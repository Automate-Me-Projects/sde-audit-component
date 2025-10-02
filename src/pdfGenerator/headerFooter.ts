import { jsPDF } from 'jspdf';
import { Building, Audit } from '../types';
import { MARGIN_X, PAGE_WIDTH, HEADER_HEIGHT, FOOTER_HEIGHT, GREEN_BG_COLOR } from './constants';

export const addHeader = (doc: jsPDF, building: Building, audit: Audit) => {
  // Add green background
  doc.setFillColor(GREEN_BG_COLOR[0], GREEN_BG_COLOR[1], GREEN_BG_COLOR[2]);
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F');

  // Add text
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);

  // Calculate vertical center
  const text = `Audit de suivi ICPE - ${building?.name ?? ''} - ${building?.portfolio ?? ''} - ${audit?.year}`;
  const textHeight = doc.getTextDimensions(text).h;
  const verticalCenter = (HEADER_HEIGHT + textHeight) / 2;

  doc.text(text, MARGIN_X, verticalCenter);
};

export const addFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Page ${i} / ${pageCount}`, PAGE_WIDTH / 2, doc.internal.pageSize.height - (FOOTER_HEIGHT / 2), { align: 'center' });
  }
};
