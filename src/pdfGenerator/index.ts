import { jsPDF } from 'jspdf';
import { PDFGeneratorOptions } from '../types';
import { sortByPosition, sortSectionsByPosition, formatDate } from '../utils/index';
import { MARGIN_X, CONTENT_WIDTH, FOOTER_HEIGHT, HEADER_HEIGHT, HEADER_BG_COLOR, GREEN_BG_COLOR } from './constants';
import { addHeader, addFooter } from './headerFooter';
import { addInfoTable } from './tables';
import { renderCategory } from './categories';

export const generateAuditPDF = async (options: PDFGeneratorOptions): Promise<jsPDF> => {
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
    files
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

  // Page 5: Audit Elements section
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

export * from './constants';
export * from './headerFooter';
export * from './tables';
export * from './elements';
export * from './regulatory';
export * from './categories';
