import React from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronsUpDownIcon } from 'lucide-react';
import { ElementDropdownProps, TemplateElement } from '../types';
import { getHierarchyPath, isTemplateElementPresent, sortTemplateElements } from '../utils';

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
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (element: TemplateElement | null) => {
    if (!element) return;

    setSelectedElement(element);
    setIsOpen(false);

    if (onSelect) {
      // Get the position from the element's positionByVersion array for the current template version
      const versionIndex = element.templateVersion.indexOf(templateVersion);
      const position = versionIndex !== -1 ? element.positionByVersion[versionIndex] : 0;
      
      onSelect(
        element.categoryId,
        element.subCategoryId || null,
        element.name,
        position
      );
    }

    // Clear selection after propagation
    requestAnimationFrame(() => {
      setSelectedElement(null);
    });
  };

  // Reset selection when template elements change
  React.useEffect(() => {
    setSelectedElement(null);
  }, [templateElements]);

  const sortedTemplateElements = React.useMemo(() => {
    return sortTemplateElements(allTemplateElements, categories, subCategories, sections, templateVersion);
  }, [allTemplateElements, categories, subCategories, sections, templateVersion]);

  return (
    <div className="relative mt-1">
      <Listbox value={selectedElement} onChange={handleSelect}>
        {({ open }) => (
          <>
            <Listbox.Button 
              className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-300 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm"
              onClick={() => setIsOpen(!isOpen)}
            >
              <span className="block truncate">
                {selectedElement
                  ? getHierarchyPath(selectedElement, categories, subCategories, sections, templateVersion)
                  : "Sélectionner un élément"}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronsUpDownIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </span>
            </Listbox.Button>
            <Transition
              show={isOpen}
              as={React.Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
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
            </Transition>
          </>
        )}
      </Listbox>
    </div>
  );
};