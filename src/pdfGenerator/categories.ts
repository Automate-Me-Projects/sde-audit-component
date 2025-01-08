import { jsPDF } from 'jspdf';
import { Category, SubCategory, Building, Audit, TemplateElement, AuditElement, Regulatory } from '../types';
import { sortByPosition } from '../utils/index';
import { MARGIN_X, CONTENT_WIDTH, FOOTER_HEIGHT, HEADER_HEIGHT, HEADER_BOTTOM_MARGIN, GREEN_BG_COLOR, LIGHTGREEN_BG_COLOR } from './constants';
import { addHeader } from './headerFooter';
import { renderRegulatory } from './regulatory';
import { calculateRowHeight, renderAuditElementRow, getTemplateElementsForSubCategory, getDirectTemplateElements, expandTemplateElements } from './elements';

export const renderSubCategory = (subCategory: SubCategory, templateElements: TemplateElement[], building: Building, audit: Audit, auditElements: AuditElement[], regulatories: Regulatory[], doc: jsPDF, yPosition: number): number | null => {
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
    currentY = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
  }

  // SubCategory title with background
  doc.setFillColor(LIGHTGREEN_BG_COLOR[0], LIGHTGREEN_BG_COLOR[1], LIGHTGREEN_BG_COLOR[2]);
  doc.rect(MARGIN_X, currentY, CONTENT_WIDTH, titleHeight, 'F');
  
  // Add thin border around title
  doc.setDrawColor(128, 128, 128);
  doc.setLineWidth(0.1);
  doc.rect(MARGIN_X, currentY, CONTENT_WIDTH, titleHeight, 'D');
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  // Center text horizontally and vertically
  const text = String(subCategory.name || '');
  const textWidth = doc.getTextWidth(text);
  const xPos = MARGIN_X + (CONTENT_WIDTH - textWidth) / 2;
  doc.text(text, xPos, currentY + 5);
  
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
      currentY = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
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

export const renderCategory = (audit: Audit, building: Building, category: Category, templateElements: TemplateElement[], auditElements: AuditElement[], subCategories: SubCategory[], regulatories: Regulatory[], doc: jsPDF, yPosition: number, sectionId?: string) => {
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
    yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
  }

  // Category title with background
  doc.setFillColor(GREEN_BG_COLOR[0], GREEN_BG_COLOR[1], GREEN_BG_COLOR[2]);
  doc.rect(MARGIN_X, yPosition, CONTENT_WIDTH, titleHeight, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  
  // Center text horizontally and vertically
  const text = String(category.name || '');
  const textWidth = doc.getTextWidth(text);
  const xPos = MARGIN_X + (CONTENT_WIDTH - textWidth) / 2;
  doc.text(text, xPos, yPosition + 5);
  
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
        yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
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
