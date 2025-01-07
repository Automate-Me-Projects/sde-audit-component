import { jsPDF } from 'jspdf';
import { Building, Audit, Category, SubCategory, Regulatory, TemplateElement, ExpandedElement, AuditElement, PDFGeneratorOptions, TableRow } from '../types';
import { sortByPosition, sortSectionsByPosition, sortExpandedTemplateElements, formatDateToFrench, formatDate } from './index';

const MARGIN_X = 15;
const PAGE_WIDTH = 210; // A4 width in mm
const CONTENT_WIDTH = PAGE_WIDTH - (2 * MARGIN_X);
const FOOTER_HEIGHT = 15;
const HEADER_HEIGHT = 20;

// Define colors as tuples with explicit type
const HEADER_BG_COLOR = [0, 106, 60] as [number, number, number];
const GREEN_BG_COLOR = [160, 205, 99] as [number, number, number];
const LIGHTGREEN_BG_COLOR = [235, 241, 217] as [number, number, number];

const addHeader = (doc: jsPDF, building: Building, audit: Audit) => {
  // Add green background
  doc.setFillColor(HEADER_BG_COLOR[0], HEADER_BG_COLOR[1], HEADER_BG_COLOR[2]);
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F');
  
  // Add text
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);

  // Calculate vertical center
  const text = `Audit de conformité réglementaire ${building?.name ?? ''} - ${formatDateToFrench(audit?.visitDate ?? '')}`;
  const textHeight = doc.getTextDimensions(text).h;
  const verticalCenter = (HEADER_HEIGHT + textHeight) / 2;

  doc.text(text, MARGIN_X, verticalCenter);
};

const addFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Page ${i} / ${pageCount}`, PAGE_WIDTH / 2, doc.internal.pageSize.height - (FOOTER_HEIGHT / 2), { align: 'center' });
  }
};

const addInfoTable = (doc: jsPDF, rows: TableRow[], title?: string, startY: number = HEADER_HEIGHT + 10) => {
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

const calculateRowHeight = (expandedElement: ExpandedElement, doc: jsPDF): number => {
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

const renderAuditElementRow = (expandedElement: ExpandedElement, startY: number, doc: jsPDF): number => {
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

const renderRegulatory = (regulatory: Regulatory, doc: jsPDF, yPosition: number, building: Building, audit: Audit): number => {
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

const expandTemplateElements = (elements: TemplateElement[], auditElements: AuditElement[]): ExpandedElement[] => {
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

const getTemplateElementsForSubCategory = (subCategory: SubCategory, templateElements: TemplateElement[], audit: Audit, auditElements: AuditElement[]): TemplateElement[] => {
  const elements = templateElements.filter(element => 
    element.subCategoryId === subCategory._id && 
    element.templateVersion?.includes(audit.templateVersion)
  );
  
  const expandedElements = expandTemplateElements(elements, auditElements);
  const sortedElements = sortExpandedTemplateElements(expandedElements, audit.templateVersion);
  return sortedElements;
};

const getDirectTemplateElements = (categoryId: string, templateElements: TemplateElement[], audit: Audit, auditElements: AuditElement[]): TemplateElement[] => {
  const elements = templateElements.filter(element => 
    element.categoryId === categoryId && 
    !element.subCategoryId && 
    element.templateVersion?.includes(audit.templateVersion)
  );
  
  const expandedElements = expandTemplateElements(elements, auditElements);
  const sortedElements = sortExpandedTemplateElements(expandedElements, audit.templateVersion);
  return sortedElements;
};

const renderSubCategory = (subCategory: SubCategory, templateElements: TemplateElement[], building: Building, audit: Audit, auditElements: AuditElement[], regulatories: Regulatory[], doc: jsPDF, yPosition: number): number | null => {
  // Get elements for this subcategory
  const elements = getTemplateElementsForSubCategory(subCategory, templateElements, audit, auditElements);
  const expandedElements = expandTemplateElements(elements, auditElements);

  // Skip if no elements
  if (expandedElements.length === 0) {
    return null;
  }
  
  const titleHeight = 8;
  let currentY = yPosition;

  // Calculate total height needed for title, regulatory, and first element
  let totalMinHeight = titleHeight;
  
  // Add regulatory height if exists
  const regulatory = regulatories.find(r => r.subCategoryId === subCategory._id);
  if (regulatory) {
    const regulatoryText = String(regulatory.text || '');
    const regulatoryLines = doc.splitTextToSize(regulatoryText, CONTENT_WIDTH - 8);
    totalMinHeight += regulatoryLines.length * 3.5 + 6;
  }

  // Add height of first element
  const firstElementHeight = calculateRowHeight(expandedElements[0], doc);
  totalMinHeight += firstElementHeight;

  // Check if we need a new page before starting the subcategory
  if (currentY + totalMinHeight > doc.internal.pageSize.height - FOOTER_HEIGHT) {
    doc.addPage();
    addHeader(doc, building, audit);
    currentY = HEADER_HEIGHT + 5;
  }

  // SubCategory title with background
  doc.setFillColor(LIGHTGREEN_BG_COLOR[0], LIGHTGREEN_BG_COLOR[1], LIGHTGREEN_BG_COLOR[2]);
  doc.rect(MARGIN_X, currentY - 3, CONTENT_WIDTH, titleHeight, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  
  // Center text horizontally and vertically
  const text = String(subCategory.name || '');
  const textWidth = doc.getTextWidth(text);
  const xPos = MARGIN_X + (CONTENT_WIDTH - textWidth) / 2;
  doc.text(text, xPos, currentY + 2);
  
  currentY += titleHeight;

  // Render regulatory if exists
  if (regulatory) {
    const height = renderRegulatory(regulatory, doc, currentY, building, audit);
    currentY += height;
  }

  // Calculate heights for all rows
  const rowHeights = expandedElements.map(element => calculateRowHeight(element, doc));
  
  // Render rows in batches that fit on the page
  let currentElementIndex = 0;
  while (currentElementIndex < expandedElements.length) {
    let batchHeight = 0;
    let batchSize = 0;
    
    // Calculate how many rows can fit on current page
    for (let i = currentElementIndex; i < expandedElements.length; i++) {
      const nextRowHeight = rowHeights[i];
      if (currentY + batchHeight + nextRowHeight > doc.internal.pageSize.height - FOOTER_HEIGHT) {
        break;
      }
      batchHeight += nextRowHeight;
      batchSize++;
    }

    // If no rows can fit on current page, start a new page
    if (batchSize === 0) {
      doc.addPage();
      addHeader(doc, building, audit);
      currentY = HEADER_HEIGHT + 5;
      continue;
    }

    // Render the batch of rows
    for (let i = 0; i < batchSize; i++) {
      const element = expandedElements[currentElementIndex + i];
      const rowHeight = renderAuditElementRow(element, currentY, doc);
      currentY += rowHeight;
    }

    currentElementIndex += batchSize;
  }

  return currentY;
};

const renderCategory = (audit: Audit, building: Building, category: Category, templateElements: TemplateElement[], auditElements: AuditElement[], subCategories: SubCategory[], regulatories: Regulatory[], doc: jsPDF, yPosition: number, sectionId?: string) => {
  // Get and sort subcategories
  const categorySubCategories = sortByPosition(
    subCategories.filter(sc => sc.categoryId === category._id),
    audit.templateVersion
  ) as SubCategory[];

  // Get direct elements
  const directElements = getDirectTemplateElements(category._id, templateElements, audit, auditElements);
  const expandedDirectElements = expandTemplateElements(directElements, auditElements);

  // Check if any subcategories have non-empty data
  const hasNonEmptySubCategories = categorySubCategories.some(subCategory => {
    const elements = getTemplateElementsForSubCategory(subCategory, templateElements, audit, auditElements);
    const expandedElements = expandTemplateElements(elements, auditElements);
    return expandedElements.length > 0;
  });

  // Skip if no non-empty subcategories and no direct elements
  if (!hasNonEmptySubCategories && expandedDirectElements.length === 0) {
    return yPosition;
  }

  const titleHeight = 8;

  // For each subcategory, calculate minimum height needed for category title + subcategory title + first row
  let minHeightNeeded = titleHeight; // Category title

  // Add regulatory height if exists
  if (sectionId) {
    const regulatory = regulatories.find(
      r => r.sectionId === sectionId && 
           r.categoryId === category._id && 
           (!r.subCategoryId || r.subCategoryId === "null" || r.subCategoryId === "")
    );
    if (regulatory) {
      const text = String(regulatory.text || '');
      const lines = doc.splitTextToSize(text, CONTENT_WIDTH - 8);
      minHeightNeeded += lines.length * 3.5 + 6;
    }
  }

  // Check if we need a page break
  if (yPosition + minHeightNeeded > doc.internal.pageSize.height - FOOTER_HEIGHT) {
    doc.addPage();
    addHeader(doc, building, audit);
    yPosition = HEADER_HEIGHT + 5;
  }

  // Category title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(GREEN_BG_COLOR[0], GREEN_BG_COLOR[1], GREEN_BG_COLOR[2]);
  doc.rect(MARGIN_X, yPosition - 3, CONTENT_WIDTH, titleHeight, 'F');
  doc.setTextColor(255, 255, 255);
  
  // Center text horizontally and vertically
  const text = String(category.name || '');
  const textWidth = doc.getTextWidth(text);
  const xPos = MARGIN_X + (CONTENT_WIDTH - textWidth) / 2;
  doc.text(text, xPos, yPosition + 2);
  
  doc.setFont('helvetica', 'normal');
  yPosition += titleHeight;

  // Render regulatory if exists
  if (sectionId) {
    const regulatory = regulatories.find(
      r => r.sectionId === sectionId && 
           r.categoryId === category._id && 
           (!r.subCategoryId || r.subCategoryId === "null" || r.subCategoryId === "")
    );
    if (regulatory) {
      const height = renderRegulatory(regulatory, doc, yPosition, building, audit);
      yPosition += height;
    }
  }

  // Render subcategories
  for (const subCategory of categorySubCategories) {
    const newY = renderSubCategory(subCategory, templateElements, building, audit, auditElements, regulatories, doc, yPosition);
    if (newY !== null) {
      yPosition = newY;
    }
  }

  // Render direct elements if any
  if (expandedDirectElements.length > 0) {
    let currentElementIndex = 0;
    const rowHeights = expandedDirectElements.map(element => calculateRowHeight(element, doc));

    while (currentElementIndex < expandedDirectElements.length) {
      let batchHeight = 0;
      let batchSize = 0;
      
      // Calculate how many rows can fit on current page
      for (let i = currentElementIndex; i < expandedDirectElements.length; i++) {
        const nextRowHeight = rowHeights[i];
        if (yPosition + batchHeight + nextRowHeight > doc.internal.pageSize.height - FOOTER_HEIGHT) {
          break;
        }
        batchHeight += nextRowHeight;
        batchSize++;
      }

      // If no rows can fit on current page, start a new page
      if (batchSize === 0) {
        doc.addPage();
        addHeader(doc, building, audit);
        yPosition = HEADER_HEIGHT + 5;
        continue;
      }

      // Render the batch of rows
      for (let i = 0; i < batchSize; i++) {
        const element = expandedDirectElements[currentElementIndex + i];
        const rowHeight = renderAuditElementRow(element, yPosition, doc);
        yPosition += rowHeight;
      }

      currentElementIndex += batchSize;
    }
  }

  return yPosition + 4;
};

const generateAuditPDF = async (options: PDFGeneratorOptions): Promise<jsPDF> => {
  const {
    building,
    audit,
    sections,
    categories,
    subCategories,
    regulatories,
    arretePrefectoralRows,
    exploitationRows,
    auditRows,
    templateElements,
    auditElements,
    images,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Page 1: Cover
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(0, 106, 60); // Dark green color
  doc.text('AUDIT DE SUIVI ICPE', MARGIN_X, 40);

  // Date
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 106, 60);
  const formattedDate = formatDate(audit?.visitDate);
  doc.text(formattedDate, MARGIN_X, 60);

  // Building name (centered)
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(GREEN_BG_COLOR[0], GREEN_BG_COLOR[1], GREEN_BG_COLOR[2]);
  const buildingName = building?.name || '';
  const buildingNameWidth = doc.getTextWidth(buildingName);
  const centerX = (doc.internal.pageSize.width - buildingNameWidth) / 2;
  doc.text(buildingName, centerX, 120);

  // Address (bottom right)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(GREEN_BG_COLOR[0], GREEN_BG_COLOR[1], GREEN_BG_COLOR[2]);
  const address = building?.address || '';
  
  // Calculate maximum width available for address
  const maxWidth = doc.internal.pageSize.width - (2 * MARGIN_X);
  
  // Split text if it's too long
  const textLines = doc.splitTextToSize(address, maxWidth);
  
  // Position at bottom right
  const bottomY = doc.internal.pageSize.height - 30;
  const rightX = doc.internal.pageSize.width - MARGIN_X;
  
  // Right align each line
  textLines.forEach((line: string, index: number) => {
    const lineWidth = doc.getTextWidth(line);
    doc.text(line, rightX - lineWidth, bottomY + (index * 7));
  });

  // Page 3: Exploitation & Visit info
  doc.addPage();
  addHeader(doc, building, audit);
  let yPosition = HEADER_HEIGHT + 5;
  doc.setFontSize(12);
  doc.setTextColor(0, 106, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS GÉNÉRALES', MARGIN_X, yPosition);

  yPosition += 10;
  yPosition = addInfoTable(doc, arretePrefectoralRows, 'INFORMATIONS RELATIVES À L\'ARRÊTÉ PRÉFECTORAL', yPosition);
  yPosition += 10;
  yPosition = addInfoTable(doc, exploitationRows, 'INFORMATIONS RELATIVES À L\'EXPLOITATION', yPosition);
  yPosition += 10;

  // Visit info
  yPosition = addInfoTable(doc, auditRows, 'DATE DE LA VISITE ET RÉDACTION DU RAPPORT', yPosition);

  // Page 4: ICPE Table
  doc.addPage();
  addHeader(doc, building, audit);
  yPosition = HEADER_HEIGHT + 5;
  doc.setFontSize(12);
  doc.setTextColor(0, 106, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('CLASSEMENT ICPE', MARGIN_X, yPosition);
  yPosition += 15;

  // Define column widths
  const colWidths = {
    rubrique: 35,
    nature: 70,
    capacite: 45,
    regime: 30
  };

  type ColWidthKeys = keyof typeof colWidths;
  
  // ICPE Table header
  doc.setFillColor(GREEN_BG_COLOR[0], GREEN_BG_COLOR[1], GREEN_BG_COLOR[2]); // Use same green as categories
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const headers: Array<{ key: ColWidthKeys; text: string }> = [
    { key: 'rubrique', text: 'Rubrique' },
    { key: 'nature', text: 'Nature des activités' },
    { key: 'capacite', text: 'Capacité' },
    { key: 'regime', text: 'Régime' }
  ];

  // Draw header cells with no gaps
  let xPos = MARGIN_X;
  const headerHeight = 7;
  headers.forEach(header => {
    doc.rect(xPos, yPosition - 5, colWidths[header.key], headerHeight, 'F');
    xPos += colWidths[header.key];
  });

  // Then draw all text (to ensure text is on top)
  xPos = MARGIN_X;
  headers.forEach(header => {
    // Center text in column
    const textWidth = doc.getTextWidth(header.text);
    const centerX = xPos + (colWidths[header.key] - textWidth) / 2;
    doc.text(header.text, centerX, yPosition);
    xPos += colWidths[header.key];
  });
  
  yPosition += 8;

  // ICPE Table content
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  building?.icpeTypes?.forEach((icpe) => {
    if (yPosition > doc.internal.pageSize.height - FOOTER_HEIGHT) {
      doc.addPage();
      addHeader(doc, building, audit);
      yPosition = HEADER_HEIGHT + 5;
    }

    xPos = MARGIN_X;
    
    // Calculate required height for all columns
    const description = String(icpe.description || '');
    const capacity = String(icpe.capacity || '');
    const regime = String(icpe.regime || '');
    const rubrique = String(icpe.rubrique || '');
    
    const descLines = doc.splitTextToSize(description, colWidths.nature - 4);
    const capLines = doc.splitTextToSize(capacity, colWidths.capacite - 4);
    const regimeLines = doc.splitTextToSize(regime, colWidths.regime - 4);
    const rubriqueLines = doc.splitTextToSize(rubrique, colWidths.rubrique - 4);
    
    const maxLines = Math.max(
      descLines.length,
      capLines.length,
      regimeLines.length,
      rubriqueLines.length
    );
    
    const lineHeight = 3.5;
    const cellPadding = 4;
    const actualRowHeight = Math.max(7, maxLines * lineHeight + cellPadding);
    
    // Draw cells with no gaps
    // Rubrique
    doc.rect(xPos, yPosition - 3, colWidths.rubrique, actualRowHeight);
    doc.text(rubriqueLines, xPos + 2, yPosition);
    xPos += colWidths.rubrique;
    
    // Nature
    doc.rect(xPos, yPosition - 3, colWidths.nature, actualRowHeight);
    doc.text(descLines, xPos + 2, yPosition);
    xPos += colWidths.nature;
    
    // Capacité
    doc.rect(xPos, yPosition - 3, colWidths.capacite, actualRowHeight);
    doc.text(capLines, xPos + 2, yPosition);
    xPos += colWidths.capacite;
    
    // Régime
    doc.rect(xPos, yPosition - 3, colWidths.regime, actualRowHeight);
    doc.text(regimeLines, xPos + 2, yPosition);
    
    yPosition += actualRowHeight; // Remove extra spacing
  });

  // Page 5: Synthèse
  doc.addPage();
  addHeader(doc, building, audit);
  yPosition = HEADER_HEIGHT + 5;

  // Add SYNTHÈSE title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(HEADER_BG_COLOR[0], HEADER_BG_COLOR[1], HEADER_BG_COLOR[2]);
  doc.text('SYNTHÈSE', MARGIN_X, yPosition);
  yPosition += 15;

  // Function to check if we need a new page
  const checkAndAddNewPage = (requiredSpace: number) => {
    const currentPosition = yPosition;
    const pageHeight = doc.internal.pageSize.height;
    if (currentPosition + requiredSpace > pageHeight - FOOTER_HEIGHT) {
      doc.addPage();
      addHeader(doc, building, audit);
      yPosition = HEADER_HEIGHT + 10;
      return true;
    }
    return false;
  };

  // Calculate required height for text content
  const calculateTextHeight = (text: string, maxWidth: number) => {
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(text, maxWidth);
    return lines.length * 3.5; // Each line is approximately 3.5mm high
  };

  // Function to render wrapped text with page breaks
  const renderWrappedText = (text: string, x: number, startY: number, maxWidth: number, label?: string) => {
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(text, maxWidth);
    let currentY = startY;

    if (label) {
      doc.setTextColor(80, 80, 80);
      doc.text(label, x, currentY);
      currentY += 3.5; // Reduced from 4 to 3.5
    }

    doc.setTextColor(0, 0, 0);
    doc.text(lines, x, currentY);
    return currentY + (lines.length * 3.5); // Reduced from 4 to 3.5
  };

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
      return; // Skip if no items
    }

    checkAndAddNewPage(50);

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
      doc.setTextColor(180, 0, 0); // Red color
      doc.setFont('helvetica', 'normal');
      doc.text('RECAPITULATIF DES NON-CONFORMITÉS MAJEURES', MARGIN_X + 5, yPosition + 4);
      yPosition += 12;

      data.nonConformiteMajeure.forEach((item, index) => {
        // Calculate heights
        const constatHeight = calculateTextHeight(item.constat, (CONTENT_WIDTH - 40) / 2);
        const actionHeight = calculateTextHeight(item.action, (CONTENT_WIDTH - 40) / 2);
        const contentHeight = Math.max(constatHeight, actionHeight);
        const totalHeight = contentHeight + 20;

        // Check if we need a new page
        if (checkAndAddNewPage(totalHeight)) {
          yPosition = HEADER_HEIGHT + 10;
        }

        const startY = yPosition;

        // Draw box with rounded corners
        doc.setFillColor(252, 242, 242);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, totalHeight, 2, 2, 'F');

        // Title with light red background
        doc.setFillColor(255, 235, 235);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, 8, 2, 2, 'F');
        doc.setTextColor(180, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(`NCM${index + 1} - ${String(item.name)}`, MARGIN_X + 10, startY + 6);

        // Draw vertical separator
        const separatorX = MARGIN_X + 5 + ((CONTENT_WIDTH - 10) / 2);
        doc.setDrawColor(220, 220, 220);
        doc.line(separatorX, startY + 8, separatorX, startY + totalHeight);

        // Render constat and action
        const contentY = startY + 12;
        renderWrappedText(
          item.constat,
          MARGIN_X + 12,
          contentY,
          (CONTENT_WIDTH - 40) / 2,
          'Constat:'
        );

        renderWrappedText(
          item.action,
          separatorX + 8,
          contentY,
          (CONTENT_WIDTH - 40) / 2,
          'Action:'
        );

        yPosition = startY + totalHeight + 4;
      });
    }

    // Add margin between sections
    if (data.nonConformiteMajeure.length > 0 && data.nonConformes.length > 0) {
      yPosition += 8;
    }

    // Render non-conformities if any exist
    if (data.nonConformes.length > 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(MARGIN_X, yPosition - 2, CONTENT_WIDTH, 10, 'F');
      doc.setFontSize(10);
      doc.setTextColor(200, 100, 0); // Orange color
      doc.setFont('helvetica', 'normal');
      doc.text('RECAPITULATIF DES NON-CONFORMITÉS', MARGIN_X + 5, yPosition + 4);
      yPosition += 12;

      data.nonConformes.forEach((item, index) => {
        // Calculate heights
        const constatHeight = calculateTextHeight(item.constat, (CONTENT_WIDTH - 40) / 2);
        const actionHeight = calculateTextHeight(item.action, (CONTENT_WIDTH - 40) / 2);
        const contentHeight = Math.max(constatHeight, actionHeight);
        const totalHeight = contentHeight + 20;

        // Check if we need a new page
        if (checkAndAddNewPage(totalHeight)) {
          yPosition = HEADER_HEIGHT + 10;
        }

        const startY = yPosition;

        // Draw box with rounded corners (light orange background)
        doc.setFillColor(255, 245, 235);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, totalHeight, 2, 2, 'F');

        // Title with orange background
        doc.setFillColor(255, 240, 225);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, 8, 2, 2, 'F');
        doc.setTextColor(200, 100, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(`NC${index + 1} - ${String(item.name)}`, MARGIN_X + 10, startY + 6);

        // Draw vertical separator
        const separatorX = MARGIN_X + 5 + ((CONTENT_WIDTH - 10) / 2);
        doc.setDrawColor(220, 220, 220);
        doc.line(separatorX, startY + 8, separatorX, startY + totalHeight);

        // Render constat and action
        const contentY = startY + 12;
        renderWrappedText(
          item.constat,
          MARGIN_X + 12,
          contentY,
          (CONTENT_WIDTH - 40) / 2,
          'Constat:'
        );

        renderWrappedText(
          item.action,
          separatorX + 8,
          contentY,
          (CONTENT_WIDTH - 40) / 2,
          'Action:'
        );

        yPosition = startY + totalHeight + 4;
      });
    }

    // Add more margin between non-conformities and observations
    if (data.nonConformes.length > 0 && data.observations.length > 0) {
      yPosition += 8; // Add extra space between the two sections
    }

    // Render observations if any exist
    if (data.observations.length > 0) {
      checkAndAddNewPage(30);

      doc.setFillColor(245, 245, 245);
      doc.rect(MARGIN_X, yPosition - 2, CONTENT_WIDTH, 10, 'F');
      doc.setFontSize(10);
      doc.setTextColor(150, 120, 0);
      doc.text('OBSERVATIONS', MARGIN_X + 5, yPosition + 4);
      yPosition += 12;

      data.observations.forEach((item, index) => {
        // Calculate height
        const constatHeight = calculateTextHeight(item.constat, (CONTENT_WIDTH - 40) / 2);
        const actionHeight = calculateTextHeight(item.action, (CONTENT_WIDTH - 40) / 2);
        const contentHeight = Math.max(constatHeight, actionHeight);
        const totalHeight = contentHeight + 20;

        // Check if we need a new page
        if (checkAndAddNewPage(totalHeight)) {
          yPosition = HEADER_HEIGHT + 10;
        }

        const startY = yPosition;

        // Draw box with rounded corners
        doc.setFillColor(255, 252, 240);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, totalHeight, 2, 2, 'F');

        // Title with light yellow background
        doc.setFillColor(255, 250, 230);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, 8, 2, 2, 'F');
        doc.setTextColor(150, 120, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(`OBS${index + 1} - ${String(item.name)}`, MARGIN_X + 10, startY + 6);

        // Draw vertical separator
        const separatorX = MARGIN_X + 5 + ((CONTENT_WIDTH - 10) / 2);
        doc.setDrawColor(220, 220, 220);
        doc.line(separatorX, startY + 8, separatorX, startY + totalHeight);

        // Render constat and action
        const contentY = startY + 12;
        renderWrappedText(
          item.constat,
          MARGIN_X + 12,
          contentY,
          (CONTENT_WIDTH - 40) / 2,
          'Constat:'
        );

        renderWrappedText(
          item.action,
          separatorX + 8,
          contentY,
          (CONTENT_WIDTH - 40) / 2,
          'Action:'
        );

        yPosition = startY + totalHeight + 4;
      });
    }

    yPosition += 10; // Increased from 3 to 10 for more space between action owners
  };

  // First render all assigned actionOwners
  Array.from(actionOwnerMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([actionOwner, data]) => {
      renderActionOwnerData(data, actionOwner);
    });

  // Then render 'Non assigné' if it exists
  if (nonAssigneData) {
    renderActionOwnerData(nonAssigneData, 'Non assigné');
  }

  // Audit Elements section
  doc.addPage();
  addHeader(doc, building, audit);
  yPosition = HEADER_HEIGHT + 5;

  if (audit.templateVersion === 2) {
    // Render by sections
    const validSections = sections.filter(section => 
      categories.some(category => category.section === section._id)
    );

    // Sort sections by position
    const sortedSections = sortSectionsByPosition(validSections);

    sortedSections.forEach((section, index) => {
      // Always start a new page for each section
      if (index > 0) {
        doc.addPage();
        addHeader(doc, building, audit);
        yPosition = HEADER_HEIGHT + 5;
      }

      // Section title
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(HEADER_BG_COLOR[0], HEADER_BG_COLOR[1], HEADER_BG_COLOR[2]);
      doc.text(String(section.name || ''), MARGIN_X, yPosition);
      yPosition += 10;

      // Get categories for this section and sort them
      const sectionCategories = sortByPosition(
        categories.filter(category => category.section === section._id),
        audit.templateVersion
      );

      // Render categories
      sectionCategories.forEach(category => {
        yPosition = renderCategory(audit, building, category, templateElements, auditElements, subCategories, regulatories, doc, yPosition, section._id);
      });
    });
  } else {
    // Render categories directly
    const validCategories = categories
      .filter(category => category.templateVersion?.includes(audit.templateVersion));

    const sortedCategories = sortByPosition(validCategories, audit.templateVersion);

    sortedCategories.forEach(category => {
      yPosition = renderCategory(audit, building, category, templateElements, auditElements, subCategories, regulatories, doc, yPosition, undefined);
    });
  }

  // Images section
  if (images && images.length > 0) {
    doc.addPage();
    addHeader(doc, building, audit);
    yPosition = HEADER_HEIGHT + 5;
    doc.setFontSize(12);
    doc.setTextColor(HEADER_BG_COLOR[0], HEADER_BG_COLOR[1], HEADER_BG_COLOR[2]);
    doc.text('ANNEXES', MARGIN_X, yPosition);
    yPosition += 15;

    const imagesPerRow = 4;
    const imageWidth = (CONTENT_WIDTH) / imagesPerRow;
    const imageHeight = imageWidth * 0.75; // 4:3 aspect ratio
    let currentImageInRow = 0;

    for (const image of images) {
      if (yPosition + imageHeight > doc.internal.pageSize.height - FOOTER_HEIGHT) {
        doc.addPage();
        addHeader(doc, building, audit);
        yPosition = HEADER_HEIGHT + 5;
        currentImageInRow = 0;
      }

      const xPosition = MARGIN_X + (currentImageInRow * (imageWidth + 10));

      try {
        const img = new Image();
        img.src = image.url;
        await new Promise((resolve, reject) => {
          img.onload = () => {
            try {
              // Add image to PDF
              doc.addImage({ 
                imageData: img, 
                x: xPosition, 
                y: yPosition,
                width: imageWidth,
                height: imageHeight,
                compression: 'FAST'
              });

              // Add image name below
              doc.setFontSize(8);
              doc.setTextColor(0, 0, 0);
              const nameLines = doc.splitTextToSize(String(image.name || ''), imageWidth);
              doc.text(nameLines, xPosition, yPosition + imageHeight + 5);
              resolve(null);
            } catch (error) {
              reject(error);
            }
          };
          img.onerror = reject;
        });

        currentImageInRow++;
        if (currentImageInRow === imagesPerRow) {
          currentImageInRow = 0;
          yPosition += imageHeight + 20;
        }
      } catch (error) {
        console.error('Error processing image:', error);
        // Add placeholder for failed image
        doc.setFillColor(240, 240, 240);
        doc.rect(xPosition, yPosition, imageWidth, imageHeight, 'F');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Image non disponible', xPosition + 5, yPosition + imageHeight / 2);

        currentImageInRow++;
        if (currentImageInRow === imagesPerRow) {
          currentImageInRow = 0;
          yPosition += imageHeight + 20;
        }
      }
    }
  }

  addFooter(doc);
  return doc;
};

export { generateAuditPDF };