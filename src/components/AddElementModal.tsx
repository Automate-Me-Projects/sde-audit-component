import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { Section, Category, SubCategory } from '../types';

interface AddElementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (sectionId: string | null, categoryId: string, subCategoryId: string | null, name: string) => void;
  sections: Section[];
  categories: Category[];
  subCategories: SubCategory[];
  templateVersion: number;
}

export const AddElementModal: React.FC<AddElementModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  sections = [],
  categories = [],
  subCategories = [],
  templateVersion,
}) => {
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [elementName, setElementName] = useState<string>('');

  const filteredCategories = templateVersion === 2
    ? (categories || []).filter(c => c.section === selectedSection)
    : categories || [];

  const filteredSubCategories = (subCategories || []).filter(s => s.categoryId === selectedCategory);

  const handleAdd = () => {
    onAdd(
      templateVersion === 2 ? selectedSection : null,
      selectedCategory,
      selectedSubCategory || null,
      elementName
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
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
          <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center">
            Ajouter un élément
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-6 w-6" />
            </button>
          </Dialog.Title>

          <div className="mt-4 space-y-4">
            {templateVersion === 2 && (
              <div>
                <label className="label">Section</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="select"
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

            <div>
              <label className="label">Catégorie</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="select"
              >
                <option value="">Sélectionner une catégorie</option>
                {filteredCategories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Sous-catégorie</label>
              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                className="select"
              >
                <option value="">Sélectionner une sous-catégorie</option>
                {filteredSubCategories.map((subCategory) => (
                  <option key={subCategory._id} value={subCategory._id}>
                    {subCategory.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Nom de l&apos;élément</label>
              <input
                type="text"
                value={elementName}
                onChange={(e) => setElementName(e.target.value)}
                className="input"
                placeholder="Entrer le nom de l&apos;élément"
              />
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!selectedCategory || !elementName}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
