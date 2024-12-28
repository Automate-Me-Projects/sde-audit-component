import React, { useState } from 'react';
import { Trash2, Copy } from 'lucide-react';
import { StatusDropdown } from './StatusDropdown';
import {
  Section,
  Category,
  SubCategory,
  TemplateElement,
  AuditElement,
  Regulatory,
  ExpandedElement
} from '../types';
import { sortByPosition, sortExpandedTemplateElements, sortSectionsByPosition } from '../utils';

interface AuditElementsProps {
  sections: Section[];
  categories: Category[];
  subCategories: SubCategory[];
  templateElements: TemplateElement[];
  auditElements: AuditElement[];
  regulatories: Regulatory[];
  templateVersion: number;
  actors: string[];
  onAuditElementChange: (elementId: string, field: string, value: string) => void;
  onElementDuplicate: (element: ExpandedElement) => void;
  onElementDelete: (elementId: string) => void;
  onElementAdd: (sectionId: string | null, categoryId: string, subCategoryId: string | null, name: string, position: number) => void;
}

interface AuditElementRowProps {
  expandedElement: ExpandedElement;
  onElementDelete: (elementId: string) => void;
  onElementDuplicate: (element: ExpandedElement) => void;
  onAuditElementChange: (elementId: string, field: string, value: string) => void;
  actors: string[];
}

