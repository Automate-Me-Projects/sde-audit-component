import { Section, Category, SubCategory, TemplateElement, ExpandedElement } from '../types';

export const sortByPosition = (items: Category[] | SubCategory[] | TemplateElement[], templateVersion: number): Category[] | SubCategory[] | TemplateElement[] => {
  return [...items].sort((a, b) => {
    // Find index of templateVersion in templateVersion array, then use that index for positionByVersion
    const indexA = (a.templateVersion as readonly number[])?.indexOf(templateVersion) ?? -1;
    const indexB = (b.templateVersion as readonly number[])?.indexOf(templateVersion) ?? -1;
    const posA = indexA !== -1 ? (a.positionByVersion?.[indexA] ?? Infinity) : Infinity;
    const posB = indexB !== -1 ? (b.positionByVersion?.[indexB] ?? Infinity) : Infinity;
    return posA - posB;
  });
};

export const sortSections = (sections: Section[]): Section[] => {
  return [...sections].sort((a, b) => a.position - b.position);
};

export const sortSectionsByPosition = (sections: Section[]): Section[] => {
  return [...sections].sort((a, b) => (a.position || 0) - (b.position || 0));
};

export const getHierarchyPath = (
  templateElement: TemplateElement,
  categories: Category[],
  subCategories: SubCategory[],
  sections: Section[],
  templateVersion: number
): string => {
  const category = categories.find(c => c._id === templateElement.categoryId);
  const subCategory = subCategories.find(s => s._id === templateElement.subCategoryId);
  
  if (templateVersion === 2) {
    const section = sections.find(s => s._id === category?.section);
    const parts = [
      section?.name,
      category?.name,
      subCategory?.name,
      templateElement.name
    ].filter(Boolean); // Remove empty/undefined values
    return parts.join(' / ');
  }
  
  const parts = [
    category?.name,
    subCategory?.name,
    templateElement.name
  ].filter(Boolean); // Remove empty/undefined values
  return parts.join(' / ');
};

export const isTemplateElementPresent = (
  templateElement: TemplateElement,
  templateElements: TemplateElement[]
): boolean => {
  return templateElements.some(te => te._id === templateElement._id);
};

export const generateTempId = () => 'temp_' + Math.random().toString(36).substr(2, 9);

export const createTimestamp = () => ({
  _seconds: Math.floor(Date.now() / 1000),
  _nanoseconds: (Date.now() % 1000) * 1000000
});

// Helper to extract seconds from various Firestore Timestamp formats
const getSecondsFromTimestamp = (date: any): number | null => {
  if (!date || typeof date !== 'object') return null;
  // Firebase SDK Timestamp (with toDate method)
  if (typeof date.toDate === 'function') {
    return date.toDate().getTime() / 1000;
  }
  // Serialized Timestamp with _seconds
  if ('_seconds' in date) {
    return date._seconds;
  }
  // Serialized Timestamp with seconds
  if ('seconds' in date) {
    return date.seconds;
  }
  return null;
};

export const formatDate = (date: string | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number } | Date | null | undefined): string => {
  if (!date) return '';

  let dateObject: Date;

  // Handle Firestore Timestamp object (various formats)
  if (typeof date === 'object' && !(date instanceof Date)) {
    const seconds = getSecondsFromTimestamp(date);
    if (seconds !== null) {
      dateObject = new Date(seconds * 1000);
    } else {
      return '';
    }
  } else if (date instanceof Date) {
    dateObject = date;
  } else if (typeof date === 'string') {
    dateObject = new Date(date);
  } else {
    return '';
  }

  // Check for invalid date
  if (isNaN(dateObject.getTime())) return '';

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return `${months[dateObject.getMonth()]} ${dateObject.getFullYear()}`;
};

// Convert any date format to ISO string (yyyy-MM-dd) for HTML date inputs
export const toISODateString = (date: string | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number } | Date | null | undefined): string => {
  if (!date) return '';

  let dateObject: Date;

  // Handle Firestore Timestamp object (various formats)
  if (typeof date === 'object' && !(date instanceof Date)) {
    const seconds = getSecondsFromTimestamp(date);
    if (seconds !== null) {
      dateObject = new Date(seconds * 1000);
    } else {
      return '';
    }
  } else if (date instanceof Date) {
    dateObject = date;
  } else if (typeof date === 'string') {
    // Already in correct format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // Handle DD/MM/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      const [day, month, year] = date.split('/');
      return `${year}-${month}-${day}`;
    }
    dateObject = new Date(date);
  } else {
    return '';
  }

  // Check for invalid date
  if (isNaN(dateObject.getTime())) return '';

  // Return in yyyy-MM-dd format
  const year = dateObject.getFullYear();
  const month = String(dateObject.getMonth() + 1).padStart(2, '0');
  const day = String(dateObject.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateToFrench = (date: string | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number } | Date | null | undefined): string => {
  if (!date) return '';

  let dateObject: Date;

  // Handle Firestore Timestamp object (various formats)
  if (typeof date === 'object' && !(date instanceof Date)) {
    const seconds = getSecondsFromTimestamp(date);
    if (seconds !== null) {
      dateObject = new Date(seconds * 1000);
    } else {
      return '';
    }
  } else if (date instanceof Date) {
    dateObject = date;
  } else if (typeof date === 'string') {
    // Handle string in YYYY-MM-DD format
    if (date.includes('-')) {
      const [year, month, day] = date.split('-');
      return `${day}/${month}/${year}`;
    }
    // Already in DD/MM/YYYY format or other
    return date;
  } else {
    return '';
  }

  // Check for invalid date
  if (isNaN(dateObject.getTime())) return '';

  const day = String(dateObject.getDate()).padStart(2, '0');
  const month = String(dateObject.getMonth() + 1).padStart(2, '0');
  const year = dateObject.getFullYear();
  return `${day}/${month}/${year}`;
};

