import { jsPDF } from 'jspdf';
import { AuditElement, Building, Audit, TemplateElement } from '../types';
import { MARGIN_X, CONTENT_WIDTH, FOOTER_HEIGHT, HEADER_HEIGHT, HEADER_BOTTOM_MARGIN, HEADER_BG_COLOR } from './constants';
import { addHeader } from './headerFooter';

// Function to check if we need a new page
const checkAndAddNewPage = (doc: jsPDF, yPosition: number, requiredSpace: number, building: Building, audit: Audit) => {
  const currentPosition = yPosition;
  const pageHeight = doc.internal.pageSize.height;
  if (currentPosition + requiredSpace > pageHeight - FOOTER_HEIGHT) {
    doc.addPage();
    addHeader(doc, building, audit);
    return HEADER_HEIGHT + 10;
  }
  return yPosition;
};

// Calculate required height for text content
const calculateTextHeight = (doc: jsPDF, text: string, maxWidth: number) => {
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(text, maxWidth);
  return lines.length * 3.5;
};

// Function to render wrapped text with page breaks
const renderWrappedText = (doc: jsPDF, text: string, x: number, startY: number, maxWidth: number, label?: string) => {
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(text, maxWidth);
  let currentY = startY;

  if (label) {
    doc.setTextColor(80, 80, 80);
    doc.text(label, x, currentY);
    currentY += 3.5;
  }

  doc.setTextColor(0, 0, 0);
  doc.text(lines, x, currentY);
  return currentY + (lines.length * 3.5);
};

