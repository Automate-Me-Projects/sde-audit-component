import { jsPDF } from 'jspdf';
import { Building, Audit, Section, Category, SubCategory, Regulatory, Image, TemplateElement, AuditElement } from '../types';
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

const addHeader = (doc: jsPDF) => {
  // Add logo
  // doc.addImage('logo.png', 'PNG', 20, 10, 40, 20); // Uncomment and add logo if available
  doc.setFillColor(0, 106, 60); // RGB color for the green header
  doc.rect(0, 0, doc.internal.pageSize.width, 30, 'F');
  doc.setTextColor(255, 255, 255); // White text
  doc.setFontSize(16);
  doc.text('Audit de conformité réglementaire', 20, 20);
  doc.setTextColor(0, 0, 0); // Reset to black text
};

const addFooter = (doc: jsPDF) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i}/${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
  }
};

const addInfoTable = (doc: jsPDF, rows: TableRow[], title?: string, startY: number = 40) => {
  if (title) {
    doc.setFontSize(12);
    doc.setTextColor(0, 106, 60); // Green color for titles
    doc.text(title, 20, startY);
    startY += 10;
  }

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const cellPadding = 5;
  const labelWidth = 80;
  const valueWidth = doc.internal.pageSize.width - labelWidth - 40;

  rows.forEach(row => {
    // Draw label cell
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(240, 240, 240);
    doc.rect(20, startY - 5, labelWidth, 7, 'FD');
    doc.text(String(row.label || ''), 22, startY);

    // Draw value cell
    doc.setFillColor(255, 255, 255);
    doc.rect(20 + labelWidth, startY - 5, valueWidth, 7, 'FD');
    const value = String(row.value || '');
    // Split long text if needed
    if (doc.getTextWidth(value) > valueWidth - 4) {
      const lines = doc.splitTextToSize(value, valueWidth - 4);
      doc.text(lines[0], 22 + labelWidth, startY);
    } else {
      doc.text(value, 22 + labelWidth, startY);
    }

    startY += cellPadding + 4;
  });

  return startY;
};

const renderAuditElementRow = (expandedElement: any, startY: number) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const columnWidth = (doc.internal.pageSize.width - 50) / 3;
  const xPositions = [20, 20 + columnWidth, 20 + 2 * columnWidth];
  
  // Calculate heights for each column
  const name = String(expandedElement.name || '');
  const constat = String(expandedElement.auditElement?.constat || '');
  const status = String(expandedElement.auditElement?.status || '');

  const nameLines = doc.splitTextToSize(name, columnWidth - 4);
  const constatLines = doc.splitTextToSize(constat, columnWidth - 4);
  const statusLines = doc.splitTextToSize(status, columnWidth - 4);

  const maxLines = Math.max(nameLines.length, constatLines.length, statusLines.length);
  const rowHeight = maxLines * 4 + 6;

  // Draw backgrounds
  doc.setFillColor(245, 245, 245);
  xPositions.forEach(x => {
    doc.rect(x, startY - 3, columnWidth - 4, rowHeight, 'F');
  });

  // Add text
  doc.text(nameLines, xPositions[0] + 2, startY);
  doc.text(constatLines, xPositions[1] + 2, startY);
  doc.text(statusLines, xPositions[2] + 2, startY);

  return rowHeight;
};

const renderRegulatory = (regulatory: any) => {
  if (!regulatory) return 0;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(240, 240, 240);
  
  const text = String(regulatory.text || '');
  const lines = doc.splitTextToSize(text, doc.internal.pageSize.width - 44);
  const height = lines.length * 4 + 6;
  
  doc.rect(20, 40 - 3, doc.internal.pageSize.width - 40, height, 'F');
  doc.text(lines, 22, 40);
  
  return height;
};