const AuditElementRow: React.FC<AuditElementRowProps> = ({
  expandedElement,
  onElementDelete,
  onElementDuplicate,
  onAuditElementChange,
  actors,
}) => {
  const [textValues, setTextValues] = useState<{[key: string]: string}>({});
  const [dropdownValues, setDropdownValues] = useState<{[key: string]: string}>({
    status: expandedElement.auditElement?.status || '',
    actionType: expandedElement.auditElement?.actionType || '',
    actionOwner: expandedElement.auditElement?.actionOwner || ''
  });

  const handleTextChange = (elementId: string, field: string, value: string) => {
    setTextValues(prev => ({
      ...prev,
      [`${elementId}-${field}`]: value
    }));
    onAuditElementChange(elementId, field, value);
  };

  const handleDropdownChange = (field: string, value: string) => {
    setDropdownValues(prev => ({
      ...prev,
      [field]: value
    }));
    onAuditElementChange(
      expandedElement.auditElement?._id || expandedElement._id,
      field,
      value
    );
  };

  const getTextValue = (elementId: string, field: 'constat' | 'action') => {
    const localValue = textValues[`${elementId}-${field}`];
    return localValue !== undefined ? localValue : expandedElement.auditElement?.[field] || '';
  };

  const getDropdownValue = (field: 'status' | 'actionType' | 'actionOwner') => {
    return dropdownValues[field] !== undefined 
      ? dropdownValues[field] 
      : expandedElement.auditElement?.[field] || '';
  };

  return (
    <div 
      className="grid grid-cols-[auto,2fr,3fr,1.5fr,1.5fr,3fr,1.5fr] gap-x-6 mb-2 p-2 bg-white rounded-lg shadow-sm w-full border border-gray-200"
    >
      <div className="flex space-x-2 min-w-[60px] self-center">
        <button
          onClick={() => expandedElement.auditElement?._id && onElementDelete(expandedElement.auditElement._id)}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-5 w-5" />
        </button>
        <button
          onClick={() => onElementDuplicate(expandedElement)}
          className="text-green-500 hover:text-green-700"
        >
          <Copy className="h-5 w-5" />
        </button>
      </div>

      <div className="bg-gray-50 min-h-[80px] w-full">
        {expandedElement.name}
      </div>

      <textarea
        value={getTextValue(expandedElement.auditElement?._id || expandedElement._id, 'constat')}
        onChange={(e) => handleTextChange(
          expandedElement.auditElement?._id || expandedElement._id,
          'constat',
          e.target.value
        )}
        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
        rows={3}
      />

      <div>
        <StatusDropdown
          value={getDropdownValue('status')}
          onChange={(value) => handleDropdownChange('status', value)}
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
          value={getDropdownValue('actionType')}
          onChange={(e) => handleDropdownChange('actionType', e.target.value)}
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
        value={getTextValue(expandedElement.auditElement?._id || expandedElement._id, 'action')}
        onChange={(e) => handleTextChange(
          expandedElement.auditElement?._id || expandedElement._id,
          'action',
          e.target.value
        )}
        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
        rows={3}
      />

      <div>
        <select
          value={getDropdownValue('actionOwner')}
          onChange={(e) => handleDropdownChange('actionOwner', e.target.value)}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Acteur</option>
          {actors.map((actor) => (
            <option key={actor} value={actor}>
              {actor}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export const AuditElements: React.FC<AuditElementsProps> = ({
  sections,
  categories,
  subCategories,
  templateElements,
  auditElements,
  regulatories,
  templateVersion,
  actors,
  onAuditElementChange,
  onElementDuplicate,
  onElementDelete,
  onElementAdd,
}) => {
  const expandTemplateElements = (elements: TemplateElement[]): ExpandedElement[] => {
    return elements.map(templateElement => ({
      ...templateElement,
      auditElement: auditElements.find(ae => ae.templateElementId === templateElement._id) || null
    }));
  };

  const getTemplateElementsForSubCategory = (subCategory: SubCategory): ExpandedElement[] => {
    // Get template elements for this subcategory that match the version
    const elements = templateElements.filter(element => 
      element.subCategoryId === subCategory._id && 
      element.templateVersion?.includes(templateVersion)
    );
    
    // Expand with audit elements and sort
    const expandedElements = expandTemplateElements(elements);
    return sortExpandedTemplateElements(expandedElements, templateVersion);
  };

  const getDirectTemplateElements = (categoryId: string): ExpandedElement[] => {
    // Get template elements directly under category (no subcategory) that match the version
    const elements = templateElements.filter(element => 
      element.categoryId === categoryId && 
      !element.subCategoryId && 
      element.templateVersion?.includes(templateVersion)
    );
    
    // Expand with audit elements and sort
    const expandedElements = expandTemplateElements(elements);
    return sortExpandedTemplateElements(expandedElements, templateVersion);
  };

  const renderRegulatory = (sectionId: string | null | undefined, categoryId: string, subCategoryId?: string) => {
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

  const renderSubCategory = (subCategory: SubCategory) => {
    const sortedElements = getTemplateElementsForSubCategory(subCategory);
    
    // Only render subcategory if it has template elements
    if (sortedElements.length === 0) return null;

    return (
      <div key={subCategory._id} className="ml-6">
        <h4 className="text-[rgb(146,208,80)] font-medium mb-3">{subCategory.name}</h4>
        <div className="space-y-4">
          {sortedElements.map((expandedElement) => (
            <AuditElementRow
              key={expandedElement._id}
              expandedElement={expandedElement}
              onElementDelete={onElementDelete}
              onElementDuplicate={onElementDuplicate}
              onAuditElementChange={onAuditElementChange}
              actors={actors}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderCategory = (category: Category, sectionId?: string) => {
    // Get direct template elements (no subcategory)
    const directElements = getDirectTemplateElements(category._id);
    
    // Get subcategories for this category and sort them by position
    const categorySubCategories = sortByPosition(
      subCategories.filter(sc => sc.categoryId === category._id),
      templateVersion
    );

    // Only render category if it has either direct elements or subcategories with elements
    if (directElements.length === 0 && categorySubCategories.length === 0) return null;

    return (
      <div key={category._id} className="mb-8">
        <h3 className="text-[rgb(0,106,60)] text-lg font-semibold mb-3">{category.name}</h3>
        {sectionId && renderRegulatory(sectionId, category._id)}
        <div className="w-full space-y-6">
          {/* Render subcategories */}
          {categorySubCategories.map(subCategory => 
            renderSubCategory(subCategory)
          )}
          {/* Render direct template elements */}
          {directElements.map(expandedElement => (
            <AuditElementRow
              key={expandedElement._id}
              expandedElement={expandedElement}
              onElementDelete={onElementDelete}
              onElementDuplicate={onElementDuplicate}
              onAuditElementChange={onAuditElementChange}
              actors={actors}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderElements = () => {
    if (templateVersion === 2) {
      // First get and sort sections
      const validSections = sortSectionsByPosition(
        (sections || []).filter(section => section.templateVersion?.includes(templateVersion))
      );

      return validSections.map((section) => {
        // For each section, get its categories
        const sectionCategories = sortByPosition(
          (categories || []).filter(category => category.section === section._id),
          templateVersion
        );

        return (
          <div key={section._id} className="w-full mb-8">
            <h2 className="text-xl font-bold mb-4">{section.name}</h2>
            <div className="space-y-6">
              {sectionCategories.map((category) =>
                renderCategory(category, section._id)
              )}
            </div>
          </div>
        );
      });
    }

    // For template version 1, just get categories
    const validCategories = (categories || [])
      .filter(category => category.templateVersion?.includes(templateVersion));

    // Sort categories using sortByPosition
    const sortedCategories = sortByPosition(validCategories, templateVersion);

    return sortedCategories.map(category => {
      // Get subcategories for this category
      const categorySubCategories = sortByPosition(
        (subCategories || []).filter(sc => sc.categoryId === category._id),
        templateVersion
      );

      return (
        <div key={category._id} className="w-full">
          <h3 className="text-[rgb(146,208,80)] text-lg font-semibold mb-3">{category.name}</h3>
          <div className="w-full space-y-6">
            {/* Render subcategories if any */}
            {categorySubCategories.map((subCategory) =>
              renderSubCategory(subCategory)
            )}
            {/* Render direct template elements if any */}
            {getDirectTemplateElements(category._id).map((expandedElement) => (
              <AuditElementRow
                key={expandedElement._id}
                expandedElement={expandedElement}
                onElementDelete={onElementDelete}
                onElementDuplicate={onElementDuplicate}
                onAuditElementChange={onAuditElementChange}
                actors={actors}
              />
            ))}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="w-full">
      {renderElements()}
    </div>
  );
};