export const generateSynthese = (
  doc: jsPDF,
  building: Building,
  audit: Audit,
  auditElements: AuditElement[],
  templateElements: TemplateElement[]
): number => {
  doc.addPage();
  addHeader(doc, building, audit);
  let yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('2. SYNTHÈSE', MARGIN_X, yPosition);
  yPosition += 15;

  // First, collect all unique actionOwners from auditElements
  const actionOwnerMap = new Map<string, {
    nonConformiteMajeure: Array<{name: string, constat: string, action: string}>,
    nonConformes: Array<{name: string, constat: string, action: string}>,
    observations: Array<{name: string, constat: string, action: string}>
  }>();

  auditElements.forEach(auditElement => {
    const actionOwner = auditElement.actionOwner || 'Non assigné';
    const templateElement = templateElements.find(te => te._id === auditElement.templateElementId);
    
    if (!templateElement) return;

    if (!actionOwnerMap.has(actionOwner)) {
      actionOwnerMap.set(actionOwner, {
        nonConformiteMajeure: [],
        nonConformes: [],
        observations: []
      });
    }

    const ownerData = actionOwnerMap.get(actionOwner)!;

    if (auditElement.status === 'Non conformité majeure') {
      ownerData.nonConformiteMajeure.push({
        name: templateElement.name,
        constat: auditElement.constat || '',
        action: auditElement.action || ''
      });
    } else if (auditElement.status === 'Non conforme') {
      ownerData.nonConformes.push({
        name: templateElement.name,
        constat: auditElement.constat || '',
        action: auditElement.action || ''
      });
    } else if (auditElement.status === 'Observation') {
      ownerData.observations.push({
        name: templateElement.name,
        constat: auditElement.constat || '',
        action: auditElement.action || ''
      });
    }
  });

  // Separate 'Non assigné' from other actionOwners
  const nonAssigneData = actionOwnerMap.get('Non assigné');
  actionOwnerMap.delete('Non assigné');

  // Function to render data for an actionOwner
  const renderActionOwnerData = (data: typeof nonAssigneData, actionOwner: string) => {
    if (!data || (data.nonConformiteMajeure.length === 0 && data.nonConformes.length === 0 && data.observations.length === 0)) {
      return;
    }

    yPosition = checkAndAddNewPage(doc, yPosition, 50, building, audit);

    // Actor header with background
    doc.setFillColor(240, 240, 240);
    doc.rect(MARGIN_X, yPosition - 5, CONTENT_WIDTH, 12, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(HEADER_BG_COLOR[0], HEADER_BG_COLOR[1], HEADER_BG_COLOR[2]);
    doc.text(actionOwner.toUpperCase(), MARGIN_X + 5, yPosition + 3);
    yPosition += 8;

    // Render non-conformités majeures if any exist
    if (data.nonConformiteMajeure.length > 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(MARGIN_X, yPosition - 2, CONTENT_WIDTH, 10, 'F');
      doc.setFontSize(10);
      doc.setTextColor(180, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text('RECAPITULATIF DES NON-CONFORMITÉS MAJEURES', MARGIN_X + 5, yPosition + 4);
      yPosition += 12;

      data.nonConformiteMajeure.forEach((item, index) => {
        const constatHeight = calculateTextHeight(doc, item.constat, (CONTENT_WIDTH - 40) / 2);
        const actionHeight = calculateTextHeight(doc, item.action, (CONTENT_WIDTH - 40) / 2);
        const contentHeight = Math.max(constatHeight, actionHeight);
        const totalHeight = contentHeight + 20;

        yPosition = checkAndAddNewPage(doc, yPosition, totalHeight, building, audit);

        const startY = yPosition;

        doc.setFillColor(252, 242, 242);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, totalHeight, 2, 2, 'F');

        doc.setFillColor(255, 235, 235);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, 8, 2, 2, 'F');
        doc.setTextColor(180, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(`NCM${index + 1} - ${String(item.name)}`, MARGIN_X + 10, startY + 6);

        const separatorX = MARGIN_X + 5 + ((CONTENT_WIDTH - 10) / 2);
        doc.setDrawColor(220, 220, 220);
        doc.line(separatorX, startY + 8, separatorX, startY + totalHeight);

        const contentY = startY + 12;
        renderWrappedText(
          doc,
          item.constat,
          MARGIN_X + 12,
          contentY,
          (CONTENT_WIDTH - 40) / 2,
          'Constat:'
        );

        renderWrappedText(
          doc,
          item.action,
          separatorX + 8,
          contentY,
          (CONTENT_WIDTH - 40) / 2,
          'Action:'
        );

        yPosition = startY + totalHeight + 4;
      });
    }

    if (data.nonConformiteMajeure.length > 0 && data.nonConformes.length > 0) {
      yPosition += 8;
    }

    if (data.nonConformes.length > 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(MARGIN_X, yPosition - 2, CONTENT_WIDTH, 10, 'F');
      doc.setFontSize(10);
      doc.setTextColor(200, 100, 0);
      doc.setFont('helvetica', 'normal');
      doc.text('RECAPITULATIF DES NON-CONFORMITÉS', MARGIN_X + 5, yPosition + 4);
      yPosition += 12;

      data.nonConformes.forEach((item, index) => {
        const constatHeight = calculateTextHeight(doc, item.constat, (CONTENT_WIDTH - 40) / 2);
        const actionHeight = calculateTextHeight(doc, item.action, (CONTENT_WIDTH - 40) / 2);
        const contentHeight = Math.max(constatHeight, actionHeight);
        const totalHeight = contentHeight + 20;

        yPosition = checkAndAddNewPage(doc, yPosition, totalHeight, building, audit);

        const startY = yPosition;

        doc.setFillColor(252, 248, 227);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, totalHeight, 2, 2, 'F');

        doc.setFillColor(255, 248, 227);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, 8, 2, 2, 'F');
        doc.setTextColor(200, 100, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(`NC${index + 1} - ${String(item.name)}`, MARGIN_X + 10, startY + 6);

        const separatorX = MARGIN_X + 5 + ((CONTENT_WIDTH - 10) / 2);
        doc.setDrawColor(220, 220, 220);
        doc.line(separatorX, startY + 8, separatorX, startY + totalHeight);

        const contentY = startY + 12;
        renderWrappedText(
          doc,
          item.constat,
          MARGIN_X + 12,
          contentY,
          (CONTENT_WIDTH - 40) / 2,
          'Constat:'
        );

        renderWrappedText(
          doc,
          item.action,
          separatorX + 8,
          contentY,
          (CONTENT_WIDTH - 40) / 2,
          'Action:'
        );

        yPosition = startY + totalHeight + 4;
      });
    }

    if ((data.nonConformiteMajeure.length > 0 || data.nonConformes.length > 0) && data.observations.length > 0) {
      yPosition += 8;
    }

    if (data.observations.length > 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(MARGIN_X, yPosition - 2, CONTENT_WIDTH, 10, 'F');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('RECAPITULATIF DES OBSERVATIONS', MARGIN_X + 5, yPosition + 4);
      yPosition += 12;

      data.observations.forEach((item, index) => {
        const constatHeight = calculateTextHeight(doc, item.constat, (CONTENT_WIDTH - 40) / 2);
        const actionHeight = calculateTextHeight(doc, item.action, (CONTENT_WIDTH - 40) / 2);
        const contentHeight = Math.max(constatHeight, actionHeight);
        const totalHeight = contentHeight + 20;

        yPosition = checkAndAddNewPage(doc, yPosition, totalHeight, building, audit);

        const startY = yPosition;

        doc.setFillColor(245, 245, 245);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, totalHeight, 2, 2, 'F');

        doc.setFillColor(240, 240, 240);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, 8, 2, 2, 'F');
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text(`O${index + 1} - ${String(item.name)}`, MARGIN_X + 10, startY + 6);

        const separatorX = MARGIN_X + 5 + ((CONTENT_WIDTH - 10) / 2);
        doc.setDrawColor(220, 220, 220);
        doc.line(separatorX, startY + 8, separatorX, startY + totalHeight);

        const contentY = startY + 12;
        renderWrappedText(
          doc,
          item.constat,
          MARGIN_X + 12,
          contentY,
          (CONTENT_WIDTH - 40) / 2,
          'Constat:'
        );

        renderWrappedText(
          doc,
          item.action,
          separatorX + 8,
          contentY,
          (CONTENT_WIDTH - 40) / 2,
          'Action:'
        );

        yPosition = startY + totalHeight + 4;
      });
    }

    yPosition += 10;
  };

  // Render data for each actionOwner
  Array.from(actionOwnerMap.entries()).forEach(([actionOwner, data]) => {
    renderActionOwnerData(data, actionOwner);
  });

  // Render non-assigned data at the end if it exists
  if (nonAssigneData) {
    renderActionOwnerData(nonAssigneData, 'Non assigné');
  }

  return yPosition;
};
