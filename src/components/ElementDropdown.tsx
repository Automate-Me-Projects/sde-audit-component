import React from 'react';
import { Listbox } from '@headlessui/react';
import { ChevronsUpDown } from 'lucide-react';
import { Section, Category, SubCategory, TemplateElement } from '../types';
import { getHierarchyPath, isTemplateElementPresent, sortTemplateElements } from '../utils';

interface ElementDropdownProps {
  sections: Section[];
  categories: Category[];
  subCategories: SubCategory[];
  templateElements: TemplateElement[];
  allTemplateElements: TemplateElement[];
  templateVersion: number;
  onSelect: (sectionId: string | null, categoryId: string, subCategoryId: string | null, name: string) => void;
}

export const ElementDropdown: React.FC<ElementDropdownProps> = ({
  sections,
  categories,
  subCategories,
  templateElements,
  allTemplateElements,
  templateVersion,
  onSelect,
}) => {
  const [selectedElement, setSelectedElement] = React.useState<TemplateElement | null>(null);

  const handleSelect = (element: TemplateElement) => {
    setSelectedElement(element);
    onSelect(element.sectionId || null, element.categoryId, element.subCategoryId || null, element.name);
  };

  const sortedTemplateElements = React.useMemo(() => {
    return sortTemplateElements(allTemplateElements, categories, subCategories, sections, templateVersion);
  }, [allTemplateElements, categories, subCategories, sections, templateVersion]);

  return (
    <Listbox value={selectedElement} onChange={handleSelect}>
      <div className="relative mt-1">
        <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-300 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
          <span className="block truncate">
            {selectedElement
              ? getHierarchyPath(selectedElement, categories, subCategories, sections, templateVersion)
              : 'Ajouter un élément'}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </Listbox.Button>
        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {sortedTemplateElements.map((element) => (
            <Listbox.Option
              key={element._id}
              value={element}
              className={({ active }) =>
                `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                  active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                }`
              }
            >
              {({ selected }) => (
                <>
                  <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                    {isTemplateElementPresent(element, templateElements) && (
                      <span className="text-green-600 mr-2 text-sm">✓ </span>
                    )}
                    {getHierarchyPath(element, categories, subCategories, sections, templateVersion)}
                  </span>
                  {selected && (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                      ✓
                    </span>
                  )}
                </>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
  );
};
