import { jsPDF } from 'jspdf';
import { Building, Audit, Section, Category, SubCategory, Regulatory, Image, TemplateElement, ExpandedElement, AuditElement } from '../types';
import { sortByPosition, sortSectionsByPosition, sortExpandedTemplateElements } from './index';

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
const CATEGORY_BG_COLOR = [160, 205, 99] as [number, number, number];
const SUBCATEGORY_BG_COLOR = [235, 241, 217] as [number, number, number];

const addHeader = (doc: jsPDF) => {
  // Add green background
  doc.setFillColor(HEADER_BG_COLOR[0], HEADER_BG_COLOR[1], HEADER_BG_COLOR[2]);
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F');
  
  // Add text
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('Audit de conformité réglementaire', MARGIN_X, HEADER_HEIGHT - 5);
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
    doc.setTextColor(0, 106, 60); // Green color for titles
    doc.text(title, MARGIN_X, startY);
    startY += 10;
  }

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const cellPadding = 5;
  const labelWidth = 80;
  const valueWidth = CONTENT_WIDTH - labelWidth - 40;

  rows.forEach(row => {
    // Draw label cell
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(240, 240, 240);
    doc.rect(MARGIN_X, startY - 5, labelWidth, 7, 'FD');
    doc.text(String(row.label || ''), MARGIN_X + 2, startY);

    // Draw value cell
    doc.setFillColor(255, 255, 255);
    doc.rect(MARGIN_X + labelWidth, startY - 5, valueWidth, 7, 'FD');
    const value = String(row.value || '');
    // Split long text if needed
    if (doc.getTextWidth(value) > valueWidth - 4) {
      const lines = doc.splitTextToSize(value, valueWidth - 4);
      doc.text(lines[0], MARGIN_X + labelWidth + 2, startY);
    } else {
      doc.text(value, MARGIN_X + labelWidth + 2, startY);
    }

    startY += cellPadding + 4;
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
  const rowHeight = maxLines * 4 + 6;

  // Draw backgrounds and borders
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(200, 200, 200);
  
  // Name column
  doc.rect(xPositions[0], startY - 3, nameWidth - 2, rowHeight, 'FD');
  
  // Constat column
  doc.rect(xPositions[1], startY - 3, constatWidth - 2, rowHeight, 'FD');
  
  // Status column
  doc.rect(xPositions[2], startY - 3, statusWidth - 2, rowHeight, 'FD');

  // Add text
  doc.text(nameLines, xPositions[0] + 2, startY);
  doc.text(constatLines, xPositions[1] + 2, startY);
  doc.text(statusLines, xPositions[2] + 2, startY);

  return rowHeight;
};

const renderRegulatory = (regulatory: Regulatory, doc: jsPDF, yPosition: number): number => {
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(240, 240, 240);
  
  const text = String(regulatory.text || '');
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH - 4);
  const height = lines.length * 4 + 6;
  
  // Check if regulatory would overflow page
  if (yPosition + height > doc.internal.pageSize.height - FOOTER_HEIGHT) {
    doc.addPage();
    addHeader(doc);
    yPosition = HEADER_HEIGHT + 10;
  }
  
  doc.rect(MARGIN_X, yPosition - 3, CONTENT_WIDTH, height, 'F');
  doc.text(lines, MARGIN_X + 2, yPosition);
  return height;
};

const expandTemplateElements = (elements: TemplateElement[], auditElements: AuditElement[]): any[] => {
  console.log('Expanding template elements:', elements.length);
  return elements.flatMap((templateElement): any[] => {
    // Find all matching audit elements for this template element
    const matchingAuditElements = auditElements.filter(ae => ae.templateElementId === templateElement._id);
    console.log(`Found ${matchingAuditElements.length} audit elements for template element ${templateElement._id}`);

    // If no audit elements found, return the template element with null audit element
    if (matchingAuditElements.length === 0) {
      console.log('No audit elements found, returning template element with null audit');
      return [{
        ...templateElement,
        auditElement: null
      }];
    }

    // Create a copy of the template element for each matching audit element
    console.log('Creating expanded elements with audit elements');
    return matchingAuditElements.map(auditElement => ({
      ...templateElement,
      auditElement
    }));
  });
};

