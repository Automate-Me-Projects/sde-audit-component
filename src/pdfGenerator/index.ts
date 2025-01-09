import { jsPDF } from 'jspdf';
import { PDFGeneratorOptions } from '../types';
import { sortByPosition, sortSectionsByPosition, formatDate } from '../utils/index';
import { MARGIN_X, PAGE_WIDTH, CONTENT_WIDTH, FOOTER_HEIGHT, HEADER_HEIGHT, HEADER_BOTTOM_MARGIN, HEADER_BG_COLOR, GREEN_BG_COLOR, LIGHTGREEN_BG_COLOR } from './constants';
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
  doc.text('AUDIT DE SUIVI ICPE', MARGIN_X, 30);

  // Date
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 106, 60);
  const formattedDate = formatDate(audit?.visitDate);
  doc.text(formattedDate, MARGIN_X, 45);

  // Building name (centered)
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(GREEN_BG_COLOR[0], GREEN_BG_COLOR[1], GREEN_BG_COLOR[2]);
  
  // Center align building information
  const buildingName = building?.name || '';
  const buildingPortfolio = building?.portfolio || '';
  const buildingAddress = building?.address || '';
  
  const centerX = doc.internal.pageSize.width / 2;
  
  // Building name and portfolio with same size
  doc.text(buildingName, centerX, 120, { align: 'center' });
  doc.text(buildingPortfolio, centerX, 135, { align: 'center' });
  
  // Building address with smaller size
  doc.setFontSize(20);
  doc.text(buildingAddress, centerX, 150, { align: 'center' });

  // Static address (bottom right, center aligned)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(GREEN_BG_COLOR[0], GREEN_BG_COLOR[1], GREEN_BG_COLOR[2]);
  
  const staticAddress = [
    '19 Bis avenue Léon Gambetta',
    '92120 Montrouge',
    'T+33 1 46 94 80 64'
  ];
  
  const bottomY = doc.internal.pageSize.height - 40;
  const rightX = doc.internal.pageSize.width - MARGIN_X - 40; // Adjust position for center alignment
  
  staticAddress.forEach((line: string, index: number) => {
    doc.text(line, rightX, bottomY + (index * 7), { align: 'center' });
  });

  // Page 3: First section - INFORMATIONS GÉNÉRALES
  doc.addPage();
  addHeader(doc, building, audit);
  let yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('1. INFORMATIONS GÉNÉRALES', MARGIN_X, yPosition);
  yPosition += 15;

  // Subsections with original styling
  yPosition = addInfoTable(doc, arretePrefectoralRows, 'INFORMATIONS RELATIVES À L\'ARRÊTÉ PRÉFECTORAL', yPosition);
  yPosition += 10;
  yPosition = addInfoTable(doc, exploitationRows, 'INFORMATIONS RELATIVES À L\'EXPLOITATION', yPosition);
  yPosition += 10;
  yPosition = addInfoTable(doc, auditRows, 'DATE DE LA VISITE ET RÉDACTION DU RAPPORT', yPosition);
  yPosition += 10;

  // Audit description
  const title = 'DESCRIPTIF DU DÉROULÉ DE L\'AUDIT';
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold'); // Ensure title font is bold
  const titleWidth = doc.getTextWidth(title);
  
  const padding = 5; // Padding between border and content
  const textPadding = 8; // Padding for text within grey area
  const sectionWidth = CONTENT_WIDTH - (padding * 2);
  const borderWidth = 0.5; // Thicker border
  
  // Calculate content height and check if we need a page break before starting
  const descriptionText = building?.icpeRegulations || '';
  const descriptionLines = doc.splitTextToSize(descriptionText, sectionWidth - (textPadding * 2));
  const lineHeight = 5;
  const contentHeight = (descriptionLines.length * lineHeight) + (textPadding * 2);
  const titleHeight = 8;
  const totalHeight = contentHeight + titleHeight;
  
  // Check if we need a page break before starting
  if (yPosition + totalHeight + (padding * 2) > doc.internal.pageSize.height - FOOTER_HEIGHT - 10) {
    doc.addPage();
    addHeader(doc, building, audit);
    yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
  }
  
  // Draw black border around entire section
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(borderWidth);
  doc.rect(MARGIN_X, yPosition - 5, CONTENT_WIDTH, totalHeight + (padding * 2), 'S');
  
  // Draw inner content (title + grey background) with padding from border
  const innerX = MARGIN_X + padding;
  const innerY = yPosition - 5 + padding;
  
  // Title with green background
  doc.setFillColor(0, 106, 60);
  doc.rect(innerX, innerY, sectionWidth, titleHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); // Ensure title is bold
  const titleX = innerX + (sectionWidth - titleWidth) / 2;
  doc.text(title, titleX, innerY + 5);
  
  // Content area with grey background
  doc.setFillColor(240, 240, 240);
  doc.rect(innerX, innerY + titleHeight, sectionWidth, contentHeight, 'F');
  
  // Add text content
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0); // Force black color
  let textY = innerY + titleHeight + textPadding;
  
  descriptionLines.forEach((line: string) => {
    // Check if we're too close to the footer with extra margin
    if (textY > doc.internal.pageSize.height - FOOTER_HEIGHT - 20) {
      // Calculate remaining height before creating new page
      const currentIndex = descriptionLines.indexOf(line);
      const remainingLines = descriptionLines.slice(currentIndex);
      const remainingHeight = (remainingLines.length * lineHeight) + (textPadding * 2);
      
      // Only proceed with new page if we actually have content to write
      if (remainingLines.length > 0) {
        doc.addPage();
        addHeader(doc, building, audit);
        const newY = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
        
        // Draw border
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(borderWidth); // Maintain border thickness
        doc.rect(MARGIN_X, newY, CONTENT_WIDTH, remainingHeight + (padding * 2), 'S');
        
        // Draw grey background
        doc.setFillColor(240, 240, 240);
        doc.rect(MARGIN_X + padding, newY + padding, sectionWidth, remainingHeight, 'F');
        
        textY = newY + padding + textPadding;
        doc.setTextColor(0, 0, 0); // Ensure black color after page break
      }
    }
    doc.text(line, innerX + textPadding, textY);
    textY += lineHeight;
  });

  yPosition += totalHeight + (padding * 2) + 5;

  // ICPE Table
  doc.addPage();
  addHeader(doc, building, audit);
  yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;

  // Title formatting matching addInfoTable style
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const icpeTitleWidth = doc.getTextWidth('CLASSEMENT ICPE');
  const icpeTitleHeight = 8;
  
  // Title with green background
  doc.setFillColor(0, 106, 60);
  doc.rect(MARGIN_X, yPosition - 5, CONTENT_WIDTH, icpeTitleHeight, 'F');
  doc.setTextColor(255, 255, 255);
  const icpeTitleX = MARGIN_X + (CONTENT_WIDTH - icpeTitleWidth) / 2;
  doc.text('CLASSEMENT ICPE', icpeTitleX, yPosition);
  yPosition = yPosition - 5 + icpeTitleHeight;

  // Reset styles for table content
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  // Define column widths
  const colWidths = {
    rubrique: 25,
    nature: 70,
    capacite: 45,
    regime: 40
  };

  type ColWidthKeys = keyof typeof colWidths;
  
  // ICPE Table header
  doc.setFillColor(LIGHTGREEN_BG_COLOR[0], LIGHTGREEN_BG_COLOR[1], LIGHTGREEN_BG_COLOR[2]);
  doc.setTextColor(0, 0, 0); // Black text for headers
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  
  const headers: Array<{ key: ColWidthKeys; text: string }> = [
    { key: 'rubrique', text: 'Rubrique' },
    { key: 'nature', text: 'Nature des activités' },
    { key: 'capacite', text: 'Capacité' },
    { key: 'regime', text: 'Régime' }
  ];

  // Draw header cells with no gaps
  let xPos = MARGIN_X;
  const headerHeight = 8; // Increased height for larger font
  headers.forEach(header => {
    doc.rect(xPos, yPosition, colWidths[header.key], headerHeight, 'DF'); // Fill and Draw
    xPos += colWidths[header.key];
  });

  // Then draw all text (to ensure text is on top)
  xPos = MARGIN_X;
  headers.forEach(header => {
    const textWidth = doc.getTextWidth(header.text);
    const centerX = xPos + (colWidths[header.key] - textWidth) / 2;
    doc.text(header.text, centerX, yPosition + 6); // Adjusted for larger font
    xPos += colWidths[header.key];
  });
  
  yPosition += headerHeight;

  // ICPE Table content
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12); // Same size as headers

  // Sort ICPE types by regime priority
  const regimePriority = {
    'autorisation': 0,
    'enregistrement': 1,
    'déclaration et contrôle': 2,
    'déclaration': 3,
    'non classé': 4
  };

  const normalizeRegime = (regime: string): string => {
    const normalized = regime?.toLowerCase().trim() || '';
    if (normalized.includes('contrôle') || normalized.includes('controle')) {
      return 'déclaration et contrôle';
    }
    return normalized;
  };

  const sortedIcpeTypes = [...(building?.icpeTypes || [])].sort((a, b) => {
    const regimeA = normalizeRegime(a.regime);
    const regimeB = normalizeRegime(b.regime);
    const priorityA = regimePriority[regimeA] ?? 999;
    const priorityB = regimePriority[regimeB] ?? 999;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // If same regime, sort by rubrique
    return (a.rubrique || '').localeCompare(b.rubrique || '');
  });

  // Process each ICPE type
  sortedIcpeTypes.forEach((icpe) => {
    // Calculate wrapped text for each cell with consistent padding
    const padding = 4;
    const rubriqueLines = doc.splitTextToSize(icpe.rubrique || '', colWidths.rubrique - (padding * 2));
    const descLines = doc.splitTextToSize(icpe.description || '', colWidths.nature - (padding * 2));
    const capLines = doc.splitTextToSize(icpe.capacity || '', colWidths.capacite - (padding * 2));
    const regimeLines = doc.splitTextToSize(icpe.regime || '', colWidths.regime - (padding * 2));

    // Calculate row height based on the cell with the most lines
    const maxLines = Math.max(
      rubriqueLines.length,
      descLines.length,
      capLines.length,
      regimeLines.length
    );
    const lineHeight = 7;
    const rowHeight = maxLines * lineHeight + (padding * 2);

    // Check if there's enough space for this row
    if (yPosition + rowHeight > doc.internal.pageSize.height - FOOTER_HEIGHT - 10) {
      doc.addPage();
      addHeader(doc, building, audit);
      yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
    }

    let xPos = MARGIN_X;

    // Draw cells with borders matching addInfoTable
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.setTextColor(0, 0, 0); // Ensure text color is black for cell content

    // Helper function to center text vertically and horizontally in a cell
    const drawCenteredText = (lines: string[], x: number, width: number) => {
      const textHeight = lines.length * lineHeight;
      const verticalPadding = (rowHeight - textHeight) / 2;
      const startY = yPosition + verticalPadding + lineHeight;

      lines.forEach((line, index) => {
        const lineWidth = doc.getTextWidth(line);
        const centerX = x + (width - lineWidth) / 2;
        doc.text(line, centerX, startY + (index * lineHeight));
      });
    };

    // Draw cells and their content
    // Rubrique cell
    doc.rect(xPos, yPosition, colWidths.rubrique, rowHeight, 'S');
    drawCenteredText(rubriqueLines, xPos, colWidths.rubrique);
    xPos += colWidths.rubrique;

    // Nature cell
    doc.rect(xPos, yPosition, colWidths.nature, rowHeight, 'S');
    drawCenteredText(descLines, xPos, colWidths.nature);
    xPos += colWidths.nature;

    // Capacite cell
    doc.rect(xPos, yPosition, colWidths.capacite, rowHeight, 'S');
    drawCenteredText(capLines, xPos, colWidths.capacite);
    xPos += colWidths.capacite;

    // Regime cell
    doc.rect(xPos, yPosition, colWidths.regime, rowHeight, 'S');
    drawCenteredText(regimeLines, xPos, colWidths.regime);

    yPosition += rowHeight;
  });

  // SYNTHÈSE section
  doc.addPage();
  addHeader(doc, building, audit);
  yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('2. SYNTHÈSE', MARGIN_X, yPosition);
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
    return lines.length * 3.5;
  };

  // Function to render wrapped text with page breaks
  const renderWrappedText = (text: string, x: number, startY: number, maxWidth: number, label?: string) => {
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
      doc.setTextColor(180, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text('RECAPITULATIF DES NON-CONFORMITÉS MAJEURES', MARGIN_X + 5, yPosition + 4);
      yPosition += 12;

      data.nonConformiteMajeure.forEach((item, index) => {
        const constatHeight = calculateTextHeight(item.constat, (CONTENT_WIDTH - 40) / 2);
        const actionHeight = calculateTextHeight(item.action, (CONTENT_WIDTH - 40) / 2);
        const contentHeight = Math.max(constatHeight, actionHeight);
        const totalHeight = contentHeight + 20;

        if (checkAndAddNewPage(totalHeight)) {
          yPosition = HEADER_HEIGHT + 10;
        }

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
        const constatHeight = calculateTextHeight(item.constat, (CONTENT_WIDTH - 40) / 2);
        const actionHeight = calculateTextHeight(item.action, (CONTENT_WIDTH - 40) / 2);
        const contentHeight = Math.max(constatHeight, actionHeight);
        const totalHeight = contentHeight + 20;

        if (checkAndAddNewPage(totalHeight)) {
          yPosition = HEADER_HEIGHT + 10;
        }

        const startY = yPosition;

        doc.setFillColor(255, 248, 242);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, totalHeight, 2, 2, 'F');

        doc.setFillColor(255, 242, 235);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, 8, 2, 2, 'F');
        doc.setTextColor(200, 100, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(`NC${index + 1} - ${String(item.name)}`, MARGIN_X + 10, startY + 6);

        const separatorX = MARGIN_X + 5 + ((CONTENT_WIDTH - 10) / 2);
        doc.setDrawColor(220, 220, 220);
        doc.line(separatorX, startY + 8, separatorX, startY + totalHeight);

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
        const constatHeight = calculateTextHeight(item.constat, (CONTENT_WIDTH - 40) / 2);
        const actionHeight = calculateTextHeight(item.action, (CONTENT_WIDTH - 40) / 2);
        const contentHeight = Math.max(constatHeight, actionHeight);
        const totalHeight = contentHeight + 20;

        if (checkAndAddNewPage(totalHeight)) {
          yPosition = HEADER_HEIGHT + 10;
        }

        const startY = yPosition;

        doc.setFillColor(250, 250, 250);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, totalHeight, 2, 2, 'F');

        doc.setFillColor(245, 245, 245);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, 8, 2, 2, 'F');
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text(`OBS${index + 1} - ${String(item.name)}`, MARGIN_X + 10, startY + 6);

        const separatorX = MARGIN_X + 5 + ((CONTENT_WIDTH - 10) / 2);
        doc.setDrawColor(220, 220, 220);
        doc.line(separatorX, startY + 8, separatorX, startY + totalHeight);

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

    yPosition += 10;
  };

  // Render data for each action owner
  Array.from(actionOwnerMap.entries()).forEach(([actionOwner, data]) => {
    renderActionOwnerData(data, actionOwner);
  });

  // Render non-assigned items last
  if (nonAssigneData) {
    renderActionOwnerData(nonAssigneData, 'Non assigné');
  }

  if (audit.templateVersion === 2) {
    // Render by sections
    const validSections = sections.filter(section => 
      categories.some(category => category.section === section._id)
    );

    // Sort sections by position
    const sortedSections = sortSectionsByPosition(validSections);

    sortedSections.forEach((section, index) => {
      // Always start a new page for each section
      doc.addPage();
      addHeader(doc, building, audit);
      yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${index + 3}. ${String(section.name || '')}`, MARGIN_X, yPosition);
      yPosition += 15;

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

    // Store the last section number for ANNEXES
    const lastSectionNumber = validSections.length + 3;

    // ANNEXES section
    if (images && images.length > 0) {
      doc.addPage();
      addHeader(doc, building, audit);
      yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(`${lastSectionNumber}. ANNEXES`, MARGIN_X, yPosition);
      yPosition += 15;

      const imagesPerRow = 4;
      const imageWidth = (CONTENT_WIDTH) / imagesPerRow;
      const imageHeight = imageWidth * 0.75; // 4:3 aspect ratio
      let currentImageInRow = 0;

      for (const image of images) {
        if (yPosition + imageHeight > doc.internal.pageSize.height - FOOTER_HEIGHT) {
          doc.addPage();
          addHeader(doc, building, audit);
          yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
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
  } else {
    // Render categories directly
    const validCategories = categories
      .filter(category => category.templateVersion?.includes(audit.templateVersion));

    const sortedCategories = sortByPosition(validCategories, audit.templateVersion);

    sortedCategories.forEach(category => {
      yPosition = renderCategory(audit, building, category, templateElements, auditElements, subCategories, regulatories, doc, yPosition, undefined);
    });
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
