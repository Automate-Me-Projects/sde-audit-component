import { jsPDF } from 'jspdf';
import { PDFGeneratorOptions, S3Item } from '../types';
import { sortByPosition, sortSectionsByPosition, formatDate, sortIcpeTypes } from '../utils/index';
import { MARGIN_X, CONTENT_WIDTH, FOOTER_HEIGHT, HEADER_HEIGHT, HEADER_BOTTOM_MARGIN, GREEN_BG_COLOR, LIGHTGREEN_BG_COLOR } from './constants';
import { addHeader, addFooter } from './headerFooter';
import { addInfoTable } from './tables';
import { renderCategory } from './categories';
import { generateSynthese } from './synthese';

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

  // Helper function to group and sort files by name prefix
  const groupAndSortFiles = (prefix: string) => {
    const filteredFiles = files?.filter(file => file.name.startsWith(prefix)) || [];
    return filteredFiles.sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });
  };

  // Helper function to add full-page image
  const addFullPageImage = async (doc: jsPDF, imageUrl: string, addTitle: boolean, title: string, startY: number) => {
    // Encode the URL properly
    const encodedUrl = encodeURI(imageUrl).replace(/\(/g, '%28').replace(/\)/g, '%29');
    
    if (addTitle) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title, MARGIN_X, startY);
      startY += 15;
    }

    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const imgAspectRatio = img.width / img.height;
            
            let imageWidth = pageWidth - (MARGIN_X * 2);
            let imageHeight = imageWidth / imgAspectRatio;
            
            // Adjust if image is too tall
            if (imageHeight > pageHeight - FOOTER_HEIGHT - startY) {
              imageHeight = pageHeight - FOOTER_HEIGHT - startY;
              imageWidth = imageHeight * imgAspectRatio;
            }
            
            const xPosition = (pageWidth - imageWidth) / 2;

            doc.addImage({
              imageData: img,
              x: xPosition,
              y: startY,
              width: imageWidth,
              height: imageHeight,
              compression: 'FAST'
            });
            resolve(null);
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = (error) => reject(error);
        img.src = encodedUrl;
      });
    } catch (error) {
      // Add error placeholder
      const pageWidth = doc.internal.pageSize.width;
      const placeholderHeight = 40;
      
      doc.setFillColor(240, 240, 240);
      doc.rect(MARGIN_X, startY, pageWidth - (MARGIN_X * 2), placeholderHeight, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(
        'Image non disponible',
        pageWidth / 2,
        startY + (placeholderHeight / 2),
        { align: 'center' }
      );
    }
  };

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
  doc.setFont('helvetica', 'bold');
  const titleWidth = doc.getTextWidth(title);
  
  const padding = 5; // Padding between border and content
  const textPadding = 8; // Padding for text within grey area
  const sectionWidth = CONTENT_WIDTH - (padding * 2);
  const borderWidth = 0.5; // Thicker border
  
  // Calculate content height and check if we need a page break before starting
  const descriptionText = building?.icpeRegulations || '';
  const textWidth = sectionWidth - (textPadding * 2);
  
  // First pass: calculate the height needed for the first page
  const availableHeight = doc.internal.pageSize.height - FOOTER_HEIGHT - HEADER_HEIGHT - HEADER_BOTTOM_MARGIN - 30;
  const lineHeight = 5;
  const linesPerPage = Math.floor(availableHeight / lineHeight);
  const maxCharsPerLine = Math.floor(textWidth / (doc.getStringUnitWidth('m') * doc.internal.scaleFactor / 1000));
  
  // Calculate total height needed for the section
  const paragraphs = descriptionText.split(/\n/);
  let totalTextHeight = 0;
  
  // Temporarily set text properties to calculate correct heights
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  paragraphs.forEach(paragraph => {
    if (paragraph.trim() === '') {
      totalTextHeight += lineHeight;
    } else {
      // Get exact dimensions for this paragraph
      const dimensions = doc.getTextDimensions(paragraph.trim(), {
        maxWidth: textWidth
      });
      totalTextHeight += dimensions.h + (lineHeight * 0.5);
    }
  });

  // Add extra padding for text spacing
  totalTextHeight += textPadding * 2;
  
  const titleHeight = 8;
  // Calculate total section height including all padding and margins
  const totalSectionHeight = totalTextHeight + titleHeight + (padding * 2);
  
  // Check if we need a new page before starting this section
  const remainingSpace = doc.internal.pageSize.height - FOOTER_HEIGHT - yPosition;
  console.log('Space check:', {
    remainingSpace,
    totalSectionHeight,
    totalTextHeight,
    yPosition,
    pageHeight: doc.internal.pageSize.height
  });
  
  if (remainingSpace < totalSectionHeight) {
    console.log('Not enough space, adding new page');
    doc.addPage();
    addHeader(doc, building, audit);
    yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
  }

  // Now draw the background and border with the correct height
  const innerX = MARGIN_X + padding;
  const innerY = yPosition - 5 + padding;
  
  // Draw grey background for content area only
  doc.setFillColor(240, 240, 240);
  doc.rect(innerX, innerY + titleHeight, sectionWidth, totalTextHeight, 'F');
  
  // Draw the border around everything
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(borderWidth);
  doc.rect(MARGIN_X, yPosition - 5, CONTENT_WIDTH, totalSectionHeight, 'S');
  
  // Title with green background
  doc.setFillColor(0, 106, 60);
  doc.rect(innerX, innerY, sectionWidth, titleHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); // Ensure title is bold
  const titleX = innerX + (sectionWidth - titleWidth) / 2;
  doc.text(title, titleX, innerY + 5);

  // Prepare text content
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9); // Set font size for table content
  doc.setTextColor(0, 0, 0); // Force black color

  // Now write the actual text
  let remainingText = descriptionText;
  let currentY = innerY + titleHeight + textPadding;
  
  // Function to process text chunk with smart justification
  const processTextChunk = (chunk: string, y: number) => {
    let currentY = y;
    
    // Split into paragraphs while preserving empty lines
    const paragraphs = chunk.split(/\n/);
    
    paragraphs.forEach((paragraph) => {
      if (paragraph.trim() === '') {
        // Empty line, just add spacing
        currentY += 5;
        return;
      }

      // For each paragraph, let jsPDF handle the text wrapping and justification
      const textHeight = doc.getTextDimensions(paragraph.trim(), {
        maxWidth: textWidth
      }).h;

      // Calculate how many lines this will take
      const numberOfLines = Math.ceil(textHeight / 5);

      // If this is a single line or empty, don't justify
      if (numberOfLines <= 1 || !paragraph.trim()) {
        doc.text(paragraph.trim(), MARGIN_X + padding + textPadding, currentY, {
          maxWidth: textWidth
        });
      } else {
        // For multi-line paragraphs, justify the text
        doc.text(paragraph.trim(), MARGIN_X + padding + textPadding, currentY, {
          maxWidth: textWidth,
          renderingMode: "fill"
        });
      }

      // Move to next paragraph position
      currentY += textHeight + (5 * 0.5);
    });

    return currentY;
  };
  
  // Split text into chunks that will fit on each page
  while (remainingText.length > 0) {
    const availableSpace = Math.max(linesPerPage * maxCharsPerLine, 1); // Ensure at least 1 character
    let textChunk = remainingText;
    
    if (remainingText.length > availableSpace) {
      // Find last space within available space
      const lastSpaceIndex = remainingText.lastIndexOf(' ', availableSpace);
      if (lastSpaceIndex === -1) {
        // Si pas d'espace trouvé, on coupe au maximum disponible
        textChunk = remainingText.substring(0, Math.max(availableSpace, 1));
        console.log('No space found, cutting at:', availableSpace);
      } else {
        textChunk = remainingText.substring(0, lastSpaceIndex);
        console.log('Text split at space:', lastSpaceIndex);
      }
      remainingText = remainingText.substring(textChunk.length);
    } else {
      remainingText = '';
    }
    
    // Process the text chunk with smart justification
    currentY = processTextChunk(textChunk, currentY);
    
    // If there's more text, add a new page
    if (remainingText.length > 0) {
      doc.addPage();
      addHeader(doc, building, audit);
      
      // Calculate height for remaining text
      const remainingParagraphs = remainingText.split(/\n/);
      let remainingHeight = 0;
      remainingParagraphs.forEach(paragraph => {
        if (paragraph.trim() === '') {
          remainingHeight += 5;
        } else {
          const textHeight = doc.getTextDimensions(paragraph.trim(), {
            maxWidth: textWidth
          }).h;
          remainingHeight += textHeight + (5 * 0.5);
        }
      });
      
      const pageHeight = Math.min(
        remainingHeight + (textPadding * 2),
        doc.internal.pageSize.height - HEADER_HEIGHT - HEADER_BOTTOM_MARGIN - FOOTER_HEIGHT - 20
      );
      
      currentY = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN + textPadding;
      
      // Draw border and background sized to remaining content
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(borderWidth);
      doc.rect(MARGIN_X, HEADER_HEIGHT + HEADER_BOTTOM_MARGIN, CONTENT_WIDTH, pageHeight, 'S');
      
      doc.setFillColor(240, 240, 240);
      doc.rect(MARGIN_X + padding, HEADER_HEIGHT + HEADER_BOTTOM_MARGIN + padding, sectionWidth, pageHeight - (padding * 2), 'F');
      
      doc.setTextColor(0, 0, 0);
    }
  }

  yPosition += totalSectionHeight + (padding * 2) + 5;

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
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  // Define column widths
  const colWidths = {
    rubrique: 25,
    nature: 70,
    capacite: 45,
    regime: 40
  };

  type ColWidthKeys = keyof typeof colWidths;
  
  // ICPE Table header
  doc.setFillColor(232, 251, 211);
  doc.setTextColor(0, 0, 0); // Black text for headers
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

  // Sort ICPE types by regime priority
  const sortedIcpeTypes = sortIcpeTypes(building?.icpeTypes || []);

  // Process each ICPE type
  sortedIcpeTypes.forEach((icpe, index) => {
    // Calculate wrapped text for each cell with consistent padding
    const padding = 2; // Reduced from 4 to 2
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
    const lineHeight = 5; // Reduced from 7 to 5
    const rowHeight = maxLines * lineHeight + (padding * 2);

    // Check if we need a new page
    if (yPosition + rowHeight > doc.internal.pageSize.height - FOOTER_HEIGHT - 10) {
      doc.addPage();
      addHeader(doc, building, audit);
      yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
      
      // Réinitialiser les propriétés du texte après le changement de page
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
    }

    let xPos = MARGIN_X;

    // Set background color for alternating rows
    if (index % 2 === 1) {
      doc.setFillColor(240, 240, 240); // Light gray for odd rows
      doc.rect(MARGIN_X, yPosition, CONTENT_WIDTH, rowHeight, 'F');
    }

    // Draw cells with borders matching addInfoTable
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.setTextColor(0, 0, 0); // Ensure text color is black for cell content

    // Helper function to center text vertically and horizontally in a cell
    const drawCenteredText = (lines: string[], x: number, width: number) => {
      const textHeight = lines.length * lineHeight;
      const verticalPadding = Math.max((rowHeight - textHeight) / 2, padding);
      const startY = yPosition + verticalPadding + (lineHeight * 0.8); // Ajusté pour un meilleur centrage

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

  yPosition = generateSynthese(doc, building, audit, auditElements, templateElements, categories, subCategories);

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

    // Initialize annexe number counter
    let annexeNumber = 2;  // Start from 2 since Photographies is 1

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
      
      // Add Photographies subtitle
      doc.setFontSize(14);
      doc.text(`${lastSectionNumber}.1 Photographies`, MARGIN_X, yPosition);
      yPosition += 15;

      const imagesPerRow = 2;
      const imageWidth = (CONTENT_WIDTH - (imagesPerRow - 1) * 5) / imagesPerRow; // Réduit l'espacement entre les images à 5mm
      const imageHeight = imageWidth * 0.75; // 4:3 ratio
      const padding = 2; // Réduit le padding de 5mm à 2mm
      const bannerHeight = 8; // Réduit légèrement la hauteur du bandeau
      const totalImageHeight = imageHeight + bannerHeight + (padding * 2);
      let currentRow = 0;
      let currentCol = 0;
      let currentPage = 1;

      const processImageWithOrientation = async (
        image: S3Item,
        xPos: number,
        yPos: number,
        loadedImage: HTMLImageElement
      ) => {
        const isPortrait = loadedImage.height > loadedImage.width;

        if (isPortrait) {
          // Pour une image portrait, on adapte la hauteur au cadre
          const maxHeight = imageHeight;
          const aspectRatio = loadedImage.width / loadedImage.height;
          const newHeight = maxHeight;
          const newWidth = newHeight * aspectRatio;
          const xOffset = (imageWidth - newWidth) / 2;

          doc.addImage(
            image.url,
            'JPEG',
            xPos + padding + xOffset,
            yPos + bannerHeight + padding,
            newWidth,
            newHeight,
            undefined,
            'FAST'
          );
        } else {
          // Image paysage - dimensions standard
          doc.addImage(
            image.url,
            'JPEG',
            xPos + padding,
            yPos + bannerHeight + padding,
            imageWidth,
            imageHeight,
            undefined,
            'FAST'
          );
        }
      };

      for (const image of images) {
        // Check if we need a new page
        if (yPosition + totalImageHeight > doc.internal.pageSize.height - FOOTER_HEIGHT) {
          doc.addPage();
          currentPage++;
          addHeader(doc, building, audit);
          yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
          currentRow = 0;
          currentCol = 0;
        }

        const xPosition = MARGIN_X + (currentCol * (imageWidth + 10));
        const currentYPosition = yPosition + (currentRow * (totalImageHeight + 10));

        try {
          const loadedImage = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = image.url;
          });

          if (loadedImage && loadedImage.width && loadedImage.height) {
            await processImageWithOrientation(image, xPosition, currentYPosition, loadedImage);
          }
        } catch (error) {
          console.error(`Erreur de traitement pour l'image ${image.name}:`, error);
        }

        // Draw banner and border
        doc.setFillColor(LIGHTGREEN_BG_COLOR[0], LIGHTGREEN_BG_COLOR[1], LIGHTGREEN_BG_COLOR[2]);
        doc.rect(
          xPosition,
          currentYPosition,
          imageWidth + (padding * 2),
          bannerHeight,
          'F'
        );

        doc.setDrawColor(0, 106, 60);
        doc.setLineWidth(0.5);
        doc.rect(
          xPosition,
          currentYPosition,
          imageWidth + (padding * 2),
          bannerHeight
        );

        const numberMatch = image.name.match(/\d+/);
        const photoNumber = numberMatch ? numberMatch[0] : '';
        const bannerText = `Photo ${photoNumber}`;

        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        const textWidth = doc.getTextWidth(bannerText);
        doc.text(
          bannerText,
          xPosition + ((imageWidth + (padding * 2)) - textWidth) / 2,
          currentYPosition + bannerHeight - 2.5
        );

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(
          xPosition,
          currentYPosition,
          imageWidth + (padding * 2),
          totalImageHeight
        );

        // Update position for next image
        currentCol++;
        if (currentCol >= imagesPerRow) {
          currentCol = 0;
          currentRow++;
          if (currentRow >= 2) {
            yPosition += (totalImageHeight + 10) * 2;
            currentRow = 0;
          }
        }
      }
    }

    // Add Etat des stocks section if files exist
    const etatStocksFiles = groupAndSortFiles('Etat des stocks');
    if (etatStocksFiles.length > 0) {
      doc.addPage();
      addHeader(doc, building, audit);
      yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(`${lastSectionNumber}.${annexeNumber} Etat des stocks`, MARGIN_X, yPosition);
      yPosition += 15;
      
      for (let i = 0; i < etatStocksFiles.length; i++) {
        if (i > 0) {
          doc.addPage();
          addHeader(doc, building, audit);
          yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
        }
        await addFullPageImage(doc, etatStocksFiles[i].url, false, '', yPosition);
      }
      annexeNumber++;
    }

    // Add Plan de stockage section if files exist
    const planStockageFiles = groupAndSortFiles('Plan de stockage');
    if (planStockageFiles.length > 0) {
      doc.addPage();
      addHeader(doc, building, audit);
      yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(`${lastSectionNumber}.${annexeNumber} Plan de stockage`, MARGIN_X, yPosition);
      yPosition += 15;
      
      for (let i = 0; i < planStockageFiles.length; i++) {
        if (i > 0) {
          doc.addPage();
          addHeader(doc, building, audit);
          yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
        }
        await addFullPageImage(doc, planStockageFiles[i].url, false, '', yPosition);
      }
      annexeNumber++;
    }

    // Add Suivi d'inspection section if files exist
    const suiviInspectionFiles = groupAndSortFiles('Suivi d\'inspection');
    if (suiviInspectionFiles.length > 0) {
      doc.addPage();
      addHeader(doc, building, audit);
      yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(`${lastSectionNumber}.${annexeNumber} Suivi d'inspection`, MARGIN_X, yPosition);
      yPosition += 15;
      
      for (let i = 0; i < suiviInspectionFiles.length; i++) {
        if (i > 0) {
          doc.addPage();
          addHeader(doc, building, audit);
          yPosition = HEADER_HEIGHT + HEADER_BOTTOM_MARGIN;
        }
        await addFullPageImage(doc, suiviInspectionFiles[i].url, false, '', yPosition);
      }
      annexeNumber++;
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