export const compareImageNames = (a?: string, b?: string): number => {
  const nameA = (a || '').toLowerCase();
  const nameB = (b || '').toLowerCase();
  return nameA.localeCompare(nameB);
};

export const getFileNameWithoutExtension = (fileName: string): string => {
  return fileName.replace(/\.[^/.]+$/, "");
};

export const sortTemplateElements = (
  templateElements: TemplateElement[],
  categories: Category[] | null | undefined,
  subCategories: SubCategory[] | null | undefined,
  sections: Section[] | null | undefined,
  templateVersion: number
): TemplateElement[] => {
  if (!templateElements?.length) return [];
  const categoriesArray = categories || [];
  const subCategoriesArray = subCategories || [];
  const sectionsArray = sections || [];

  // Helper function to get position safely based on template version
  const getPositionFromVersion = (
    positionArray: readonly number[] | undefined,
    templateVersionArray: readonly number[] | undefined,
    currentTemplateVersion: number
  ): number => {
    if (!positionArray?.length || !templateVersionArray?.length) return Infinity;
    const versionIndex = templateVersionArray.indexOf(currentTemplateVersion);
    return versionIndex === -1 ? Infinity : positionArray[versionIndex];
  };

  // Get the full hierarchy position for an element
  const getHierarchyPosition = (element: TemplateElement) => {
    const category = categoriesArray.find(c => c._id === element.categoryId);
    const subCategory = element.subCategoryId ? subCategoriesArray.find(s => s._id === element.subCategoryId) : null;
    
    // Only consider section if templateVersion is 2
    const section = templateVersion === 2 && category?.section 
      ? sectionsArray.find(s => s._id === category.section) 
      : null;

    const sectionPos = templateVersion === 2 ? (section?.position ?? Infinity) : 0;
    const categoryPos = getPositionFromVersion(category?.positionByVersion, category?.templateVersion, templateVersion);
    const subCategoryPos = subCategory 
      ? getPositionFromVersion(subCategory.positionByVersion, subCategory.templateVersion, templateVersion)
      : Infinity;
    const elementPos = getPositionFromVersion(element.positionByVersion, element.templateVersion, templateVersion);

    return {
      sectionPos,
      categoryPos,
      subCategoryPos,
      elementPos,
      names: {
        section: section?.name,
        category: category?.name,
        subCategory: subCategory?.name,
        element: element.name
      }
    };
  };

  return [...templateElements].sort((a, b) => {
    const posA = getHierarchyPosition(a);
    const posB = getHierarchyPosition(b);

    // Only compare sections if templateVersion is 2
    if (templateVersion === 2 && posA.sectionPos !== posB.sectionPos) {
      return posA.sectionPos - posB.sectionPos;
    }

    // Compare category positions
    if (posA.categoryPos !== posB.categoryPos) {
      return posA.categoryPos - posB.categoryPos;
    }

    // Compare subcategory positions
    if (posA.subCategoryPos !== posB.subCategoryPos) {
      return posA.subCategoryPos - posB.subCategoryPos;
    }

    // Compare element positions
    return posA.elementPos - posB.elementPos;
  });
};

export const sortExpandedTemplateElements = (
  elements: ExpandedElement[],
  templateVersion: number
): ExpandedElement[] => {
  return [...elements].sort((a, b) => {
    // Find the index of the current version in templateVersion array
    const indexA = a.templateVersion?.indexOf(templateVersion) ?? -1;
    const indexB = b.templateVersion?.indexOf(templateVersion) ?? -1;

    // Use the found index to get the corresponding position
    // If version not found (index === -1) or position not available, use Infinity
    const posA = indexA !== -1 && a.positionByVersion?.[indexA] !== undefined 
      ? a.positionByVersion[indexA] 
      : Infinity;
    const posB = indexB !== -1 && b.positionByVersion?.[indexB] !== undefined 
      ? b.positionByVersion[indexB] 
      : Infinity;

    // If positions are equal, sort by name for stability
    if (posA === posB) {
      return (a.name || '').localeCompare(b.name || '');
    }
    return posA - posB;
  });
};

export const normalizeRegime = (regime: string): string => {
  const normalized = regime?.toLowerCase().trim() || '';
  if (normalized.includes('contrôle') || normalized.includes('controle')) {
    return 'déclaration et contrôle';
  }
  return normalized;
};

type RegimeType = 'autorisation' | 'enregistrement' | 'déclaration et contrôle' | 'déclaration' | 'non classé';

const regimePriority: Record<RegimeType, number> = {
  'autorisation': 0,
  'enregistrement': 1,
  'déclaration et contrôle': 2,
  'déclaration': 3,
  'non classé': 4
};

export const sortIcpeTypes = <T extends { regime?: string; rubrique?: string }>(icpeTypes: T[]): T[] => {
  return [...icpeTypes].sort((a, b) => {
    const regimeA = normalizeRegime(a.regime || '');
    const regimeB = normalizeRegime(b.regime || '');
    const priorityA = regimePriority[regimeA as RegimeType] ?? 999;
    const priorityB = regimePriority[regimeB as RegimeType] ?? 999;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // If same regime, sort by rubrique
    return (a.rubrique || '').localeCompare(b.rubrique || '');
  });
};

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}