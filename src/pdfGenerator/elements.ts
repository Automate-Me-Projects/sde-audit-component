import { jsPDF } from 'jspdf';
import { Audit, TemplateElement, AuditElement, ExpandedElement, SubCategory } from '../types';
import { sortExpandedTemplateElements } from '../utils/index';
import { MARGIN_X, CONTENT_WIDTH } from './constants';

const getStatusColor = (status: string): [number, number, number] => {
  switch (status) {
    case 'Conforme':
      return [34, 197, 94]; // green-500
    case 'Non conforme':
      return [249, 115, 22]; // orange-500 (sde-orange)
    case 'Non conformité majeure':
      return [239, 68, 68]; // red-500
    case 'Observation':
      return [225, 188, 75]; // yellow
    default:
      return [128, 128, 128]; // gray-300
  }
};

export const calculateRowHeight = (expandedElement: ExpandedElement, doc: jsPDF): number => {
  const nameWidth = CONTENT_WIDTH * 0.20;
  const constatWidth = CONTENT_WIDTH * 0.65;
  const statusWidth = CONTENT_WIDTH * 0.15;

  const name = String(expandedElement.name || '').trim();
  const constat = String(expandedElement.auditElement?.constat || '').trim();
  const status = String(expandedElement.auditElement?.status || '').trim();

  const nameLines = doc.splitTextToSize(name, nameWidth - 4);
  const constatLines = doc.splitTextToSize(constat, constatWidth - 4);
  const statusLines = doc.splitTextToSize(status, statusWidth - 4);

  const lineHeight = 4;
  const padding = 6; 
  const safetyMargin = 4; 

  const nameTextHeight = nameLines.length * lineHeight;
  const statusTextHeight = statusLines.length * lineHeight;
  
  let constatTextHeight = 0;
  const constatParagraphs = constat.split(/\n/);
  
  constatParagraphs.forEach((paragraph, index) => {
    if (paragraph.trim() === '') {
      constatTextHeight += lineHeight;
      return;
    }

    const paragraphLines = doc.splitTextToSize(paragraph, constatWidth - 6);
    constatTextHeight += paragraphLines.length * lineHeight;
    
    if (index < constatParagraphs.length - 1) {
      constatTextHeight += lineHeight * 0.2; 
    }
  });

  const maxTextHeight = Math.max(nameTextHeight, constatTextHeight, statusTextHeight);
  
  return maxTextHeight + padding + safetyMargin;
};

