import React, { useCallback, useState } from 'react';
import { Trash2, Copy } from 'lucide-react';
import { StatusDropdown } from './StatusDropdown';
import {
  Section,
  Category,
  SubCategory,
  TemplateElement,
  AuditElement,
  Regulatory
} from '../types';
import { sortTemplateElements } from '../utils';
import debounce from 'lodash/debounce';

interface AuditElementsProps {
  sections: Section[];
  categories: Category[];
  subCategories: SubCategory[];
  templateElements: TemplateElement[];
  auditElements: AuditElement[];
  regulatories: Regulatory[];
  templateVersion: number;
  actors: string[];
  onElementChange: (elementId: string, field: string, value: any) => void;
  onElementDuplicate: (element: TemplateElement) => void;
  onElementDelete: (elementId: string) => void;
  onElementAdd: (sectionId: string | null, categoryId: string, subCategoryId: string | null, name: string, position: number) => void;
}

export const AuditElements: React.FC<AuditElementsProps> = ({
  sections,
  categories,
  subCategories,
  templateElements,
  auditElements,
  regulatories,
  templateVersion,
  actors,
  onElementChange,
  onElementDuplicate,
  onElementDelete,
  onElementAdd,
}) => {
  const [localState, setLocalState] = React.useState<{[key: string]: string}>({});

  const debouncedElementChange = useCallback(
    debounce((elementId: string, field: string, value: any) => {
      onElementChange(elementId, field, value);
    }, 300),
    [onElementChange]
  );

  const handleTextChange = (elementId: string, field: string, value: string) => {
    // Update local state immediately
    setLocalState(prev => ({
      ...prev,
      [`${elementId}-${field}`]: value
    }));
    // Debounce the actual change
    debouncedElementChange(elementId, field, value);
  };

  const getLocalValue = (elementId: string, field: string) => {
    const localValue = localState[`${elementId}-${field}`];
    if (localValue !== undefined) {
      return localValue;
    }
    const auditElement = auditElements.find(ae => ae._id === elementId || ae.templateElementId === elementId);
    return auditElement ? (auditElement as any)[field] || '' : '';
  };

  const renderRegulatory = (sectionId: string, categoryId: string, subCategoryId?: string) => {
    const regulatory = regulatories.find(
      r =>
        r.sectionId === sectionId &&
        r.categoryId === categoryId &&
        (!subCategoryId ? 
          (!r.subCategoryId || r.subCategoryId === "null" || r.subCategoryId === "") :
          r.subCategoryId === subCategoryId
        )
    );

    if (!regulatory) return null;

    return (
      <div className="bg-gray-100 p-4 my-2 italic text-black">
        {regulatory.text}
      </div>
    );
  };

  const renderElements = () => {
    if (templateVersion === 2) {
      // First get and sort sections
      const validSections = (sections || [])
        .filter(section => section.templateVersion?.includes(templateVersion))
        .sort((a, b) => (a.position || 0) - (b.position || 0));

      return validSections.map((section) => {
        // For each section, get its categories
        const sectionCategories = (categories || [])
          .filter(category => 
            category.section === section._id && 
            category.templateVersion?.includes(templateVersion)
          );

        // Sort categories using the same logic as sortTemplateElements
        const sortedCategories = sortTemplateElements(
          sectionCategories.map(c => ({ ...c, _id: c._id, categoryId: c._id })) as unknown as TemplateElement[],
          categories,
          subCategories,
          sections,
          templateVersion
        ).map(te => categories?.find(c => c._id === te._id)!);

        if (sortedCategories.length === 0) return null;

        return (
          <div key={section._id} className="w-full">
            <h2 className="text-black text-xl font-medium mb-4">{section.name}</h2>
            <div className="w-full space-y-6">
              {sortedCategories.map((category) => renderCategory(category, section._id))}
            </div>
          </div>
        );
      });
    }

    // For template version 1, just get categories
    const validCategories = (categories || [])
      .filter(category => category.templateVersion?.includes(templateVersion));

    // Sort categories using the same logic as sortTemplateElements
    const sortedCategories = sortTemplateElements(
      validCategories.map(c => ({ ...c, _id: c._id, categoryId: c._id })) as unknown as TemplateElement[],
      categories,
      subCategories,
      sections,
      templateVersion
    ).map(te => categories?.find(c => c._id === te._id)!);

    return sortedCategories.map((category) => renderCategory(category));
  };

  const renderCategory = (category: Category, sectionId?: string) => {
    // Get subcategories for this category
    const categorySubCategories = (subCategories || [])
      .filter(subCategory => 
        subCategory.categoryId === category._id && 
        subCategory.templateVersion?.includes(templateVersion)
      );

    // Sort subcategories using sortTemplateElements
    const sortedSubCategories = sortTemplateElements(
      categorySubCategories.map(sc => ({ ...sc, _id: sc._id, categoryId: sc.categoryId })) as unknown as TemplateElement[],
      categories,
      subCategories,
      sections,
      templateVersion
    ).map(te => subCategories?.find(sc => sc._id === te._id)!);

    // Get and sort template elements that are directly linked to this category (no subcategory)
    const directTemplateElements = sortTemplateElements(
      (templateElements || []).filter(element => 
        element.categoryId === category._id && 
        (!element.subCategoryId || element.subCategoryId === '') && 
        element.templateVersion?.includes(templateVersion)
      ),
      categories,
      subCategories,
      sections,
      templateVersion
    );

    if (sortedSubCategories.length === 0 && directTemplateElements.length === 0) return null;

    return (
      <div key={category._id} className="w-full mb-6">
        <h3 className="text-[rgb(0,106,60)] text-lg font-semibold mb-3">{category.name}</h3>
        {sectionId && renderRegulatory(sectionId, category._id)}
        <div className="w-full space-y-6">
          {/* Render subcategories if any */}
          {sortedSubCategories.map((subCategory) =>
            renderSubCategory(subCategory, sectionId, category)
          )}
          {/* Render direct template elements if any */}
          {directTemplateElements.map((element) => (
            <div key={element._id} className="grid grid-cols-[auto,2fr,3fr,1.5fr,1.5fr,3fr,1.5fr] gap-x-6 mb-2 p-2 bg-white rounded-lg shadow-sm w-full border border-gray-200">
              <div className="flex space-x-2 min-w-[60px] self-center">
                <button
                  onClick={() => {
                    console.log('Delete button clicked for element:', element._id);
                    onElementDelete(element._id);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    console.log('Duplicate button clicked - Full element:', JSON.stringify(element, null, 2));
                    onElementDuplicate(element);
                  }}
                  className="text-green-500 hover:text-green-700"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-gray-50 min-h-[80px] w-full">
                {element.name}
              </div>

              <textarea
                value={getLocalValue(element._id, 'constat')}
                onChange={(e) => {
                  const value = e.target.value;
                  handleTextChange(element._id, 'constat', value);
                }}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                rows={3}
              />

              <div>
                <StatusDropdown
                  value={auditElements.find(ae => ae._id === element._id || ae.templateElementId === element._id)?.status || ''}
                  onChange={(value) => onElementChange(element._id, 'status', value)}
                  options={[
                    'Conforme',
                    'Non conforme',
                    'Observation',
                    'Sans objet',
                    'Pour information',
                  ]}
                />
              </div>

              <div>
                <select
                  value={auditElements.find(ae => ae._id === element._id || ae.templateElementId === element._id)?.actionType || ''}
                  onChange={(e) => onElementChange(element._id, 'actionType', e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Type d&apos;action</option>
                  {['Documentaire', 'Travaux', 'Exploitation', 'Contrôle réglementaire'].map(
                    (type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    )
                  )}
                </select>
              </div>

              <textarea
                value={getLocalValue(element._id, 'action')}
                onChange={(e) => {
                  const value = e.target.value;
                  handleTextChange(element._id, 'action', value);
                }}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                rows={3}
              />

              <div>
                <select
                  value={auditElements.find(ae => ae._id === element._id || ae.templateElementId === element._id)?.actionOwner || ''}
                  onChange={(e) => onElementChange(element._id, 'actionOwner', e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Acteur</option>
                  {(actors || []).map((actor) => (
                    <option key={actor} value={actor}>
                      {actor}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSubCategory = (subCategory: SubCategory, sectionId?: string, category?: Category) => {
    // Get and sort template elements for this subcategory
    const subCategoryElements = sortTemplateElements(
      (templateElements || []).filter(element => 
        element.subCategoryId === subCategory._id && 
        element.templateVersion?.includes(templateVersion)
      ),
      categories,
      subCategories,
      sections,
      templateVersion
    );

    if (subCategoryElements.length === 0) return null;

    return (
      <div key={subCategory._id} className="w-full">
        <h4 className="text-[rgb(146,208,80)] text-base font-medium mb-2">{subCategory.name}</h4>
        {sectionId && renderRegulatory(sectionId, category?._id, subCategory._id)}
        <div className="w-full space-y-4">
          {subCategoryElements.map((element) => (
            <div key={element._id} className="grid grid-cols-[auto,2fr,3fr,1.5fr,1.5fr,3fr,1.5fr] gap-x-6 mb-2 p-2 bg-white rounded-lg shadow-sm w-full border border-gray-200">
              <div className="flex space-x-2 min-w-[60px] self-center">
                <button
                  onClick={() => {
                    console.log('Delete button clicked for element:', element._id);
                    onElementDelete(element._id);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    console.log('Duplicate button clicked - Full element:', JSON.stringify(element, null, 2));
                    onElementDuplicate(element);
                  }}
                  className="text-green-500 hover:text-green-700"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-gray-50 min-h-[80px] w-full">
                {element.name}
              </div>

              <textarea
                value={getLocalValue(element._id, 'constat')}
                onChange={(e) => {
                  const value = e.target.value;
                  handleTextChange(element._id, 'constat', value);
                }}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                rows={3}
              />

              <div>
                <StatusDropdown
                  value={auditElements.find(ae => ae._id === element._id || ae.templateElementId === element._id)?.status || ''}
                  onChange={(value) => onElementChange(element._id, 'status', value)}
                  options={[
                    'Conforme',
                    'Non conforme',
                    'Observation',
                    'Sans objet',
                    'Pour information',
                  ]}
                />
              </div>

              <div>
                <select
                  value={auditElements.find(ae => ae._id === element._id || ae.templateElementId === element._id)?.actionType || ''}
                  onChange={(e) => onElementChange(element._id, 'actionType', e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Type d&apos;action</option>
                  {['Documentaire', 'Travaux', 'Exploitation', 'Contrôle réglementaire'].map(
                    (type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    )
                  )}
                </select>
              </div>

              <textarea
                value={getLocalValue(element._id, 'action')}
                onChange={(e) => {
                  const value = e.target.value;
                  handleTextChange(element._id, 'action', value);
                }}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                rows={3}
              />

              <div>
                <select
                  value={auditElements.find(ae => ae._id === element._id || ae.templateElementId === element._id)?.actionOwner || ''}
                  onChange={(e) => onElementChange(element._id, 'actionOwner', e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Acteur</option>
                  {(actors || []).map((actor) => (
                    <option key={actor} value={actor}>
                      {actor}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {renderElements()}
    </div>
  );
};