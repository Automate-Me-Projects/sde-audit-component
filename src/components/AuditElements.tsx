import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, Copy } from 'lucide-react';
import { StatusDropdown } from './StatusDropdown';
import {
  Category,
  SubCategory,
  TemplateElement,
  ExpandedElement,
  AuditElementRowProps, 
  AuditElementsProps
} from '../types';
import { sortByPosition, sortExpandedTemplateElements, sortSectionsByPosition } from '../utils';

const AuditElementRow: React.FC<AuditElementRowProps> = ({
  expandedElement,
  onElementDelete,
  onElementDuplicate,
  onAuditElementChange,
  actors,
}) => {
  const [inputValues, setInputValues] = useState<{[key: string]: string}>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const elementId = expandedElement.auditElement?._id;
  const templateElementId = expandedElement._id;
  const isFirstRender = useRef(true);

  // Initialize input values on first render only
  useEffect(() => {
    if (isFirstRender.current) {
      setInputValues({
        [`${elementId}-constat`]: expandedElement.auditElement?.constat || '',
        [`${elementId}-action`]: expandedElement.auditElement?.action || ''
      });
      isFirstRender.current = false;
    }
  }, [elementId, expandedElement.auditElement]);

  const handleInputChange = useCallback((field: string, value: string) => {
    const key = `${elementId}-${field}`;
    
    // Update local state immediately
    setInputValues(prev => ({
      ...prev,
      [key]: value
    }));

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      onAuditElementChange(elementId, templateElementId, field, value);
    }, 1000);
  }, [elementId, templateElementId, onAuditElementChange]);

  const getInputValue = useCallback((field: 'constat' | 'action'): string => {
    const key = `${elementId}-${field}`;
    // Only use local state if it exists
    if (inputValues[key] !== undefined) {
      return inputValues[key];
    }
    // Safely access AuditElement fields
    if (expandedElement.auditElement) {
      return expandedElement.auditElement[field] || '';
    }
    return '';
  }, [elementId, expandedElement.auditElement, inputValues]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="grid grid-cols-[auto,2fr,3fr,1.5fr,1.5fr,3fr,1.5fr] gap-x-6 mb-2 p-2 bg-white rounded-lg shadow-sm w-full border border-gray-200"
    >
      <div className="flex space-x-2 min-w-[60px] self-center">
        <button
          onClick={() => onElementDelete(expandedElement)}
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
        value={getInputValue('constat')}
        onChange={(e) => handleInputChange('constat', e.target.value)}
        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
        rows={3}
      />

      <div>
        <StatusDropdown
          value={expandedElement.auditElement?.status || ''}
          onChange={(value) => onAuditElementChange(elementId, templateElementId, 'status', value)}
          options={[
            'Conforme',
            'Non conforme',
            'Non conformité majeure',
            'Observation',
            'Sans objet',
            'Pour information',
          ]}
        />
      </div>

      <div>
        <select
          value={expandedElement.auditElement?.actionType || ''}
          onChange={(e) => onAuditElementChange(elementId, templateElementId, 'actionType', e.target.value)}
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
        value={getInputValue('action')}
        onChange={(e) => handleInputChange('action', e.target.value)}
        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
        rows={3}
      />

      <div>
        <select
          value={expandedElement.auditElement?.actionOwner || ''}
          onChange={(e) => onAuditElementChange(elementId, templateElementId, 'actionOwner', e.target.value)}
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
}) => {
  const expandTemplateElements = (elements: TemplateElement[]): ExpandedElement[] => {
    return elements.flatMap((templateElement): ExpandedElement[] => {
      // Find all matching audit elements for this template element
      const matchingAuditElements = auditElements.filter(ae => ae.templateElementId === templateElement._id);

      // If no audit elements found, return the template element with null audit element
      if (matchingAuditElements.length === 0) {
        const expandedElement: ExpandedElement = {
          ...templateElement,
          auditElement: null
        };
        return [expandedElement];
      }

      // Create a copy of the template element for each matching audit element
      return matchingAuditElements.map(auditElement => {
        const expandedElement: ExpandedElement = {
          ...templateElement,
          auditElement
        };
        return expandedElement;
      });
    });
  };

  const getTemplateElementsForSubCategory = (subCategory: SubCategory): ExpandedElement[] => {
    const elements = templateElements.filter(element => 
      element.subCategoryId === subCategory._id && 
      element.templateVersion?.includes(templateVersion)
    );
    
    const expandedElements = expandTemplateElements(elements);
    return sortExpandedTemplateElements(expandedElements, templateVersion);
  };

  const getDirectTemplateElements = (categoryId: string): ExpandedElement[] => {
    const elements = templateElements.filter(element => 
      element.categoryId === categoryId && 
      !element.subCategoryId && 
      element.templateVersion?.includes(templateVersion)
    );
    
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

  const renderSubCategory = (subCategory: SubCategory, sectionId?: string) => {
    const sortedElements = getTemplateElementsForSubCategory(subCategory);
    
    if (sortedElements.length === 0) return null;

    return (
      <div key={subCategory._id} className="ml-6">
        <h4 className="text-[rgb(146,208,80)] font-medium mb-3">{subCategory.name}</h4>
        {sectionId && renderRegulatory(sectionId, subCategory.categoryId, subCategory._id)}
        <div className="space-y-4">
          {sortedElements.map((expandedElement) => (
            <AuditElementRow
              key={expandedElement.auditElement?._id || expandedElement._id}
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
    const directElements = getDirectTemplateElements(category._id);
    
    const categorySubCategories = sortByPosition(
      subCategories.filter(sc => sc.categoryId === category._id),
      templateVersion
    ) as SubCategory[];

    if (directElements.length === 0 && categorySubCategories.length === 0) return null;

    return (
      <div key={category._id} className="mb-8">
        <h3 className="text-[rgb(0,106,60)] text-lg font-semibold mb-3">{category.name}</h3>
        {sectionId && renderRegulatory(sectionId, category._id)}
        <div className="w-full space-y-6">
          {categorySubCategories.map(subCategory => 
            renderSubCategory(subCategory, sectionId)
          )}
          {directElements.map(expandedElement => (
            <AuditElementRow
              key={expandedElement.auditElement?._id || expandedElement._id}
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
      const validSections = sortSectionsByPosition(
        (sections || []).filter(section => section.templateVersion?.includes(templateVersion))
      );

      return validSections.map((section) => {
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

    const validCategories = (categories || [])
      .filter(category => category.templateVersion?.includes(templateVersion));

    const sortedCategories = sortByPosition(validCategories, templateVersion);

    return sortedCategories.map(category => {
      const categorySubCategories = sortByPosition(
        (subCategories || []).filter(sc => sc.categoryId === category._id),
        templateVersion
      ) as SubCategory[];

      return (
        <div key={category._id} className="w-full">
          <h3 className="text-[rgb(146,208,80)] text-lg font-semibold mb-3">{category.name}</h3>
          <div className="w-full space-y-6">
            {categorySubCategories.map((subCategory) =>
              renderSubCategory(subCategory)
            )}
            {getDirectTemplateElements(category._id).map((expandedElement) => (
              <AuditElementRow
                key={expandedElement.auditElement?._id || expandedElement._id}
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