const getTemplateElementsForSubCategory = (subCategory: SubCategory, templateElements: TemplateElement[], audit: Audit, auditElements: AuditElement[]): any[] => {
  console.log(`Getting template elements for subcategory ${subCategory._id}`);
  const elements = templateElements.filter(element => 
    element.subCategoryId === subCategory._id && 
    element.templateVersion?.includes(audit.templateVersion)
  );
  console.log(`Found ${elements.length} template elements for subcategory`);
  
  const expandedElements = expandTemplateElements(elements, auditElements);
  const sortedElements = sortExpandedTemplateElements(expandedElements, audit.templateVersion);
  console.log(`Returning ${sortedElements.length} sorted elements for subcategory`);
  return sortedElements;
};

const getDirectTemplateElements = (categoryId: string, templateElements: TemplateElement[], audit: Audit, auditElements: AuditElement[]): any[] => {
  console.log(`Getting direct template elements for category ${categoryId}`);
  const elements = templateElements.filter(element => 
    element.categoryId === categoryId && 
    !element.subCategoryId && 
    element.templateVersion?.includes(audit.templateVersion)
  );
  console.log(`Found ${elements.length} direct template elements for category`);
  
  const expandedElements = expandTemplateElements(elements, auditElements);
  const sortedElements = sortExpandedTemplateElements(expandedElements, audit.templateVersion);
  console.log(`Returning ${sortedElements.length} sorted direct elements for category`);
  return sortedElements;
};

