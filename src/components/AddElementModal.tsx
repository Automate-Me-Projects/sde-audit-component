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
  // Log initial props
  useEffect(() => {
  }, []);

  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
  const [elementName, setElementName] = useState<string>('');

  useEffect(() => {
    console.log('AddElementModal - templateElements prop received:', JSON.stringify({
      length: templateElements.length,
      sample: templateElements.slice(0, 2),
      timestamp: new Date().toISOString()
    }, null, 2));
  }, [templateElements]);

  const filteredCategories = templateVersion === 2
    ? (categories || []).filter(c => c.section === selectedSection?._id)
    : categories || [];

  const filteredSubCategories = (subCategories || []).filter(s => s.categoryId === selectedCategory?._id);

  const handleCategorySelect = (category: Category) => {
    console.log('🔍 AddElementModal handleCategorySelect - Selected category:', {
      id: category._id,
      name: category.name
    });

    setSelectedCategory(category);
    setSelectedSubCategory(null);
    setElementName('');
  };

  const handleSubCategorySelect = (subCategory: SubCategory) => {
    console.log('🔍 AddElementModal handleSubCategorySelect - Selected subcategory:', {
      id: subCategory._id,
      name: subCategory.name,
      categoryId: selectedCategory?._id
    });

    setSelectedSubCategory(subCategory);
    setSelectedSection(null);
    setElementName('');
  };

  const handleSectionSelect = (section: Section) => {
    console.log('🔍 AddElementModal handleSectionSelect - Selected section:', {
      id: section._id,
      name: section.name,
      categoryId: selectedCategory?._id,
      subCategoryId: selectedSubCategory?._id
    });

    setSelectedSection(section);
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setElementName('');
  };

  const handleAddElement = () => {
    console.log('🔍 AddElementModal handleAddElement - Starting:', {
      selectedSection: selectedSection ? JSON.stringify(selectedSection) : 'null',
      selectedCategory: selectedCategory ? JSON.stringify(selectedCategory) : 'null',
      selectedSubCategory: selectedSubCategory ? JSON.stringify(selectedSubCategory) : 'null',
      elementName,
      templateVersion
    });

    if (!selectedCategory) {
      console.error('❌ AddElementModal handleAddElement - No category selected');
      return;
    }

    console.log('🔍 AddElementModal handleAddElement - Adding element:', {
      categoryId: selectedCategory._id,
      subCategoryId: selectedSubCategory?._id,
      sectionId: selectedSection?._id,
      name: elementName,
      position: templateElements.length
    });

    onAdd(
      selectedSection?._id || null,
      selectedCategory._id,
      selectedSubCategory?._id || null,
      elementName,
      templateElements.length
    );

    // Clear form and close modal
    setSelectedSection(null);
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setElementName('');
    onClose();
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
                  value={selectedSection?._id || ''}
                  onChange={(e) => {
                    const selected = sections.find(s => s._id === e.target.value);
                    if (selected) {
                      handleSectionSelect(selected);
                    }
                    // Do nothing if no section is selected
                  }}
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
                value={selectedCategory?._id || ''}
                onChange={(e) => {
                  console.log(' Category selection changed:', {
                    selectedValue: e.target.value,
                    filteredCategoriesCount: filteredCategories.length
                  });
                  const selected = filteredCategories.find(c => c._id === e.target.value);
                  if (selected) {
                    handleCategorySelect(selected);
                  }
                  // Do nothing if no category is selected
                }}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Sélectionner une catégorie</option>
                {filteredCategories.map((category) => {
                  console.log('Rendering category option:', {
                    id: category._id,
                    name: category.name,
                    sectionId: category.sectionId
                  });
                  return (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Sous-catégorie</label>
              <select
                value={selectedSubCategory?._id || ''}
                onChange={(e) => handleSubCategorySelect(subCategories.find(s => s._id === e.target.value) || null)}
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
                onClick={handleAddElement}
                disabled={!selectedCategory}
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