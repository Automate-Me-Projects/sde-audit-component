import { jsPDF } from 'jspdf';
import { Audit, TemplateElement, AuditElement, ExpandedElement, SubCategory } from '../types';
import { sortExpandedTemplateElements } from '../utils/index';
import { MARGIN_X, CONTENT_WIDTH } from './constants';

export const calculateRowHeight = (expandedElement: ExpandedElement, doc: jsPDF): number => {
  const nameWidth = CONTENT_WIDTH * 0.35;
  const constatWidth = CONTENT_WIDTH * 0.50;
  const statusWidth = CONTENT_WIDTH * 0.15;

  const name = String(expandedElement.name || '').trim();
  const constat = String(expandedElement.auditElement?.constat || '').trim();
  const status = String(expandedElement.auditElement?.status || '').trim();

  const nameLines = doc.splitTextToSize(name, nameWidth - 4);
  const constatLines = doc.splitTextToSize(constat, constatWidth - 4);
  const statusLines = doc.splitTextToSize(status, statusWidth - 4);

  const maxLines = Math.max(nameLines.length, constatLines.length, statusLines.length);
  return maxLines * 4 + 6; // lineHeight = 4, padding = 6
};

export const renderAuditElementRow = (expandedElement: ExpandedElement, startY: number, doc: jsPDF): number => {
  // Set initial font settings
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  // Adjust column widths: name (35%), constat (50%), status (15%)
  const nameWidth = CONTENT_WIDTH * 0.35;
  const constatWidth = CONTENT_WIDTH * 0.50;
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

  const maxLines = Math.max(nameLines.length, constatLines.length, statusLines.length);
  const lineHeight = 4;
  const padding = 6;
  const rowHeight = maxLines * lineHeight + padding;

  // Draw backgrounds (white) and borders
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(200, 200, 200);
  
  // Draw cells with no gaps between them
  doc.rect(xPositions[0], startY - 3, nameWidth, rowHeight, 'FD');
  doc.rect(xPositions[1], startY - 3, constatWidth, rowHeight, 'FD');
  doc.rect(xPositions[2], startY - 3, statusWidth, rowHeight, 'FD');

  // Reset text color to black before rendering text
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  // Calculate vertical center position for text
  const textStartY = startY + (padding / 2);

  // Add text centered vertically
  if (nameLines.length > 0) doc.text(nameLines, xPositions[0] + 2, textStartY);
  if (constatLines.length > 0) doc.text(constatLines, xPositions[1] + 2, textStartY);
  if (statusLines.length > 0) doc.text(statusLines, xPositions[2] + 2, textStartY);

  return rowHeight;
};

export const expandTemplateElements = (elements: TemplateElement[], auditElements: AuditElement[]): ExpandedElement[] => {
  const expandedElements: ExpandedElement[] = [];

  elements.forEach(templateElement => {
    const auditElement = auditElements.find(ae => ae.templateElementId === templateElement._id);
    
    // Skip if both constat and status are empty/null
    if (!auditElement?.constat?.trim() && !auditElement?.status?.trim()) {
      return;
    }

    expandedElements.push({
      ...templateElement,
      auditElement
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
