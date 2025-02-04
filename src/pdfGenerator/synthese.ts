import { jsPDF } from 'jspdf';
import { AuditElement, Building, Audit, TemplateElement, Category, SubCategory } from '../types';
import { MARGIN_X, CONTENT_WIDTH, FOOTER_HEIGHT, HEADER_HEIGHT, HEADER_BOTTOM_MARGIN } from './constants';
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
  templateElements: TemplateElement[],
  categories: Category[],
  subCategories: SubCategory[]
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
    nonConformiteMajeure: Array<{name: string, constat: string, action: string, categoryName?: string}>,
    nonConformes: Array<{name: string, constat: string, action: string, categoryName?: string}>,
    observations: Array<{name: string, constat: string, action: string, categoryName?: string}>
  }>();

  auditElements.forEach(auditElement => {
    const actionOwner = auditElement.actionOwner || 'Non assigné';
    const templateElement = templateElements.find(te => te._id === auditElement.templateElementId);
    
    if (!templateElement) return;

    let categoryName = '';
    if (templateElement.subCategoryId) {
      const subCategory = subCategories.find(sc => sc._id === templateElement.subCategoryId);
      categoryName = subCategory ? subCategory.name : '';
    } else if (templateElement.categoryId) {
      const category = categories.find(c => c._id === templateElement.categoryId);
      categoryName = category ? category.name : '';
    }

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
        action: auditElement.action || '',
        categoryName
      });
    } else if (auditElement.status === 'Non conforme') {
      ownerData.nonConformes.push({
        name: templateElement.name,
        constat: auditElement.constat || '',
        action: auditElement.action || '',
        categoryName
      });
    } else if (auditElement.status === 'Observation') {
      ownerData.observations.push({
        name: templateElement.name,
        constat: auditElement.constat || '',
        action: auditElement.action || '',
        categoryName
      });
    }
  });

  // Separate 'Non assigné' from other actionOwners
  const nonAssigneData = actionOwnerMap.get('Non assigné');
  actionOwnerMap.delete('Non assigné');

  // Function to check space for actor + section title + first item
  const checkSpaceForActorSection = (
    doc: jsPDF,
    currentY: number,
    item: {name: string, constat: string, action: string, categoryName?: string},
    sectionTitleHeight: number
  ) => {
    // Calculate heights
    const actorHeaderHeight = 12;
    const constatHeight = calculateTextHeight(doc, item.constat, (CONTENT_WIDTH - 40) / 2);
    const actionHeight = calculateTextHeight(doc, item.action, (CONTENT_WIDTH - 40) / 2);
    const contentHeight = Math.max(constatHeight, actionHeight);
    const itemHeight = contentHeight + 20;

    // Calculate item title height
    const titleText = `${item.categoryName ? item.categoryName + ' - ' : ''}${String(item.name)}`;
    const lines = doc.splitTextToSize(titleText, CONTENT_WIDTH - 20);
    const titleHeight = lines.length * 6; // Each line is approximately 6mm high

    // Total required height
    const totalRequired = actorHeaderHeight + sectionTitleHeight + itemHeight + titleHeight;

    if (currentY + totalRequired > doc.internal.pageSize.height - FOOTER_HEIGHT) {
      doc.addPage();
      addHeader(doc, building, audit);
      return HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
    }
    return currentY;
  };

  // Function to render data for an actionOwner
  const renderActionOwnerData = (data: typeof nonAssigneData, actionOwner: string, isFirst: boolean) => {
    if (!data || (data.nonConformiteMajeure.length === 0 && data.nonConformes.length === 0 && data.observations.length === 0)) {
      return;
    }

    // Add a new page for each new actionOwner except the first one
    if (!isFirst) {
      doc.addPage();
      addHeader(doc, building, audit);
      yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
    }

    // Check space for actor + first section (if any exists)
    if (data.nonConformiteMajeure.length > 0) {
      yPosition = checkSpaceForActorSection(doc, yPosition, data.nonConformiteMajeure[0], 10);
    } else if (data.nonConformes.length > 0) {
      yPosition = checkSpaceForActorSection(doc, yPosition, data.nonConformes[0], 10);
    } else if (data.observations.length > 0) {
      yPosition = checkSpaceForActorSection(doc, yPosition, data.observations[0], 10);
    }

    // Actor header with background
    doc.setFillColor(232, 251, 211);
    doc.rect(MARGIN_X, yPosition - 5, CONTENT_WIDTH, 12, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    // Center the text
    const textWidth = doc.getTextWidth(actionOwner.toUpperCase());
    const centerX = MARGIN_X + (CONTENT_WIDTH / 2) - (textWidth / 2);
    doc.text(actionOwner.toUpperCase(), centerX, yPosition + 3);
    
    yPosition += 8;

    // Render non-conformités majeures if any exist
    if (data.nonConformiteMajeure.length > 0) {
      // Calculate height needed for title and first item
      const titleHeight = 12; // Height for the title section
      const item = data.nonConformiteMajeure[0];
      const constatHeight = calculateTextHeight(doc, item.constat, (CONTENT_WIDTH - 40) / 2);
      const actionHeight = calculateTextHeight(doc, item.action, (CONTENT_WIDTH - 40) / 2);
      const contentHeight = Math.max(constatHeight, actionHeight);
      const itemTitleText = `NCM1 - ${item.categoryName ? item.categoryName + ' - ' : ''}${String(item.name)}`;
      const itemTitleLines = doc.splitTextToSize(itemTitleText, CONTENT_WIDTH - 20);
      const itemTitleHeight = itemTitleLines.length * 6;
      const totalNeededHeight = titleHeight + contentHeight + itemTitleHeight + 24; // Adding some padding

      // Check if we need a new page
      if (yPosition + totalNeededHeight > doc.internal.pageSize.height - FOOTER_HEIGHT) {
        doc.addPage();
        addHeader(doc, building, audit);
        yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
      }

      doc.setFillColor(235, 51, 35); // Updated red color
      doc.rect(MARGIN_X, yPosition - 2, CONTENT_WIDTH, 10, 'F');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      
      // Center the text
      const titleText = 'RECAPITULATIF DES NON-CONFORMITÉS MAJEURES';
      const textWidth = doc.getTextWidth(titleText);
      const centerX = MARGIN_X + (CONTENT_WIDTH / 2) - (textWidth / 2);
      doc.text(titleText, centerX, yPosition + 4);
      
      yPosition += 12;

      data.nonConformiteMajeure.forEach((item, index) => {
        const constatHeight = calculateTextHeight(doc, item.constat, (CONTENT_WIDTH - 40) / 2);
        const actionHeight = calculateTextHeight(doc, item.action, (CONTENT_WIDTH - 40) / 2);
        const contentHeight = Math.max(constatHeight, actionHeight);

        yPosition = checkAndAddNewPage(doc, yPosition, contentHeight + 30, building, audit);

        const startY = yPosition;

        const titleText = `NCM${index + 1} - ${item.categoryName ? item.categoryName + ' - ' : ''}${String(item.name)}`;
        const lines = doc.splitTextToSize(titleText, CONTENT_WIDTH - 20);
        const titleHeight = lines.length * 6; // Each line is approximately 6mm high

        // Définition des espacements
        const titlePadding = 4; // Padding pour le titre
        const contentTopMargin = 8; // Espace entre le titre et le début du contenu
        const contentBottomMargin = 4; // Espace après le contenu
        const labelHeight = 4; // Hauteur du label (Constat:/Action:)

        // Calcul des hauteurs
        const contentAreaHeight = contentHeight + labelHeight;
        const adjustedTotalHeight = titleHeight + titlePadding + contentTopMargin + contentAreaHeight + contentBottomMargin;

        // Background principal
        doc.setFillColor(252, 242, 242);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, adjustedTotalHeight, 2, 2, 'F');

        // Background du titre
        doc.setFillColor(255, 235, 235);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, titleHeight + titlePadding, 2, 2, 'F');
        doc.setTextColor(180, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(lines, MARGIN_X + 10, startY + 6);

        // Ligne de séparation verticale
        const separatorX = MARGIN_X + 5 + ((CONTENT_WIDTH - 10) / 2);
        doc.setDrawColor(220, 220, 220);
        doc.line(separatorX, startY + titleHeight + titlePadding, separatorX, startY + adjustedTotalHeight);

        // Position du contenu (après le titre et le contentTopMargin)
        const contentY = startY + titleHeight + titlePadding + contentTopMargin;
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

        yPosition = startY + adjustedTotalHeight + 4;
      });
    }

    if (data.nonConformiteMajeure.length > 0 && data.nonConformes.length > 0) {
      yPosition += 8;
    }

    if (data.nonConformes.length > 0) {
      // Calculate height needed for title and first item
      const titleHeight = 12; // Height for the title section
      const item = data.nonConformes[0];
      const constatHeight = calculateTextHeight(doc, item.constat, (CONTENT_WIDTH - 40) / 2);
      const actionHeight = calculateTextHeight(doc, item.action, (CONTENT_WIDTH - 40) / 2);
      const contentHeight = Math.max(constatHeight, actionHeight);
      const itemTitleText = `NC1 - ${item.categoryName ? item.categoryName + ' - ' : ''}${String(item.name)}`;
      const itemTitleLines = doc.splitTextToSize(itemTitleText, CONTENT_WIDTH - 20);
      const itemTitleHeight = itemTitleLines.length * 6;
      const totalNeededHeight = titleHeight + contentHeight + itemTitleHeight + 24; // Adding some padding

      // Check if we need a new page
      if (yPosition + totalNeededHeight > doc.internal.pageSize.height - FOOTER_HEIGHT) {
        doc.addPage();
        addHeader(doc, building, audit);
        yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
      }

      doc.setFillColor(200, 100, 0); // Orange background
      doc.rect(MARGIN_X, yPosition - 2, CONTENT_WIDTH, 10, 'F');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      
      // Center the text
      const titleText = 'RECAPITULATIF DES NON-CONFORMITÉS';
      const textWidth = doc.getTextWidth(titleText);
      const centerX = MARGIN_X + (CONTENT_WIDTH / 2) - (textWidth / 2);
      doc.text(titleText, centerX, yPosition + 4);
      
      yPosition += 12;

      data.nonConformes.forEach((item, index) => {
        const constatHeight = calculateTextHeight(doc, item.constat, (CONTENT_WIDTH - 40) / 2);
        const actionHeight = calculateTextHeight(doc, item.action, (CONTENT_WIDTH - 40) / 2);
        const contentHeight = Math.max(constatHeight, actionHeight);

        yPosition = checkAndAddNewPage(doc, yPosition, contentHeight + 30, building, audit);

        const startY = yPosition;

        const titleText = `NC${index + 1} - ${item.categoryName ? item.categoryName + ' - ' : ''}${String(item.name)}`;
        const lines = doc.splitTextToSize(titleText, CONTENT_WIDTH - 20);
        const titleHeight = lines.length * 6;

        // Définition des espacements
        const titlePadding = 4; // Padding pour le titre
        const contentTopMargin = 8; // Espace entre le titre et le début du contenu
        const contentBottomMargin = 4; // Espace après le contenu
        const labelHeight = 4; // Hauteur du label (Constat:/Action:)

        // Calcul des hauteurs
        const contentAreaHeight = contentHeight + labelHeight;
        const adjustedTotalHeight = titleHeight + titlePadding + contentTopMargin + contentAreaHeight + contentBottomMargin;

        // Background principal
        doc.setFillColor(252, 248, 227);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, adjustedTotalHeight, 2, 2, 'F');

        // Background du titre
        doc.setFillColor(255, 248, 227);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, titleHeight + titlePadding, 2, 2, 'F');
        doc.setTextColor(200, 100, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(lines, MARGIN_X + 10, startY + 6);

        // Ligne de séparation verticale
        const separatorX = MARGIN_X + 5 + ((CONTENT_WIDTH - 10) / 2);
        doc.setDrawColor(220, 220, 220);
        doc.line(separatorX, startY + titleHeight + titlePadding, separatorX, startY + adjustedTotalHeight);

        const contentY = startY + titleHeight + titlePadding + contentTopMargin;
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

        yPosition = startY + adjustedTotalHeight + 4;
      });
    }

    if ((data.nonConformiteMajeure.length > 0 || data.nonConformes.length > 0) && data.observations.length > 0) {
      yPosition += 8;
    }

    if (data.observations.length > 0) {
      // Calculate height needed for title and first item
      const titleHeight = 12; // Height for the title section
      const item = data.observations[0];
      const constatHeight = calculateTextHeight(doc, item.constat, (CONTENT_WIDTH - 40) / 2);
      const actionHeight = calculateTextHeight(doc, item.action, (CONTENT_WIDTH - 40) / 2);
      const contentHeight = Math.max(constatHeight, actionHeight);
      const itemTitleText = `O1 - ${item.categoryName ? item.categoryName + ' - ' : ''}${String(item.name)}`;
      const itemTitleLines = doc.splitTextToSize(itemTitleText, CONTENT_WIDTH - 20);
      const itemTitleHeight = itemTitleLines.length * 6;
      const totalNeededHeight = titleHeight + contentHeight + itemTitleHeight + 24; // Adding some padding

      // Check if we need a new page
      if (yPosition + totalNeededHeight > doc.internal.pageSize.height - FOOTER_HEIGHT) {
        doc.addPage();
        addHeader(doc, building, audit);
        yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
      }

      doc.setFillColor(225, 188, 75); // Updated yellow color
      doc.rect(MARGIN_X, yPosition - 2, CONTENT_WIDTH, 10, 'F');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      
      // Center the text
      const titleText = 'RECAPITULATIF DES OBSERVATIONS';
      const textWidth = doc.getTextWidth(titleText);
      const centerX = MARGIN_X + (CONTENT_WIDTH / 2) - (textWidth / 2);
      doc.text(titleText, centerX, yPosition + 4);
      
      yPosition += 12;

      data.observations.forEach((item, index) => {
        const constatHeight = calculateTextHeight(doc, item.constat, (CONTENT_WIDTH - 40) / 2);
        const actionHeight = calculateTextHeight(doc, item.action, (CONTENT_WIDTH - 40) / 2);
        const contentHeight = Math.max(constatHeight, actionHeight);

        yPosition = checkAndAddNewPage(doc, yPosition, contentHeight + 30, building, audit);

        const startY = yPosition;

        const titleText = `O${index + 1} - ${item.categoryName ? item.categoryName + ' - ' : ''}${String(item.name)}`;
        const lines = doc.splitTextToSize(titleText, CONTENT_WIDTH - 20);
        const titleHeight = lines.length * 6;

        // Définition des espacements
        const titlePadding = 4; // Padding pour le titre
        const contentTopMargin = 8; // Espace entre le titre et le début du contenu
        const contentBottomMargin = 4; // Espace après le contenu
        const labelHeight = 4; // Hauteur du label (Constat:/Action:)

        // Calcul des hauteurs
        const contentAreaHeight = contentHeight + labelHeight;
        const adjustedTotalHeight = titleHeight + titlePadding + contentTopMargin + contentAreaHeight + contentBottomMargin;

        // Background principal
        doc.setFillColor(255, 248, 220); // Light yellow background for the main cell
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, adjustedTotalHeight, 2, 2, 'F');

        // Background du titre
        doc.setFillColor(255, 240, 180);
        doc.roundedRect(MARGIN_X + 5, startY, CONTENT_WIDTH - 10, titleHeight + titlePadding, 2, 2, 'F');
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(lines, MARGIN_X + 10, startY + 6);

        // Ligne de séparation verticale
        const separatorX = MARGIN_X + 5 + ((CONTENT_WIDTH - 10) / 2);
        doc.setDrawColor(220, 220, 220);
        doc.line(separatorX, startY + titleHeight + titlePadding, separatorX, startY + adjustedTotalHeight);

        // Position du contenu
        const contentY = startY + titleHeight + titlePadding + contentTopMargin;
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

        yPosition = startY + adjustedTotalHeight + 4;
      });
    }

    yPosition += 10;
  };

  // Render data for each actionOwner
  let isFirstActionOwner = true;
  Array.from(actionOwnerMap.entries()).forEach(([actionOwner, data]) => {
    renderActionOwnerData(data, actionOwner, isFirstActionOwner);
    isFirstActionOwner = false;
  });

  // Render non-assigned data at the end if it exists
  if (nonAssigneData) {
    renderActionOwnerData(nonAssigneData, 'Non assigné', false);
  }

  return yPosition;
};
