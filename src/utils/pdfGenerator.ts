import { jsPDF } from 'jspdf';
import { Building, Audit, Section, Category, SubCategory, Regulatory, Image, TemplateElement, ExpandedElement, AuditElement } from '../types';
import { sortByPosition, sortSectionsByPosition, sortExpandedTemplateElements, formatDateToFrench, formatDate } from './index';

interface TableRow {
  label: string;
  value: string;
}

interface PDFGeneratorOptions {
  building: Building;
  audit: Audit;
  sections: Section[];
  categories: Category[]; 
  subCategories: SubCategory[];
  regulatories: Regulatory[];
  infoTableRows: TableRow[];
  arretePrefectoralRows: TableRow[];
  exploitationRows: TableRow[];
  auditRows: TableRow[];
  templateElements: TemplateElement[];
  auditElements: AuditElement[];
  images: Image[];
}

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

const renderAuditElementRow = (expandedElement: ExpandedElement, startY: number, doc: jsPDF) => {
  doc.setFontSize(9);
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
  
  const name = String(expandedElement.name || '');
  const constat = String(expandedElement.auditElement?.constat || '');
  const status = String(expandedElement.auditElement?.status || '');

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

  // Calculate vertical center position for text
  const textStartY = startY + (padding / 2);

  // Add text centered vertically
  doc.text(nameLines, xPositions[0] + 2, textStartY);
  doc.text(constatLines, xPositions[1] + 2, textStartY);
  doc.text(statusLines, xPositions[2] + 2, textStartY);

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
  return elements.flatMap((templateElement): ExpandedElement[] => {
    // Find all matching audit elements for this template element
    const matchingAuditElements = auditElements.filter(ae => ae.templateElementId === templateElement._id);

    // If no audit elements found, return the template element with null audit element
    if (matchingAuditElements.length === 0) {
      return [{
        ...templateElement,
        auditElement: null
      }];
    }

    // Create a copy of the template element for each matching audit element
    return matchingAuditElements.map(auditElement => ({
      ...templateElement,
      auditElement
    }));
  });
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

const renderSubCategory = (subCategory: SubCategory, templateElements: TemplateElement[], building: Building, audit: Audit, auditElements: AuditElement[], regulatories: Regulatory[], doc: jsPDF, yPosition: number): number => {
  // Get elements for this subcategory
  const elements = getTemplateElementsForSubCategory(subCategory, templateElements, audit, auditElements);
  
  // Calculate total height needed
  const titleHeight = 8;
  const regulatoryHeight = 0;
  const elementHeight = elements.length * 15;
  const totalHeight = titleHeight + regulatoryHeight + elementHeight;

  if (yPosition + titleHeight > doc.internal.pageSize.height - FOOTER_HEIGHT - 30 ||
      yPosition + totalHeight > doc.internal.pageSize.height - FOOTER_HEIGHT) {
    doc.addPage();
    addHeader(doc, building, audit);
    yPosition = HEADER_HEIGHT + 5;
  }

  // SubCategory title with background
  doc.setFillColor(LIGHTGREEN_BG_COLOR[0], LIGHTGREEN_BG_COLOR[1], LIGHTGREEN_BG_COLOR[2]);
  doc.rect(MARGIN_X, yPosition - 3, CONTENT_WIDTH, titleHeight, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  
  // Center text horizontally and vertically
  const text = String(subCategory.name || '');
  const textWidth = doc.getTextWidth(text);
  const xPos = MARGIN_X + (CONTENT_WIDTH - textWidth) / 2;
  doc.text(text, xPos, yPosition + 2);
  
  yPosition += titleHeight;

  // Render regulatory for this subcategory if exists
  const regulatory = regulatories.find(r => r.subCategoryId === subCategory._id);
  if (regulatory) {
    const height = renderRegulatory(regulatory, doc, yPosition, building, audit);
    yPosition += height; // Removed extra spacing
  }

  // Render elements with no extra spacing
  const expandedElements = expandTemplateElements(elements, auditElements);
  expandedElements.forEach(expandedElement => {
    const rowHeight = renderAuditElementRow(expandedElement, yPosition, doc);
    yPosition += rowHeight;
  });

  return yPosition;
};

const renderCategory = (audit: Audit, building: Building, category: Category, templateElements: TemplateElement[], auditElements: AuditElement[], subCategories: SubCategory[], regulatories: Regulatory[], doc: jsPDF, yPosition: number, sectionId?: string) => {
  // Get and sort subcategories
  const categorySubCategories = sortByPosition(
    subCategories.filter(sc => sc.categoryId === category._id),
    audit.templateVersion
  ) as SubCategory[];

  // Get direct elements
  const directElements = getDirectTemplateElements(category._id, templateElements, audit, auditElements);

  // Calculate total height needed
  const titleHeight = 8;
  const regulatoryHeight = 0; // Will be calculated if regulatory exists
  const subCategoriesHeight = categorySubCategories.reduce((acc: number, sc: SubCategory) => {
    const elements = getTemplateElementsForSubCategory(sc, templateElements, audit, auditElements);
    return acc + 8 + (elements.length * 15); // title + elements
  }, 0);
  const directElementsHeight = directElements.length * 15;
  const totalHeight = titleHeight + regulatoryHeight + subCategoriesHeight + directElementsHeight;

  // If content would split across pages, start on new page
  if (yPosition + titleHeight > doc.internal.pageSize.height - FOOTER_HEIGHT - 30 ||
      yPosition + totalHeight > doc.internal.pageSize.height - FOOTER_HEIGHT) {
    doc.addPage();
    addHeader(doc, building, audit);
    yPosition = HEADER_HEIGHT + 5;
  }

  // Category title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold'); // Set bold font
  doc.setFillColor(GREEN_BG_COLOR[0], GREEN_BG_COLOR[1], GREEN_BG_COLOR[2]);
  doc.rect(MARGIN_X, yPosition - 3, CONTENT_WIDTH, titleHeight, 'F');
  doc.setTextColor(255, 255, 255);
  
  // Center text horizontally and vertically
  const text = String(category.name || '');
  const textWidth = doc.getTextWidth(text);
  const xPos = MARGIN_X + (CONTENT_WIDTH - textWidth) / 2;
  doc.text(text, xPos, yPosition + 2);
  
  doc.setFont('helvetica', 'normal'); // Reset font weight
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
      yPosition += height; // Removed extra spacing
    }
  }

  // Render subcategories
  categorySubCategories.forEach(subCategory => {
    yPosition = renderSubCategory(subCategory, templateElements, building, audit, auditElements, regulatories, doc, yPosition);
  });

  // Render direct elements if any
  if (directElements.length > 0) {
    const expandedDirectElements = expandTemplateElements(directElements, auditElements);
    expandedDirectElements.forEach(element => {
      const rowHeight = renderAuditElementRow(element, yPosition, doc);
      yPosition += rowHeight;
    });
  }

  return yPosition + 4; // Small spacing between categories
};

