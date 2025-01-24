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
    default:
      return [128, 128, 128]; // gray-300
  }
};

export const calculateRowHeight = (expandedElement: ExpandedElement, doc: jsPDF): number => {
  const nameWidth = CONTENT_WIDTH * 0.20; // Reduced from 0.25
  const constatWidth = CONTENT_WIDTH * 0.65; // Increased from 0.60
  const statusWidth = CONTENT_WIDTH * 0.15;

  const name = String(expandedElement.name || '').trim();
  const constat = String(expandedElement.auditElement?.constat || '').trim();
  const status = String(expandedElement.auditElement?.status || '').trim();

  const nameLines = doc.splitTextToSize(name, nameWidth - 4);
  const constatLines = doc.splitTextToSize(constat, constatWidth - 4);
  const statusLines = doc.splitTextToSize(status, statusWidth - 4);

  const maxLines = Math.max(nameLines.length, constatLines.length, statusLines.length);
  return maxLines * 4 + 8; // lineHeight = 4, padding = 8
};

export const renderAuditElementRow = (expandedElement: ExpandedElement, startY: number, doc: jsPDF): number => {
  // Set initial font settings
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  // Adjust column widths: name (20%), constat (65%), status (15%)
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

  const maxLines = Math.max(nameLines.length, constatLines.length, statusLines.length);
  const lineHeight = 4;
  const padding = 4;
  const rowHeight = maxLines * lineHeight + (padding * 2);

  // Draw cell borders (thinner, 0.1 instead of default)
  doc.setDrawColor(128, 128, 128);
  doc.setLineWidth(0.1);
  
  // Draw vertical lines
  xPositions.forEach(x => {
    doc.line(x, startY, x, startY + rowHeight);
  });
  doc.line(MARGIN_X + CONTENT_WIDTH, startY, MARGIN_X + CONTENT_WIDTH, startY + rowHeight);
  
  // Draw horizontal lines
  doc.line(MARGIN_X, startY, MARGIN_X + CONTENT_WIDTH, startY);
  doc.line(MARGIN_X, startY + rowHeight, MARGIN_X + CONTENT_WIDTH, startY + rowHeight);

  // Calculate vertical centering for each column
  const nameTextHeight = nameLines.length * lineHeight;
  const constatTextHeight = constatLines.length * lineHeight;
  const statusTextHeight = statusLines.length * lineHeight;

  const baselineOffset = lineHeight * 0.8;

  // Name column (centered)
  const nameVerticalPadding = (rowHeight - nameTextHeight) / 2;
  const nameStartY = startY + nameVerticalPadding + baselineOffset;
  nameLines.forEach((line: string, i: number) => {
    const xCenter = MARGIN_X + nameWidth/2;
    const lineWidth = doc.getTextWidth(line);
    doc.text(line, xCenter - lineWidth/2, nameStartY + (i * lineHeight));
  });

  // Constat column (justified if multi-line)
  const constatVerticalPadding = (rowHeight - constatTextHeight) / 2;
  const constatStartY = startY + constatVerticalPadding + baselineOffset;
  
  // Split constat into paragraphs
  const constatParagraphs = constat.split(/\n/);
  let currentY = constatStartY;

  constatParagraphs.forEach((paragraph, index) => {
    if (paragraph.trim() === '') {
      currentY += lineHeight;
      return;
    }

    const paragraphLines = doc.splitTextToSize(paragraph, constatWidth - 6);
    const numberOfLines = paragraphLines.length;

    // If single line or text is not long enough to justify, use left alignment
    if (numberOfLines <= 1 || doc.getTextWidth(paragraph) < (constatWidth - 6) * 0.75) {
      doc.text(paragraph.trim(), xPositions[1] + 2, currentY, {
        align: 'left',
        maxWidth: constatWidth - 4
      });
    } else {
      // For multi-line paragraphs that are long enough, justify the text
      doc.text(paragraph.trim(), xPositions[1] + 2, currentY, {
        align: 'justify',
        maxWidth: constatWidth - 4,
        renderingMode: "fill"
      });
    }

    currentY += numberOfLines * lineHeight;
    if (index < constatParagraphs.length - 1) {
      currentY += lineHeight * 0.2; // Add spacing between paragraphs
    }
  });

  // Status column (centered and colored)
  const statusVerticalPadding = (rowHeight - statusTextHeight) / 2;
  const statusStartY = startY + statusVerticalPadding + baselineOffset;
  const statusColor = getStatusColor(status);
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setFont('helvetica', 'bold');
  statusLines.forEach((line: string, i: number) => {
    const xCenter = xPositions[2] + statusWidth/2;
    const lineWidth = doc.getTextWidth(line);
    doc.text(line, xCenter - lineWidth/2, statusStartY + (i * lineHeight));
  });

  // Reset text color
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  return rowHeight;
};

export const expandTemplateElements = (elements: TemplateElement[], auditElements: AuditElement[]): ExpandedElement[] => {
  const expandedElements: ExpandedElement[] = [];
  const processedAuditElements = new Set<string>(); // Track processed audit elements by ID

  elements.forEach(templateElement => {
    // Find all audit elements that match this template element
    const matchingAuditElements = auditElements.filter(ae => ae.templateElementId === templateElement._id);
    
    // Create an expanded element for each matching audit element
    matchingAuditElements.forEach(auditElement => {
      // Skip if we've already processed this audit element or if constat and status are empty
      if (processedAuditElements.has(auditElement._id) || 
          (!auditElement?.constat?.trim() && !auditElement?.status?.trim())) {
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
