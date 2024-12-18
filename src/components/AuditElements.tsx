import React, { useCallback, useState } from 'react';
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
import { sortTemplateElements, sortByPosition } from '../utils';
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
  onElementDuplicate: (element: ExpandedElement) => void;
  onElementDelete: (elementId: string) => void;
  onElementAdd: (sectionId: string | null, categoryId: string, subCategoryId: string | null, name: string, position: number) => void;
}

interface AuditElementRowProps {
  expandedElement: ExpandedElement;
  onElementDelete: (elementId: string) => void;
  onElementDuplicate: (element: ExpandedElement) => void;
  onElementChange: (elementId: string, field: string, value: any) => void;
  handleTextChange: (elementId: string, field: string, value: string) => void;
  actors: string[];
}

const AuditElementRow: React.FC<AuditElementRowProps> = ({
  expandedElement,
  onElementDelete,
  onElementDuplicate,
  onElementChange,
  handleTextChange,
  actors,
}) => (
  <div 
    className="grid grid-cols-[auto,2fr,3fr,1.5fr,1.5fr,3fr,1.5fr] gap-x-6 mb-2 p-2 bg-white rounded-lg shadow-sm w-full border border-gray-200"
  >
    <div className="flex space-x-2 min-w-[60px] self-center">
      <button
        onClick={() => onElementDelete(expandedElement._id)}
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
      value={expandedElement.auditElement?.constat || ''}
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
        value={expandedElement.auditElement?.status || ''}
        onChange={(value) => onElementChange(
          expandedElement.auditElement?._id || expandedElement._id,
          'status',
          value
        )}
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
        value={expandedElement.auditElement?.actionType || ''}
        onChange={(e) => onElementChange(
          expandedElement.auditElement?._id || expandedElement._id,
          'actionType',
          e.target.value
        )}
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
      value={expandedElement.auditElement?.action || ''}
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
        value={expandedElement.auditElement?.actionOwner || ''}
        onChange={(e) => onElementChange(
          expandedElement.auditElement?._id || expandedElement._id,
          'actionOwner',
          e.target.value
        )}
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

  const expandTemplateElements = (templateElements: TemplateElement[], auditElements: AuditElement[]): ExpandedElement[] => {
    return templateElements.flatMap((templateElement): ExpandedElement[] => {
      // Find all audit elements for this template
      const relatedAuditElements = auditElements.filter(
        ae => ae.templateElementId === templateElement._id
      );
      
      // If no audit elements, return the template element alone
      if (relatedAuditElements.length === 0) {
        return [{
          ...templateElement,
          auditElement: null
        }];
      }
      
      // Create duplicates for each audit element
      return relatedAuditElements.map((auditElement): ExpandedElement => ({
        ...templateElement,
        auditElement
      }));
    });
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
          .filter(category => category.section === section._id)
          .sort((a, b) => {
            const posA = a.positionByVersion[a.templateVersion.indexOf(templateVersion)] || 0;
            const posB = b.positionByVersion[b.templateVersion.indexOf(templateVersion)] || 0;
            return posA - posB;
          });

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
      const categorySubCategories = (subCategories || [])
        .filter(sc => sc.categoryId === category._id)
        .sort((a, b) => {
          const posA = a.positionByVersion[a.templateVersion.indexOf(templateVersion)] || 0;
          const posB = b.positionByVersion[b.templateVersion.indexOf(templateVersion)] || 0;
          return posA - posB;
        });

      return (
        <div key={category._id} className="w-full">
          <h3 className="text-[rgb(0,106,60)] text-lg font-semibold mb-3">{category.name}</h3>
          <div className="w-full space-y-6">
            {/* Render subcategories if any */}
            {categorySubCategories.map((subCategory) =>
              renderSubCategory(subCategory, category)
            )}
            {/* Render direct template elements if any */}
            {renderDirectTemplateElements(category)}
          </div>
        </div>
      );
    });
  };

  const renderCategory = (category: Category, sectionId?: string) => {
    // Get and sort template elements that are directly linked to this category
    const directTemplateElements = templateElements.filter(element => 
      element.categoryId === category._id && 
      (!element.subCategoryId || element.subCategoryId === '') && 
      element.templateVersion?.includes(templateVersion)
    );

    // Expand template elements with their audit elements and sort them
    const expandedElements = expandTemplateElements(directTemplateElements, auditElements);
    const sortedElements = sortTemplateElements(
      expandedElements,
      categories,
      subCategories,
      sections,
      templateVersion
    ) as ExpandedElement[];

    if (sortedElements.length === 0) return null;

    return (
      <div key={category._id} className="w-full mb-6">
        <h3 className="text-[rgb(0,106,60)] text-lg font-semibold mb-3">{category.name}</h3>
        {sectionId && renderRegulatory(sectionId, category._id)}
        <div className="w-full space-y-6">
          {/* Render subcategories if any */}
          {subCategories.filter(subCategory => subCategory.categoryId === category._id).map((subCategory) =>
            renderSubCategory(subCategory, category, sectionId)
          )}
          {/* Render direct template elements if any */}
          {sortedElements.map((expandedElement) => (
            <AuditElementRow
              key={`${expandedElement._id}-${expandedElement.auditElement?._id || 'template'}`}
              expandedElement={expandedElement}
              onElementDelete={onElementDelete}
              onElementDuplicate={onElementDuplicate}
              onElementChange={onElementChange}
              handleTextChange={handleTextChange}
              actors={actors}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderSubCategory = (subCategory: SubCategory, category: Category, sectionId?: string) => {
    // Get and sort template elements for this subcategory
    const subCategoryElements = templateElements.filter(element => 
      element.subCategoryId === subCategory._id && 
      element.templateVersion?.includes(templateVersion)
    );

    // Expand template elements with their audit elements and sort them
    const expandedElements = expandTemplateElements(subCategoryElements, auditElements);
    const sortedElements = sortTemplateElements(
      expandedElements,
      categories,
      subCategories,
      sections,
      templateVersion
    ) as ExpandedElement[];

    if (sortedElements.length === 0) return null;

    return (
      <div key={subCategory._id} className="w-full">
        <h4 className="text-[rgb(146,208,80)] text-base font-medium mb-2">{subCategory.name}</h4>
        {sectionId && renderRegulatory(sectionId, category._id, subCategory._id)}
        <div className="w-full space-y-4">
          {sortedElements.map((expandedElement) => (
            <AuditElementRow
              key={`${expandedElement._id}-${expandedElement.auditElement?._id || 'template'}`}
              expandedElement={expandedElement}
              onElementDelete={onElementDelete}
              onElementDuplicate={onElementDuplicate}
              onElementChange={onElementChange}
              handleTextChange={handleTextChange}
              actors={actors}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderDirectTemplateElements = (category: Category) => {
    // Get and sort template elements that are directly linked to this category
    const directTemplateElements = templateElements.filter(element => 
      element.categoryId === category._id && 
      (!element.subCategoryId || element.subCategoryId === '') && 
      element.templateVersion?.includes(templateVersion)
    );

    // Expand template elements with their audit elements and sort them
    const expandedElements = expandTemplateElements(directTemplateElements, auditElements);
    const sortedElements = sortTemplateElements(
      expandedElements,
      categories,
      subCategories,
      sections,
      templateVersion
    ) as ExpandedElement[];

    if (sortedElements.length === 0) return null;

    return (
      <div className="w-full">
        {sortedElements.map((expandedElement) => (
          <AuditElementRow
            key={`${expandedElement._id}-${expandedElement.auditElement?._id || 'template'}`}
            expandedElement={expandedElement}
            onElementDelete={onElementDelete}
            onElementDuplicate={onElementDuplicate}
            onElementChange={onElementChange}
            handleTextChange={handleTextChange}
            actors={actors}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      {renderElements()}
    </div>
  );
};