const loadImage = async (imageData: string): Promise<string> => {
  try {
    // If it's already a base64 string, return it
    if (imageData.startsWith('data:image')) {
      return imageData;
    }

    // If it's a URL, try to load it
    const response = await fetch(imageData);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to convert image to base64'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    return ''; // Return empty string if image loading fails
  }
};

const generateAuditPDF = async (options: PDFGeneratorOptions): Promise<jsPDF> => {
  const {
    building,
    audit,
    sections,
    categories,
    subCategories,
    regulatories,
    infoTableRows,
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
  const addressWidth = doc.getTextWidth(address);
  const rightX = doc.internal.pageSize.width - MARGIN_X - addressWidth;
  doc.text(address, rightX, doc.internal.pageSize.height - 30);

  // Page 3: Exploitation & Visit info
  doc.addPage();
  addHeader(doc, building, audit);
  let yPosition = HEADER_HEIGHT + 5;
  yPosition = addInfoTable(doc, infoTableRows, 'INFORMATIONS GÉNÉRALES', yPosition);
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
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(HEADER_BG_COLOR[0], HEADER_BG_COLOR[1], HEADER_BG_COLOR[2]);
  doc.text('SYNTHÈSE', MARGIN_X, yPosition);
  yPosition += 15;

  // Get all non-conformities and observations
  const nonConformes = templateElements.flatMap(element => {
    // Find all audit elements for this template element
    const matchingAuditElements = auditElements.filter(ae => 
      ae.templateElementId === element._id && 
      ae.status === 'Non conforme'
    );

    return matchingAuditElements.map(auditElement => ({
      name: element.name,
      constat: auditElement.constat,
      action: auditElement.action,
      actors: audit.actors || [] // Get actors array from audit
    }));
  });

  const observations = templateElements.flatMap(element => {
    // Find all audit elements for this template element
    const matchingAuditElements = auditElements.filter(ae => 
      ae.templateElementId === element._id && 
      ae.status === 'Observation'
    );

    return matchingAuditElements.map(auditElement => ({
      name: element.name,
      constat: auditElement.constat,
      actors: audit.actors || [] // Get actors array from audit
    }));
  });

  // Group by actors
  const actorsSet = new Set(audit.actors || ['Non assigné']);
  
  Array.from(actorsSet).forEach(actor => {
    if (!actor) return;

    doc.setFontSize(12);
    doc.setTextColor(HEADER_BG_COLOR[0], HEADER_BG_COLOR[1], HEADER_BG_COLOR[2]);
    doc.text(actor, MARGIN_X, yPosition);
    yPosition += 10;

    // Non conformités for this actor
    const actorNonConformes = nonConformes.filter(item => 
      (item.actors || []).includes(actor)
    );

    actorNonConformes.forEach((item, index) => {
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(255, 240, 240);
      const boxHeight = 21;
      doc.rect(MARGIN_X + 5, yPosition - 5, CONTENT_WIDTH - 10, boxHeight, 'F');
      doc.text(`NCM${index + 1} - ${String(item.name || '')}`, MARGIN_X + 10, yPosition);
      yPosition += 5;
      
      const constat = `Constat: ${String(item.constat || '')}`;
      const constLines = doc.splitTextToSize(constat, CONTENT_WIDTH - 20);
      doc.text(constLines[0], MARGIN_X + 15, yPosition);
      yPosition += 5;
      
      const action = `Action: ${String(item.action || '')}`;
      const actionLines = doc.splitTextToSize(action, CONTENT_WIDTH - 20);
      doc.text(actionLines[0], MARGIN_X + 15, yPosition);
      yPosition += 8;
    });

    // Observations for this actor
    const actorObservations = observations.filter(item => 
      (item.actors || []).includes(actor)
    );

    actorObservations.forEach((item, index) => {
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(255, 252, 235);
      const boxHeight = 16;
      doc.rect(MARGIN_X + 5, yPosition - 5, CONTENT_WIDTH - 10, boxHeight, 'F');
      doc.text(`OBS${index + 1} - ${String(item.name || '')}`, MARGIN_X + 10, yPosition);
      yPosition += 5;
      
      const constat = `Constat: ${String(item.constat || '')}`;
      const constLines = doc.splitTextToSize(constat, CONTENT_WIDTH - 20);
      doc.text(constLines, MARGIN_X + 15, yPosition);
      yPosition += 8;
    });

    yPosition += 5;
  });

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

    const imagesPerRow = 2;
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
        const imageData = await loadImage(image.url);
        if (imageData) {
          // Add image to PDF
          doc.addImage(
            imageData,
            'JPEG',
            xPosition,
            yPosition,
            imageWidth,
            imageHeight,
            undefined,
            'FAST'
          );

          // Add image name below
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          const nameLines = doc.splitTextToSize(String(image.name || ''), imageWidth);
          doc.text(nameLines, xPosition, yPosition + imageHeight + 5);
        } else {
          // Add placeholder for failed image
          doc.setFillColor(240, 240, 240);
          doc.rect(xPosition, yPosition, imageWidth, imageHeight, 'F');
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text('Image non disponible', xPosition + 5, yPosition + imageHeight / 2);
        }

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