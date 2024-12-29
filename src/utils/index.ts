import { Section, Category, SubCategory, TemplateElement, AuditElement, ExpandedElement } from '../types';

export const sortByPosition = (items: any[], templateVersion: number): any[] => {
  return [...items].sort((a, b) => {
    const posA = a.positionByVersion?.[templateVersion - 1] ?? Infinity;
    const posB = b.positionByVersion?.[templateVersion - 1] ?? Infinity;
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

export const formatDate = (date: string | null | undefined): string => {
  if (!date) return '';
  const dateObject = new Date(date);
  const months = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];
  return `${months[dateObject.getMonth()]} ${dateObject.getFullYear()}`;
};

export const compareImageNames = (a: string, b: string): number => {
  const getNumber = (name: string) => {
    const match = name.match(/\((\d+)\)/);
    return match ? parseInt(match[1]) : 0;
  };
  
  const numA = getNumber(a);
  const numB = getNumber(b);
  return numA - numB;
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