const renderSubCategory = (subCategory: SubCategory, templateElements: TemplateElement[], audit: Audit, auditElements: AuditElement[], regulatories: Regulatory[], doc: jsPDF, yPosition: number): number => {
  // Get elements for this subcategory
  const elements = getTemplateElementsForSubCategory(subCategory, templateElements, audit, auditElements);
  
  // Calculate total height needed
  const titleHeight = 8;
  const regulatoryHeight = 0; // Will be calculated if regulatory exists
  const elementHeight = elements.length * 15; // Approximate height per element
  const totalHeight = titleHeight + regulatoryHeight + elementHeight;

  // If content would split across pages, start on new page
  if (yPosition + titleHeight > doc.internal.pageSize.height - FOOTER_HEIGHT - 30 ||
      yPosition + totalHeight > doc.internal.pageSize.height - FOOTER_HEIGHT) {
    doc.addPage();
    addHeader(doc);
    yPosition = HEADER_HEIGHT + 5;
  }

  // SubCategory title with background
  doc.setFillColor(SUBCATEGORY_BG_COLOR[0], SUBCATEGORY_BG_COLOR[1], SUBCATEGORY_BG_COLOR[2]);
  doc.rect(MARGIN_X, yPosition - 3, CONTENT_WIDTH, titleHeight, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(String(subCategory.name || ''), MARGIN_X + 10, yPosition + 2);
  yPosition += titleHeight;

  // Render regulatory for this subcategory if exists
  const regulatory = regulatories.find(r => r.subCategoryId === subCategory._id);
  if (regulatory) {
    const height = renderRegulatory(regulatory, doc, yPosition);
    yPosition += height + 4;
  }

  // Render elements
  elements.forEach(element => {
    const rowHeight = renderAuditElementRow(element, yPosition, doc);
    yPosition += rowHeight + 1; // Reduced spacing between elements
  });

  return yPosition;
};

const renderCategory = (audit: Audit, category: Category, templateElements: TemplateElement[], auditElements: AuditElement[], subCategories: SubCategory[], regulatories: Regulatory[], doc: jsPDF, yPosition: number, sectionId?: string) => {
  // Get and sort subcategories
  const categorySubCategories = sortByPosition(
    subCategories.filter(sc => sc.categoryId === category._id),
    audit.templateVersion
  );

  // Get direct elements
  const directElements = getDirectTemplateElements(category._id, templateElements, audit, auditElements);

  // Calculate total height needed
  const titleHeight = 8;
  const regulatoryHeight = 0; // Will be calculated if regulatory exists
  const subCategoriesHeight = categorySubCategories.reduce((acc, sc) => {
    const elements = getTemplateElementsForSubCategory(sc, templateElements, audit, auditElements);
    return acc + 8 + (elements.length * 15); // title + elements
  }, 0);
  const directElementsHeight = directElements.length * 15;
  const totalHeight = titleHeight + regulatoryHeight + subCategoriesHeight + directElementsHeight;

  // If content would split across pages, start on new page
  if (yPosition + titleHeight > doc.internal.pageSize.height - FOOTER_HEIGHT - 30 ||
      yPosition + totalHeight > doc.internal.pageSize.height - FOOTER_HEIGHT) {
    doc.addPage();
    addHeader(doc);
    yPosition = HEADER_HEIGHT + 5;
  }

  // Category title
  doc.setFontSize(12);
  doc.setFillColor(CATEGORY_BG_COLOR[0], CATEGORY_BG_COLOR[1], CATEGORY_BG_COLOR[2]);
  doc.rect(MARGIN_X, yPosition - 3, CONTENT_WIDTH, titleHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(String(category.name || ''), MARGIN_X + 2, yPosition + 2);
  yPosition += titleHeight;

  // Render regulatory if exists
  if (sectionId) {
    const regulatory = regulatories.find(
      r => r.sectionId === sectionId && 
           r.categoryId === category._id && 
           (!r.subCategoryId || r.subCategoryId === "null" || r.subCategoryId === "")
    );
    if (regulatory) {
      const height = renderRegulatory(regulatory, doc, yPosition);
      yPosition += height + 4;
    }
  }

  // Render subcategories
  categorySubCategories.forEach(subCategory => {
    yPosition = renderSubCategory(subCategory, templateElements, audit, auditElements, regulatories, doc, yPosition);
  });

  // Render direct elements if any
  if (directElements.length > 0) {
    directElements.forEach(element => {
      const rowHeight = renderAuditElementRow(element, yPosition, doc);
      yPosition += rowHeight + 1; // Reduced spacing between elements
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

  // Page 1: Info Table
  addHeader(doc);
  let yPosition = addInfoTable(doc, infoTableRows);

  // Page 2: Arrêté préfectoral & Exploitation info
  doc.addPage();
  addHeader(doc);
  yPosition = HEADER_HEIGHT + 5;
  yPosition = addInfoTable(doc, arretePrefectoralRows, 'Informations relatives à l\'arrêté préfectoral', yPosition);
  yPosition += 10;
  yPosition = addInfoTable(doc, exploitationRows, 'Informations relatives à l\'exploitation', yPosition);
  yPosition = addInfoTable(doc, auditRows, undefined, yPosition);

  // Page 3: ICPE Table
  doc.addPage();
  addHeader(doc);
  yPosition = HEADER_HEIGHT + 5;
  doc.setFontSize(12);
  doc.setTextColor(0, 106, 60);
  doc.text('Rubriques ICPE', MARGIN_X, yPosition);
  yPosition += 15;

  // Define column widths
  const colWidths = {
    rubrique: 35,
    nature: 70,
    capacite: 45,
    regime: 30
  };

  // ICPE Table header
  doc.setFillColor(0, 106, 60);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  let xPos = MARGIN_X;
  
  // Draw header cells
  doc.rect(xPos, yPosition - 5, colWidths.rubrique, 7, 'F');
  doc.text('Rubrique', xPos + 2, yPosition);
  xPos += colWidths.rubrique;
  
  doc.rect(xPos, yPosition - 5, colWidths.nature, 7, 'F');
  doc.text('Nature des activités', xPos + 2, yPosition);
  xPos += colWidths.nature;
  
  doc.rect(xPos, yPosition - 5, colWidths.capacite, 7, 'F');
  doc.text('Capacité', xPos + 2, yPosition);
  xPos += colWidths.capacite;
  
  doc.rect(xPos, yPosition - 5, colWidths.regime, 7, 'F');
  doc.text('Régime', xPos + 2, yPosition);
  
  yPosition += 8;

  // ICPE Table content
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  building?.icpeTypes?.forEach((icpe) => {
    if (yPosition > doc.internal.pageSize.height - FOOTER_HEIGHT) {
      doc.addPage();
      addHeader(doc);
      yPosition = HEADER_HEIGHT + 5;
    }

    xPos = MARGIN_X;
    
    // Calculate required height for description
    const description = String(icpe.description || '');
    const descLines = doc.splitTextToSize(description, colWidths.nature - 4);
    const capacity = String(icpe.capacity || '');
    const capLines = doc.splitTextToSize(capacity, colWidths.capacite - 4);
    const maxLines = Math.max(descLines.length, capLines.length);
    const actualRowHeight = Math.max(7, maxLines * 4 + 3);
    
    // Draw content cells with borders
    doc.rect(xPos, yPosition - 5, colWidths.rubrique, actualRowHeight);
    doc.text(String(icpe.rubrique || ''), xPos + 2, yPosition);
    xPos += colWidths.rubrique;
    
    doc.rect(xPos, yPosition - 5, colWidths.nature, actualRowHeight);
    doc.text(descLines[0], xPos + 2, yPosition);
    xPos += colWidths.nature;
    
    doc.rect(xPos, yPosition - 5, colWidths.capacite, actualRowHeight);
    doc.text(capLines[0], xPos + 2, yPosition);
    xPos += colWidths.capacite;
    
    doc.rect(xPos, yPosition - 5, colWidths.regime, actualRowHeight);
    doc.text(String(icpe.regime || ''), xPos + 2, yPosition);
    
    yPosition += actualRowHeight + 1;
  });

  // Page 4: Synthèse
  doc.addPage();
  addHeader(doc);
  yPosition = HEADER_HEIGHT + 5;
  doc.setFontSize(12);
  doc.setTextColor(0, 106, 60);
  doc.text('Synthèse', MARGIN_X, yPosition);
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
    doc.setTextColor(0, 106, 60);
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
      doc.text(constLines[0], MARGIN_X + 15, yPosition);
      yPosition += 8;
    });

    yPosition += 5;
  });

  // Audit Elements section
  doc.addPage();
  addHeader(doc);
  yPosition = HEADER_HEIGHT + 5;

  if (audit.templateVersion === 2) {
    // Render by sections
    const validSections = sections.filter(section => 
      categories.some(category => category.section === section._id)
    );

    validSections.forEach(section => {
      // Section title
      if (yPosition > doc.internal.pageSize.height - FOOTER_HEIGHT - 30) {
        doc.addPage();
        addHeader(doc);
        yPosition = HEADER_HEIGHT + 5;
      }

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(String(section.name || ''), MARGIN_X, yPosition);
      yPosition += 10;

      // Get categories for this section and sort them
      const sectionCategories = sortByPosition(
        categories.filter(category => category.section === section._id),
        audit.templateVersion
      );

      // Render categories
      sectionCategories.forEach(category => {
        yPosition = renderCategory(audit, category, templateElements, auditElements, subCategories, regulatories, doc, yPosition, section._id);
      });
    });
  } else {
    // Render categories directly
    const validCategories = categories
      .filter(category => category.templateVersion?.includes(audit.templateVersion));

    const sortedCategories = sortByPosition(validCategories, audit.templateVersion);

    sortedCategories.forEach(category => {
      yPosition = renderCategory(audit, category, templateElements, auditElements, subCategories, regulatories, doc, yPosition, undefined);
    });
  }

  // Images section
  if (images && images.length > 0) {
    doc.addPage();
    addHeader(doc);
    yPosition = HEADER_HEIGHT + 5;
    doc.setFontSize(12);
    doc.setTextColor(0, 106, 60);
    doc.text('ANNEXES', MARGIN_X, yPosition);
    yPosition += 15;

    const imagesPerRow = 2;
    const imageWidth = (CONTENT_WIDTH) / imagesPerRow;
    const imageHeight = imageWidth * 0.75; // 4:3 aspect ratio
    let currentImageInRow = 0;

    for (const image of images) {
      if (yPosition + imageHeight > doc.internal.pageSize.height - FOOTER_HEIGHT) {
        doc.addPage();
        addHeader(doc);
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
