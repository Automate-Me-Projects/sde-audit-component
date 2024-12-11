import { Section, Category, SubCategory, TemplateElement, AuditElement } from '../types';

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

export const generateTempId = (): string => {
  return `temp${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
