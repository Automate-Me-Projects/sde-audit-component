import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { Section, Category, SubCategory, TemplateElement } from '../types';

interface AddElementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (sectionId: string | null, categoryId: string, subCategoryId: string | null, name: string, position: number) => void;
  sections: Section[];
  categories: Category[];
  subCategories: SubCategory[];
  templateVersion: number;
  templateElements: TemplateElement[];
}

export const AddElementModal: React.FC<AddElementModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  sections = [],
  categories = [],
  subCategories = [],
  templateVersion,
  templateElements = [],
}) => {
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [elementName, setElementName] = useState<string>('');

  useEffect(() => {
    console.log('AddElementModal - templateElements prop received:', JSON.stringify({
      length: templateElements.length,
      sample: templateElements.slice(0, 2),
      timestamp: new Date().toISOString()
    }, null, 2));
  }, [templateElements]);

  const filteredCategories = templateVersion === 2
    ? (categories || []).filter(c => c.section === selectedSection)
    : categories || [];

  const filteredSubCategories = (subCategories || []).filter(s => s.categoryId === selectedCategory);

  const handleAdd = () => {
    console.log('AddElementModal handleAdd - Starting with:', JSON.stringify({
      selectedSection,
      selectedCategory,
      selectedSubCategory,
      templateVersion,
      elementName,
      templateElementsLength: templateElements.length
    }, null, 2));

    // Filter elements with matching category and subcategory
    const matchingElements = templateElements.filter(el => {
      const categoryMatch = el.categoryId === selectedCategory;
      const subCategoryMatch = selectedSubCategory ? el.subCategoryId === selectedSubCategory : !el.subCategoryId;
      const versionMatch = el.templateVersion.includes(templateVersion);
      
      return categoryMatch && subCategoryMatch && versionMatch;
    });

    console.log('AddElementModal - All template elements:', JSON.stringify(templateElements.map(el => ({
      id: el._id,
      name: el.name,
      categoryId: el.categoryId,
      subCategoryId: el.subCategoryId,
      sectionId: el.sectionId,
      templateVersion: el.templateVersion,
      positionByVersion: el.positionByVersion
    })), null, 2));

    // Find highest position
    const highestPosition = matchingElements.reduce((max, el) => {
      const pos = el.positionByVersion[el.positionByVersion.length - 1];
      return pos > max ? pos : max;
    }, 0);

    const newPosition = highestPosition + 1;

    console.log('AddElementModal - Final new element position:', newPosition);

    onAdd(
      templateVersion === 2 ? selectedSection : null,
      selectedCategory,
      selectedSubCategory || null,
      elementName,
      newPosition
    );
    onClose();
    // Reset form
    setSelectedSection('');
    setSelectedCategory('');
    setSelectedSubCategory('');
    setElementName('');
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
          <Dialog.Title as="div" className="mb-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Ajouter un élément
              </h3>
              <button 
                onClick={onClose} 
                className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-2 border-b border-gray-200" />
          </Dialog.Title>

          <div className="space-y-4">
            {templateVersion === 2 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Section</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Sélectionner une section</option>
                  {sections.map((section) => (
                    <option key={section._id} value={section._id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Catégorie</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Sélectionner une catégorie</option>
                {filteredCategories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Sous-catégorie</label>
              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Sélectionner une sous-catégorie</option>
                {filteredSubCategories.map((subCategory) => (
                  <option key={subCategory._id} value={subCategory._id}>
                    {subCategory.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Nom de l&apos;élément</label>
              <input
                type="text"
                value={elementName}
                onChange={(e) => setElementName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                placeholder="Entrer le nom de l'élément"
              />
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!selectedCategory || !elementName}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
              >
                Ajouter
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};