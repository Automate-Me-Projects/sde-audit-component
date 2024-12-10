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
    return `${section?.name ?? ''} / ${category?.name ?? ''} / ${subCategory?.name ?? ''} / ${templateElement.name}`;
  }
  
  return `${category?.name ?? ''} / ${subCategory?.name ?? ''} / ${templateElement.name}`;
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