const expandTemplateElements = (elements: TemplateElement[], auditElements: AuditElement[]): any[] => {
  return elements.flatMap((templateElement): any[] => {
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

const getTemplateElementsForSubCategory = (subCategory: SubCategory, templateElements: TemplateElement[], audit: Audit, auditElements: AuditElement[]): any[] => {
  const elements = templateElements.filter(element => 
    element.subCategoryId === subCategory._id && 
    element.templateVersion?.includes(audit.templateVersion)
  );
  
  const expandedElements = expandTemplateElements(elements, auditElements);
  return sortExpandedTemplateElements(expandedElements, audit.templateVersion);
};

const getDirectTemplateElements = (categoryId: string, templateElements: TemplateElement[], audit: Audit, auditElements: AuditElement[]): any[] => {
  const elements = templateElements.filter(element => 
    element.categoryId === categoryId && 
    !element.subCategoryId && 
    element.templateVersion?.includes(audit.templateVersion)
  );
  
  const expandedElements = expandTemplateElements(elements, auditElements);
  return sortExpandedTemplateElements(expandedElements, audit.templateVersion);
};

const renderSubCategory = (subCategory: any, templateElements: any[], auditElements: any[]) => {
  // SubCategory title
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  doc.setFontSize(11);
  doc.setTextColor(146, 208, 80);
  doc.text(String(subCategory.name || ''), 30, 40);
  let yPosition = 50;

  // Get elements for this subcategory
  const elements = getTemplateElementsForSubCategory(subCategory, templateElements, audit, auditElements);

  // Render elements in 3 columns
  elements.forEach(element => {
    if (yPosition > doc.internal.pageSize.height - 30) {
      doc.addPage();
      addHeader(doc);
      yPosition = 40;
    }
    const rowHeight = renderAuditElementRow(element, yPosition);
    yPosition += rowHeight + 4;
  });
};

const renderCategory = (category: Category, sectionId?: string, templateElements: TemplateElement[], auditElements: AuditElement[], subCategories: SubCategory[], regulatories: Regulatory[]) => {
  // Get and sort subcategories
  const categorySubCategories = sortByPosition(
    subCategories.filter(sc => sc.categoryId === category._id),
    2
  );

  // Category title
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  doc.setFontSize(12);
  doc.setTextColor(0, 106, 60);
  doc.setFillColor(0, 106, 60);
  doc.rect(20, 40 - 3, doc.internal.pageSize.width - 40, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(String(category.name || ''), 22, 42 + 2);
  let yPosition = 52;

  // Render regulatory if exists
  if (sectionId) {
    const regulatory = regulatories.find(
      r => r.sectionId === sectionId && 
           r.categoryId === category._id && 
           (!r.subCategoryId || r.subCategoryId === "null" || r.subCategoryId === "")
    );
    if (regulatory) {
      const height = renderRegulatory(regulatory);
      yPosition += height + 4;
    }
  }

  // Render subcategories
  categorySubCategories.forEach(subCategory => {
    if (yPosition > doc.internal.pageSize.height - 30) {
      doc.addPage();
      addHeader(doc);
      yPosition = 40;
    }
    renderSubCategory(subCategory, templateElements, auditElements);
  });

  // Get direct elements (without subcategory)
  const directElements = getDirectTemplateElements(category._id, templateElements, audit, auditElements);

  // Render direct elements
  directElements.forEach(element => {
    if (yPosition > doc.internal.pageSize.height - 30) {
      doc.addPage();
      addHeader(doc);
      yPosition = 40;
    }
    const rowHeight = renderAuditElementRow(element, yPosition);
    yPosition += rowHeight + 4;
  });

  yPosition += 8;
};

export const generateAuditPDF = (options: PDFGeneratorOptions): jsPDF => {
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
  yPosition = 40;
  yPosition = addInfoTable(doc, arretePrefectoralRows, 'Informations relatives à l\'arrêté préfectoral', yPosition);
  yPosition += 10;
  yPosition = addInfoTable(doc, exploitationRows, 'Informations relatives à l\'exploitation', yPosition);
  yPosition = addInfoTable(doc, auditRows, null, yPosition);

  // Page 3: ICPE Table
  doc.addPage();
  addHeader(doc);
  yPosition = 40;
  doc.setFontSize(12);
  doc.setTextColor(0, 106, 60);
  doc.text('Rubriques ICPE', 20, yPosition);
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
  let xPos = 20;
  
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
    if (yPosition > doc.internal.pageSize.height - 30) {
      doc.addPage();
      addHeader(doc);
      yPosition = 40;
    }

    xPos = 20;
    
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
  yPosition = 40;
  doc.setFontSize(12);
  doc.setTextColor(0, 106, 60);
  doc.text('Synthèse', 20, yPosition);
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
    doc.text(actor, 20, yPosition);
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
      doc.rect(25, yPosition - 5, doc.internal.pageSize.width - 50, boxHeight, 'F');
      doc.text(`NCM${index + 1} - ${String(item.name || '')}`, 30, yPosition);
      yPosition += 5;
      
      const constat = `Constat: ${String(item.constat || '')}`;
      const constLines = doc.splitTextToSize(constat, doc.internal.pageSize.width - 70);
      doc.text(constLines[0], 35, yPosition);
      yPosition += 5;
      
      const action = `Action: ${String(item.action || '')}`;
      const actionLines = doc.splitTextToSize(action, doc.internal.pageSize.width - 70);
      doc.text(actionLines[0], 35, yPosition);
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
      doc.rect(25, yPosition - 5, doc.internal.pageSize.width - 50, boxHeight, 'F');
      doc.text(`OBS${index + 1} - ${String(item.name || '')}`, 30, yPosition);
      yPosition += 5;
      
      const constat = `Constat: ${String(item.constat || '')}`;
      const constLines = doc.splitTextToSize(constat, doc.internal.pageSize.width - 70);
      doc.text(constLines[0], 35, yPosition);
      yPosition += 8;
    });

    yPosition += 5;
  });

  // Audit Elements section
  doc.addPage();
  addHeader(doc);
  yPosition += 15;

  if (audit.templateVersion === 2) {
    // Render by sections
    const validSections = sortSectionsByPosition(
      sections.filter(section => section.templateVersion?.includes(audit.templateVersion))
    );

    validSections.forEach(section => {
      if (yPosition > doc.internal.pageSize.height - 30) {
        doc.addPage();
        addHeader(doc);
        yPosition = 40;
      }

      // Section title
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(String(section.name || ''), 20, yPosition);
      yPosition += 10;

      // Get categories for this section and sort them
      const sectionCategories = sortByPosition(
        categories.filter(category => category.section === section._id),
        audit.templateVersion
      );

      // Render categories
      sectionCategories.forEach(category => {
        // Get and sort subcategories
        const categorySubCategories = sortByPosition(
          subCategories.filter(sc => sc.categoryId === category._id),
          audit.templateVersion
        );

        // Category title
        doc.setFontSize(12);
        doc.setTextColor(0, 106, 60);
        doc.setFillColor(0, 106, 60);
        doc.rect(20, yPosition - 3, doc.internal.pageSize.width - 40, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(String(category.name || ''), 22, yPosition + 2);
        yPosition += 12;

        // Render regulatory if exists
        const regulatory = regulatories.find(
          r => r.sectionId === section._id && 
               r.categoryId === category._id && 
               (!r.subCategoryId || r.subCategoryId === "null" || r.subCategoryId === "")
        );
        if (regulatory) {
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          doc.setFillColor(240, 240, 240);
          
          const text = String(regulatory.text || '');
          const lines = doc.splitTextToSize(text, doc.internal.pageSize.width - 44);
          const height = lines.length * 4 + 6;
          
          doc.rect(20, yPosition - 3, doc.internal.pageSize.width - 40, height, 'F');
          doc.text(lines, 22, yPosition);
          yPosition += height + 4;
        }

        // Render subcategories
        categorySubCategories.forEach(subCategory => {
          if (yPosition > doc.internal.pageSize.height - 30) {
            doc.addPage();
            addHeader(doc);
            yPosition = 40;
          }

          // SubCategory title
          doc.setFontSize(11);
          doc.setTextColor(146, 208, 80);
          doc.text(String(subCategory.name || ''), 30, yPosition);
          yPosition += 10;

          // Get elements for this subcategory
          const elements = getTemplateElementsForSubCategory(subCategory, templateElements, audit, auditElements);

          // Render elements in 3 columns
          elements.forEach(element => {
            if (yPosition > doc.internal.pageSize.height - 30) {
              doc.addPage();
              addHeader(doc);
              yPosition = 40;
            }
            const rowHeight = renderAuditElementRow(element, yPosition);
            yPosition += rowHeight + 4;
          });
        });

        // Get direct elements (without subcategory)
        const directElements = getDirectTemplateElements(category._id, templateElements, audit, auditElements);

        // Render direct elements
        directElements.forEach(element => {
          if (yPosition > doc.internal.pageSize.height - 30) {
            doc.addPage();
            addHeader(doc);
            yPosition = 40;
          }
          const rowHeight = renderAuditElementRow(element, yPosition);
          yPosition += rowHeight + 4;
        });

        yPosition += 8;
      });
    });
  } else {
    // Render categories directly
    const validCategories = categories
      .filter(category => category.templateVersion?.includes(audit.templateVersion));

    const sortedCategories = sortByPosition(validCategories, audit.templateVersion);

    sortedCategories.forEach(category => {
      // Get and sort subcategories
      const categorySubCategories = sortByPosition(
        subCategories.filter(sc => sc.categoryId === category._id),
        audit.templateVersion
      );

      // Category title
      doc.setFontSize(12);
      doc.setTextColor(0, 106, 60);
      doc.setFillColor(0, 106, 60);
      doc.rect(20, yPosition - 3, doc.internal.pageSize.width - 40, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(String(category.name || ''), 22, yPosition + 2);
      yPosition += 12;

      // Render subcategories
      categorySubCategories.forEach(subCategory => {
        if (yPosition > doc.internal.pageSize.height - 30) {
          doc.addPage();
          addHeader(doc);
          yPosition = 40;
        }

        // SubCategory title
        doc.setFontSize(11);
        doc.setTextColor(146, 208, 80);
        doc.text(String(subCategory.name || ''), 30, yPosition);
        yPosition += 10;

        // Get elements for this subcategory
        const elements = getTemplateElementsForSubCategory(subCategory, templateElements, audit, auditElements);

        // Render elements in 3 columns
        elements.forEach(element => {
          if (yPosition > doc.internal.pageSize.height - 30) {
            doc.addPage();
            addHeader(doc);
            yPosition = 40;
          }
          const rowHeight = renderAuditElementRow(element, yPosition);
          yPosition += rowHeight + 4;
        });
      });

      // Get direct elements (without subcategory)
      const directElements = getDirectTemplateElements(category._id, templateElements, audit, auditElements);

      // Render direct elements
      directElements.forEach(element => {
        if (yPosition > doc.internal.pageSize.height - 30) {
          doc.addPage();
          addHeader(doc);
          yPosition = 40;
        }
        const rowHeight = renderAuditElementRow(element, yPosition);
        yPosition += rowHeight + 4;
      });

      yPosition += 8;
    });
  }

  // Images section
  if (images && images.length > 0) {
    doc.addPage();
    addHeader(doc);
    yPosition = 40;
    doc.setFontSize(12);
    doc.setTextColor(0, 106, 60);
    doc.text('ANNEXES', 20, yPosition);
    yPosition += 15;

    const imagesPerRow = 2;
    const imageWidth = (doc.internal.pageSize.width - 60) / imagesPerRow;
    const imageHeight = imageWidth * 0.75; // 4:3 aspect ratio
    let currentImageInRow = 0;

    for (const image of images) {
      if (yPosition + imageHeight > doc.internal.pageSize.height - 30) {
        doc.addPage();
        addHeader(doc);
        yPosition = 40;
        currentImageInRow = 0;
      }

      const xPosition = 20 + (currentImageInRow * (imageWidth + 20));

      try {
        const bytes = atob(image.url.split(',')[1]);
        let imageData: string = '';
        for (let i = 0; i < bytes.length; i++) {
          imageData += String.fromCharCode(bytes.charCodeAt(i));
        }

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

        currentImageInRow++;
        if (currentImageInRow === imagesPerRow) {
          currentImageInRow = 0;
          yPosition += imageHeight + 20;
        }
      } catch (error) {
        console.error('Error loading image:', error);
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