export const renderAuditElementRow = (expandedElement: ExpandedElement, startY: number, doc: jsPDF): number => {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const nameWidth = CONTENT_WIDTH * 0.20;
  const constatWidth = CONTENT_WIDTH * 0.65;
  const statusWidth = CONTENT_WIDTH * 0.15;
  const xPositions = [
    MARGIN_X,
    MARGIN_X + nameWidth,
    MARGIN_X + nameWidth + constatWidth
  ];
  
  const name = String(expandedElement.name || '').trim();
  const constat = String(expandedElement.auditElement?.constat || '').trim();
  const status = String(expandedElement.auditElement?.status || '').trim();

  const nameLines = doc.splitTextToSize(name, nameWidth - 4);
  const constatLines = doc.splitTextToSize(constat, constatWidth - 4);
  const statusLines = doc.splitTextToSize(status, statusWidth - 4);

  const lineHeight = 4;
  const padding = 6; 
  const safetyMargin = 4; 

  const nameTextHeight = nameLines.length * lineHeight;
  const statusTextHeight = statusLines.length * lineHeight;
  
  let constatTextHeight = 0;
  const constatParagraphs = constat.split(/\n/);
  
  constatParagraphs.forEach((paragraph, index) => {
    if (paragraph.trim() === '') {
      constatTextHeight += lineHeight;
      return;
    }

    const paragraphLines = doc.splitTextToSize(paragraph, constatWidth - 6);
    constatTextHeight += paragraphLines.length * lineHeight;
    
    if (index < constatParagraphs.length - 1) {
      constatTextHeight += lineHeight * 0.2; 
    }
  });

  const maxTextHeight = Math.max(nameTextHeight, constatTextHeight, statusTextHeight);
  
  const rowHeight = maxTextHeight + padding + safetyMargin;

  doc.setDrawColor(128, 128, 128);
  doc.setLineWidth(0.1);
  
  xPositions.forEach(x => {
    doc.line(x, startY, x, startY + rowHeight);
  });
  doc.line(MARGIN_X + CONTENT_WIDTH, startY, MARGIN_X + CONTENT_WIDTH, startY + rowHeight);
  
  doc.line(MARGIN_X, startY, MARGIN_X + CONTENT_WIDTH, startY);
  doc.line(MARGIN_X, startY + rowHeight, MARGIN_X + CONTENT_WIDTH, startY + rowHeight);

  const nameVerticalPadding = (rowHeight - nameTextHeight) / 2;
  const nameStartY = startY + nameVerticalPadding + lineHeight * 0.8;

  nameLines.forEach((line: string, i: number) => {
    const xCenter = MARGIN_X + nameWidth/2;
    const lineWidth = doc.getTextWidth(line);
    doc.text(line, xCenter - lineWidth/2, nameStartY + (i * lineHeight));
  });

  const constatVerticalPadding = (rowHeight - constatTextHeight) / 2;
  const constatStartY = startY + constatVerticalPadding + lineHeight * 0.8;
  
  let currentY = constatStartY;

  constatParagraphs.forEach((paragraph, index) => {
    if (paragraph.trim() === '') {
      currentY += lineHeight;
      return;
    }

    const paragraphLines = doc.splitTextToSize(paragraph, constatWidth - 6);
    const numberOfLines = paragraphLines.length;

    if (numberOfLines <= 1 || doc.getTextWidth(paragraph) < (constatWidth - 6) * 0.75) {
      doc.text(paragraph.trim(), xPositions[1] + 2, currentY, {
        align: 'left',
        maxWidth: constatWidth - 4
      });
    } else {
      doc.text(paragraph.trim(), xPositions[1] + 2, currentY, {
        align: 'justify',
        maxWidth: constatWidth - 4,
        renderingMode: "fill"
      });
    }

    currentY += numberOfLines * lineHeight;
    if (index < constatParagraphs.length - 1) {
      currentY += lineHeight * 0.2; 
    }
  });

  const statusVerticalPadding = (rowHeight - statusTextHeight) / 2;
  const statusStartY = startY + statusVerticalPadding + lineHeight * 0.8;
  const statusColor = getStatusColor(status);
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setFont('helvetica', 'bold');
  statusLines.forEach((line: string, i: number) => {
    const xCenter = xPositions[2] + statusWidth/2;
    const lineWidth = doc.getTextWidth(line);
    doc.text(line, xCenter - lineWidth/2, statusStartY + (i * lineHeight));
  });

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  return rowHeight;
};

export const expandTemplateElements = (elements: TemplateElement[], auditElements: AuditElement[]): ExpandedElement[] => {
  const expandedElements: ExpandedElement[] = [];
  const processedAuditElements = new Set<string>(); 

  elements.forEach(templateElement => {
    const matchingAuditElements = auditElements.filter(ae => ae.templateElementId === templateElement._id);
    
    matchingAuditElements.forEach(auditElement => {
      if (processedAuditElements.has(auditElement._id) || 
          !auditElement?.status?.trim()) {
        return;
      }

      processedAuditElements.add(auditElement._id);
      expandedElements.push({
        ...templateElement,
        auditElement
      });
    });
  });

  return expandedElements;
};

export const getTemplateElementsForSubCategory = (subCategory: SubCategory, templateElements: TemplateElement[], audit: Audit, auditElements: AuditElement[]): TemplateElement[] => {
  const elements = templateElements.filter(element => 
    element.subCategoryId === subCategory._id && 
    element.templateVersion?.includes(audit.templateVersion)
  );
  
  const expandedElements = expandTemplateElements(elements, auditElements);
  const sortedElements = sortExpandedTemplateElements(expandedElements, audit.templateVersion);
  return sortedElements;
};

export const getDirectTemplateElements = (categoryId: string, templateElements: TemplateElement[], audit: Audit, auditElements: AuditElement[]): TemplateElement[] => {
  const elements = templateElements.filter(element => 
    element.categoryId === categoryId && 
    !element.subCategoryId && 
    element.templateVersion?.includes(audit.templateVersion)
  );
  
  const expandedElements = expandTemplateElements(elements, auditElements);
  const sortedElements = sortExpandedTemplateElements(expandedElements, audit.templateVersion);
  return sortedElements;
};
