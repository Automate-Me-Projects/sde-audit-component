import { jsPDF } from 'jspdf';
import { AuditElement, Building, Audit, TemplateElement, Category, SubCategory, Section } from '../types';
import { MARGIN_X, CONTENT_WIDTH, FOOTER_HEIGHT, HEADER_HEIGHT, HEADER_BOTTOM_MARGIN, GREEN_BG_COLOR, LIGHT_BEIGE } from './constants';
import { addHeader } from './headerFooter';
import { sortTemplateElements, sortSectionsByPosition } from '../utils';
import { measureRichTextHeight, renderRichText } from './richText';

// Helper function pour obtenir la position correcte en fonction de la version du template
const getPositionFromVersion = (
  positionArray: readonly number[] | undefined,
  templateVersionArray: readonly number[] | undefined,
  currentTemplateVersion: number
): number => {
  if (!positionArray?.length || !templateVersionArray?.length) return Infinity;
  const versionIndex = templateVersionArray.indexOf(currentTemplateVersion);
  return versionIndex === -1 ? Infinity : positionArray[versionIndex];
};

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

const SYNTHESE_LINE_HEIGHT = 3.5;

// Calculate required height for text content (gère le texte enrichi)
const calculateTextHeight = (doc: jsPDF, text: string, maxWidth: number) => {
  return measureRichTextHeight(doc, text, maxWidth, 9, SYNTHESE_LINE_HEIGHT);
};

// Function to render wrapped text with page breaks (corps en texte enrichi)
const renderWrappedText = (doc: jsPDF, text: string, x: number, startY: number, maxWidth: number, label?: string) => {
  doc.setFontSize(9);
  let currentY = startY;

  if (label) {
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x, currentY);
    currentY += SYNTHESE_LINE_HEIGHT;
  }

  // L'option A s'applique : la couleur/surlignage utilisateur prime sur le corps.
  const height = renderRichText(doc, text, x, currentY - SYNTHESE_LINE_HEIGHT * 0.8, maxWidth, {
    fontSize: 9,
    lineHeight: SYNTHESE_LINE_HEIGHT,
    justify: false,
    defaultColor: [0, 0, 0],
  });
  return currentY + height;
};

export const generateSynthese = (
  doc: jsPDF,
  building: Building,
  audit: Audit,
  auditElements: AuditElement[],
  templateElements: TemplateElement[],
  categories: Category[],
  subCategories: SubCategory[],
  sections: Section[] = []
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
    nonConformiteMajeure: Array<{name: string, constat: string, action: string, categoryName?: string, position: number, templateElementId?: string}>,
    nonConformes: Array<{name: string, constat: string, action: string, categoryName?: string, position: number, templateElementId?: string}>,
    observations: Array<{name: string, constat: string, action: string, categoryName?: string, position: number, templateElementId?: string}>
  }>();

  // Étape 1: Trier les sections si elles sont disponibles
  const sortedSections = sortSectionsByPosition(sections);
  
  // Étape 2: Trier les templateElements selon l'ordre complet du formulaire
  const sortedTemplateElements = sortTemplateElements(
    templateElements,
    categories,
    subCategories,
    sortedSections, // Utiliser les sections triées
    audit.templateVersion || 1
  );
    
  // Créer une map pour stocker la position de chaque templateElement dans la liste triée
  const templateElementPositionMap = new Map<string, number>();
  sortedTemplateElements.forEach((element, index) => {
    if (element._id) {
      templateElementPositionMap.set(element._id, index);
    }
  });
  
  // Étape 3: Créer une liste complète des auditElements ordonnés
  // Associer chaque auditElement à son templateElement correspondant
  const allOrderedAuditElements = auditElements
    .map(auditElement => {
      const templateElement = templateElements.find(te => te._id === auditElement.templateElementId);
      if (!templateElement) {
        console.log('templateElement non trouvé pour auditElement:', auditElement.templateElementId);
        return null;
      }

      // Récupérer les informations de catégorie et sous-catégorie
      const category = categories.find(c => c._id === templateElement.categoryId);
      const subCategory = templateElement.subCategoryId ? 
        subCategories.find(sc => sc._id === templateElement.subCategoryId) : null;
      
      // Récupérer la section si applicable
      const section = category?.section ? 
        sortedSections.find(s => s._id === category.section) : null;
      
      // Déterminer le nom de la catégorie à afficher (sous-catégorie si elle existe, sinon catégorie)
      const categoryName = subCategory ? subCategory.name : (category ? category.name : '');
      const sectionName = section?.name;

          // Récupérer l'index de l'élément dans la liste triée des templateElements
      // Cet index représente l'ordre exact selon la hiérarchie complète
      const sortedIndex = templateElement._id ? templateElementPositionMap.get(templateElement._id) : undefined;
      
      if (sortedIndex === undefined) {
        console.log('Position non trouvée pour templateElement:', templateElement._id, templateElement.name);
      }

      // Utiliser la fonction getPositionFromVersion pour obtenir les positions correctes
      const getPositionFromVersion = (
        positionArray: readonly number[] | undefined,
        templateVersionArray: readonly number[] | undefined,
        currentTemplateVersion: number
      ): number => {
        if (!positionArray?.length || !templateVersionArray?.length) return Infinity;
        const versionIndex = templateVersionArray.indexOf(currentTemplateVersion);
        return versionIndex === -1 ? Infinity : positionArray[versionIndex];
      };

      // Récupérer les positions réelles dans la hiérarchie en utilisant la même logique que sortTemplateElements
      const templateVersion = audit.templateVersion || 1;
      const sectionPos = templateVersion === 2 ? (section?.position ?? Infinity) : 0;
      const categoryPos = getPositionFromVersion(category?.positionByVersion, category?.templateVersion, templateVersion);
      const subCategoryPos = subCategory 
        ? getPositionFromVersion(subCategory.positionByVersion, subCategory.templateVersion, templateVersion)
        : Infinity;
      const elementPos = getPositionFromVersion(templateElement.positionByVersion, templateElement.templateVersion, templateVersion);

      return {
        auditElement,
        // Utiliser l'index dans la liste triée comme position principale
        position: sortedIndex !== undefined ? sortedIndex : Infinity,
        templateElement,
        categoryName,
        sectionName,
        hierarchyInfo: {
          section: section,
          sectionPos: sectionPos,
          category: category,
          categoryPos: categoryPos,
          subCategory: subCategory,
          subCategoryPos: subCategoryPos,
          elementPos: elementPos
        }
      };
    })
    .filter(item => item !== null) as Array<{
      auditElement: AuditElement,
      position: number,
      templateElement: TemplateElement,
      categoryName: string,
      sectionName?: string,
      hierarchyInfo: {
        section: Section | null,
        sectionPos: number,
        category: Category | null | undefined,
        categoryPos: number,
        subCategory: SubCategory | null,
        subCategoryPos: number,
        elementPos: number
      }
    }>;
    
  // Étape 4: Trier la liste complète selon la hiérarchie
  // Nous utilisons la position dans la liste triée des templateElements
  // Cette position reflète déjà l'ordre correct selon la hiérarchie complète
  allOrderedAuditElements.sort((a, b) => {
    // Utiliser directement la position dans la liste triée des templateElements
    // Cette position est déjà calculée en tenant compte de la hiérarchie complète
    return a.position - b.position;
  });

  // Créer une structure temporaire pour stocker les éléments triés par actionOwner et par status
  const tempOwnerMap = new Map<string, {
    nonConformiteMajeure: Array<{item: typeof allOrderedAuditElements[0], index: number}>,
    nonConformes: Array<{item: typeof allOrderedAuditElements[0], index: number}>,
    observations: Array<{item: typeof allOrderedAuditElements[0], index: number}>
  }>();

  // Créer une map pour accéder rapidement aux informations de hiérarchie des templateElements
  const templateElementMap = new Map<string, {
    hierarchyInfo: {
      sectionPos: number,
      categoryPos: number,
      subCategoryPos: number,
      elementPos: number
    }
  }>();
  
  // Remplir la map avec les informations de hiérarchie des éléments triés
  allOrderedAuditElements.forEach(item => {
    templateElementMap.set(item.templateElement._id, {
      hierarchyInfo: {
        sectionPos: item.hierarchyInfo.sectionPos,
        categoryPos: item.hierarchyInfo.categoryPos,
        subCategoryPos: item.hierarchyInfo.subCategoryPos,
        elementPos: item.hierarchyInfo.elementPos
      }
    });
  });

  // Étape 5: Grouper les éléments triés par actionOwner tout en préservant leur position
  // Nous utilisons la liste déjà triée selon la hiérarchie complète
  allOrderedAuditElements.forEach((item, index) => {
    const { auditElement } = item;
    const actionOwner = auditElement.actionOwner || 'Non assigné';

    if (!tempOwnerMap.has(actionOwner)) {
      tempOwnerMap.set(actionOwner, {
        nonConformiteMajeure: [],
        nonConformes: [],
        observations: []
      });
    }

    const ownerData = tempOwnerMap.get(actionOwner)!;

    // Ajouter l'élément dans la catégorie appropriée en conservant l'index original
    // pour maintenir l'ordre de la liste triée
    if (auditElement.status === 'Non conformité majeure') {
      ownerData.nonConformiteMajeure.push({ item, index });
    } else if (auditElement.status === 'Non conforme') {
      ownerData.nonConformes.push({ item, index });
    } else if (auditElement.status === 'Observation') {
      ownerData.observations.push({ item, index });
    }
  });

  tempOwnerMap.forEach((tempData, actionOwner) => {
    if (!actionOwnerMap.has(actionOwner)) {
      actionOwnerMap.set(actionOwner, {
        nonConformiteMajeure: [],
        nonConformes: [],
        observations: []
      });
    }
    
    const ownerData = actionOwnerMap.get(actionOwner)!;

    // Convertir les non-conformités majeures en conservant l'ordre de la liste triée
    // Nous utilisons l'index original pour maintenir l'ordre exact de la liste complète
    tempData.nonConformiteMajeure
      // Trier en utilisant la position dans la liste triée des templateElements
      .sort((a, b) => {
        const posA = a.item.templateElement._id && templateElementPositionMap.has(a.item.templateElement._id)
          ? templateElementPositionMap.get(a.item.templateElement._id)!
          : Infinity;
        const posB = b.item.templateElement._id && templateElementPositionMap.has(b.item.templateElement._id)
          ? templateElementPositionMap.get(b.item.templateElement._id)!
          : Infinity;
        return posA - posB;
      })
      .forEach(({ item }) => {
        const { templateElement, categoryName, auditElement, position } = item;
        ownerData.nonConformiteMajeure.push({
          name: templateElement.name,
          constat: auditElement.constat || '',
          action: auditElement.action || '',
          categoryName,
          position: templateElementPositionMap.get(templateElement._id) || position,
          templateElementId: templateElement._id
        });
      });

    // Convertir les non-conformes en conservant l'ordre de la liste triée
    tempData.nonConformes
      // Trier en utilisant la position dans la liste triée des templateElements
      .sort((a, b) => {
        const posA = a.item.templateElement._id && templateElementPositionMap.has(a.item.templateElement._id)
          ? templateElementPositionMap.get(a.item.templateElement._id)!
          : Infinity;
        const posB = b.item.templateElement._id && templateElementPositionMap.has(b.item.templateElement._id)
          ? templateElementPositionMap.get(b.item.templateElement._id)!
          : Infinity;
        return posA - posB;
      })
      .forEach(({ item }) => {
        const { templateElement, categoryName, auditElement, position } = item;
        ownerData.nonConformes.push({
          name: templateElement.name,
          constat: auditElement.constat || '',
          action: auditElement.action || '',
          categoryName,
          position: templateElementPositionMap.get(templateElement._id) || position,
          templateElementId: templateElement._id
        });
      });

    // Convertir les observations en conservant l'ordre de la liste triée
    tempData.observations
      // Trier en utilisant la position dans la liste triée des templateElements
      .sort((a, b) => {
        const posA = a.item.templateElement._id && templateElementPositionMap.has(a.item.templateElement._id)
          ? templateElementPositionMap.get(a.item.templateElement._id)!
          : Infinity;
        const posB = b.item.templateElement._id && templateElementPositionMap.has(b.item.templateElement._id)
          ? templateElementPositionMap.get(b.item.templateElement._id)!
          : Infinity;
        return posA - posB;
      })
      .forEach(({ item }) => {
        const { templateElement, categoryName, auditElement, position } = item;
        ownerData.observations.push({
          name: templateElement.name,
          constat: auditElement.constat || '',
          action: auditElement.action || '',
          categoryName,
          position: templateElementPositionMap.get(templateElement._id) || position,
          templateElementId: templateElement._id
        });
      });
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
    doc.setFillColor(GREEN_BG_COLOR[0], GREEN_BG_COLOR[1], GREEN_BG_COLOR[2]);
    doc.rect(MARGIN_X, yPosition - 5, CONTENT_WIDTH, 12, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    // Center the text
    const textWidth = doc.getTextWidth(actionOwner.toUpperCase());
    const centerX = MARGIN_X + (CONTENT_WIDTH / 2) - (textWidth / 2);
    doc.text(actionOwner.toUpperCase(), centerX, yPosition + 3);
    
    yPosition += 8;

    // Définir le type pour les éléments
    type ItemType = {
      name: string;
      constat: string;
      action: string;
      categoryName?: string;
      position: number;
      templateElementId?: string;
    };
    
    // Fonction pour trier les éléments selon la hiérarchie complète
    // Nous utilisons directement la position dans la liste triée des templateElements
    function sortItemsByHierarchy(items: ItemType[]): ItemType[] {
      // Trier les éléments selon leur position dans la liste triée des templateElements
      return [...items].sort((a, b) => {
        // Récupérer la position dans la liste triée des templateElements
        const posA = a.templateElementId && templateElementPositionMap.has(a.templateElementId)
          ? templateElementPositionMap.get(a.templateElementId)!
          : Infinity;
          
        const posB = b.templateElementId && templateElementPositionMap.has(b.templateElementId)
          ? templateElementPositionMap.get(b.templateElementId)!
          : Infinity;
        
        // Comparer les positions
        return posA - posB;
      });
    }
    
    // Trier les éléments par position avant de les afficher
    const sortedNonConformiteMajeure = sortItemsByHierarchy(data.nonConformiteMajeure);
    const sortedNonConformes = sortItemsByHierarchy(data.nonConformes);
    const sortedObservations = sortItemsByHierarchy(data.observations);
    
    // Render non-conformités majeures if any exist
    if (sortedNonConformiteMajeure.length > 0) {
      // Calculate height needed for title and first item
      const titleHeight = 12; // Height for the title section
      const item = sortedNonConformiteMajeure[0];
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

      sortedNonConformiteMajeure.forEach((item, index) => {
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

    if (sortedNonConformes.length > 0) {
      // Calculate height needed for title and first item
      const titleHeight = 12; // Height for the title section
      const item = sortedNonConformes[0];
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

      sortedNonConformes.forEach((item, index) => {
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

    if (sortedObservations.length > 0) {
      // Calculate height needed for title and first item
      const titleHeight = 12; // Height for the title section
      const item = sortedObservations[0];
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

      sortedObservations.forEach((item, index) => {
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
