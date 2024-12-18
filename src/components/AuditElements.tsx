import React, { useCallback, useState, useEffect, useMemo } from 'react';
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

  // Ensure auditElements is always an array
  const auditElementsArray = Array.isArray(auditElements) ? auditElements : [];

  // Update local elements list when props change
  useEffect(() => {
    console.log(' AuditElements - Template elements updated:', {
      count: templateElements?.length ?? 0,
      elements: templateElements?.map(el => ({
        id: el._id,
        name: el.name,
        categoryId: el.categoryId,
        position: el.positionByVersion
      })) ?? []
    });
  }, [templateElements]);

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
    
    // Find the audit element
    const auditElement = auditElementsArray.find(ae => 
      ae._id === elementId || ae.templateElementId === elementId
    );
    
    if (!auditElement) {
      // Find the template element
      const templateElement = templateElements?.find(te => te._id === elementId);
      if (templateElement) {
        onElementChange({
          templateElementId: elementId,
          categoryId: templateElement.categoryId,
          subCategoryId: templateElement.subCategoryId,
          [field]: value
        });
      }
    } else {
      onElementChange({
        auditElementId: auditElement._id,
        [field]: value
      });
    }
  };

  const getLocalValue = (elementId: string, field: string) => {
    const localValue = localState[`${elementId}-${field}`];
    if (localValue !== undefined) {
      return localValue;
    }
    
    const auditElement = auditElementsArray.find(ae => 
      ae._id === elementId || ae.templateElementId === elementId
    );
    return auditElement ? (auditElement as any)[field] || '' : '';
  };

  const findAuditElement = useCallback((elementId: string): AuditElement | undefined => {
    // First try to find by audit element ID
    let auditElement = auditElementsArray.find(ae => ae._id === elementId);
    if (!auditElement) {
      // If not found, try to find by template element ID
      auditElement = auditElementsArray.find(ae => ae.templateElementId === elementId);
    }
    return auditElement;
  }, [auditElementsArray]);

  const handleStatusChange = (elementId: string, value: string) => {
    const auditElement = findAuditElement(elementId);
    if (!auditElement) {
      const templateElement = templateElements?.find(te => te._id === elementId);
      if (templateElement) {
        onElementChange({
          templateElementId: elementId,
          categoryId: templateElement.categoryId,
          subCategoryId: templateElement.subCategoryId,
          status: value
        });
      }
    } else {
      onElementChange({
        auditElementId: auditElement._id,
        status: value
      });
    }
  };

  const handleActionTypeChange = (elementId: string, value: string) => {
    const auditElement = findAuditElement(elementId);
    if (!auditElement) {
      const templateElement = templateElements?.find(te => te._id === elementId);
      if (templateElement) {
        onElementChange({
          templateElementId: elementId,
          categoryId: templateElement.categoryId,
          subCategoryId: templateElement.subCategoryId,
          actionType: value
        });
      }
    } else {
      onElementChange({
        auditElementId: auditElement._id,
        actionType: value
      });
    }
  };

  const handleActionOwnerChange = (elementId: string, value: string) => {
    const auditElement = findAuditElement(elementId);
    if (!auditElement) {
      const templateElement = templateElements?.find(te => te._id === elementId);
      if (templateElement) {
        onElementChange({
          templateElementId: elementId,
          categoryId: templateElement.categoryId,
          subCategoryId: templateElement.subCategoryId,
          actionOwner: value
        });
      }
    } else {
      onElementChange({
        auditElementId: auditElement._id,
        actionOwner: value
      });
    }
  };

  const renderRegulatory = (sectionId: string, categoryId: string, subCategoryId?: string | null) => {
    // Find all matching regulatories for this section and category
    const matchingRegulatories = regulatories.filter(r => {
      const sectionMatch = r.sectionId === sectionId;
      const categoryMatch = r.categoryId === categoryId;
      
      // Handle cases where subCategoryId is "null" string or missing
      const normalizeSubCategoryId = (id: string | null | undefined) => 
        !id || id === "null" ? null : id;
      
      const normalizedRegulatorySubCategoryId = normalizeSubCategoryId(r.subCategoryId);
      const normalizedRequestedSubCategoryId = normalizeSubCategoryId(subCategoryId);

      // For category level (subCategoryId is null), only show regulatories without subCategoryId
      if (normalizedRequestedSubCategoryId === null) {
        return sectionMatch && categoryMatch && normalizedRegulatorySubCategoryId === null;
      }
      
      // For subcategory level, show regulatories with matching subCategoryId
      return sectionMatch && categoryMatch && normalizedRegulatorySubCategoryId === normalizedRequestedSubCategoryId;
    });

    if (matchingRegulatories.length === 0) {
      return null;
    }

    return (
      <>
        {matchingRegulatories.map(regulatory => (
          <div key={regulatory._id} className="bg-gray-100 p-4 my-2 italic text-black">
            {regulatory.text}
          </div>
        ))}
      </>
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
        const sortedCategories = useMemo(() => {
          console.log(' AuditElements - Sorting template elements');
          return sortTemplateElements(
            sectionCategories.map(c => ({ ...c, _id: c._id, categoryId: c._id })) as unknown as TemplateElement[],
            categories,
            subCategories,
            sections,
            templateVersion
          ).map(te => categories?.find(c => c._id === te._id)!);
        }, [sectionCategories, categories, subCategories, sections, templateVersion]);

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
    const sortedCategories = useMemo(() => {
      console.log(' AuditElements - Sorting template elements');
      return sortTemplateElements(
        validCategories.map(c => ({ ...c, _id: c._id, categoryId: c._id })) as unknown as TemplateElement[],
        categories,
        subCategories,
        sections,
        templateVersion
      ).map(te => categories?.find(c => c._id === te._id)!);
    }, [validCategories, categories, subCategories, sections, templateVersion]);

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
    const sortedSubCategories = useMemo(() => {
      console.log(' AuditElements - Sorting template elements');
      return sortTemplateElements(
        categorySubCategories.map(sc => ({ ...sc, _id: sc._id, categoryId: sc.categoryId })) as unknown as TemplateElement[],
        categories,
        subCategories,
        sections,
        templateVersion
      ).map(te => subCategories?.find(sc => sc._id === te._id)!);
    }, [categorySubCategories, categories, subCategories, sections, templateVersion]);

    // Get and sort template elements that are directly linked to this category (no subcategory)
    const directTemplateElements = useMemo(() => {
      console.log(' AuditElements - Sorting template elements');
      return sortTemplateElements(
        (templateElements || []).filter(element => {
          // Check if the element is valid for this category and version
          const isValidForCategory = element.categoryId === category._id && 
            (!element.subCategoryId || element.subCategoryId === '') && 
            element.templateVersion?.includes(templateVersion);

          // Check if this is a default template or has an audit element
          const isDefaultTemplate = element.isDefault;
          const hasAuditElement = auditElementsArray?.some(ae => ae.templateElementId === element._id);

          return isValidForCategory && (isDefaultTemplate || hasAuditElement);
        }),
        categories,
        subCategories,
        sections,
        templateVersion
      );
    }, [templateElements, categories, subCategories, sections, templateVersion]);

    // Get audit elements for this category that are duplicates
    const duplicatedElements = auditElementsArray?.filter(ae => {
      const templateElement = templateElements?.find(te => te._id === ae.templateElementId);
      return templateElement?.categoryId === category._id && 
        (!templateElement.subCategoryId || templateElement.subCategoryId === '') &&
        !templateElement.isDefault; // Only include duplicates
    });

    // Create combined elements array with both template and duplicated elements
    const allElements = [
      ...directTemplateElements.map(te => ({
        ...te,
        isTemplate: true,
        auditElement: auditElementsArray?.find(ae => ae.templateElementId === te._id)
      })),
      ...duplicatedElements.map(ae => {
        const templateElement = templateElements?.find(te => te._id === ae.templateElementId);
        return {
          ...templateElement,
          _id: ae._id,
          isTemplate: false,
          auditElement: ae
        };
      })
    ];

    if (sortedSubCategories.length === 0 && allElements.length === 0) return null;

    return (
      <div key={category._id} className="w-full mb-6">
        <h3 className="text-[rgb(0,106,60)] font-medium mb-2">{category.name}</h3>
        {/* Only render regulatories without subCategoryId at category level */}
        {sectionId && renderRegulatory(sectionId, category._id, null)}
        <div className="w-full space-y-6">
          {/* Render subcategories if any */}
          {sortedSubCategories.map((subCategory) => {
            // Render regulatory for this subcategory if it exists
            const regulatoryContent = sectionId && renderRegulatory(sectionId, category._id, subCategory._id);
            return (
              <div key={subCategory._id}>
                {renderSubCategory(subCategory, sectionId, regulatoryContent)}
              </div>
            );
          })}
          {/* Render all elements */}
          {allElements.map((element) => (
            <div key={element._id} className="grid grid-cols-[auto,2fr,3fr,1.5fr,1.5fr,3fr,1.5fr] gap-x-6 mb-2 p-2 bg-white rounded-lg shadow-sm w-full border border-gray-200">
              <div className="flex space-x-2 min-w-[60px] self-center">
                <button
                  onClick={() => {
                    onElementDelete(element._id);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <button
                  onClick={async () => {
                    try {
                      await onElementDuplicate(element);
                    } catch (error) {
                      console.error(' Error requesting element duplication:', error);
                    }
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
                  value={auditElementsArray?.find(ae => ae.templateElementId === element._id)?.status || ''}
                  onChange={(value) => handleStatusChange(element._id, value)}
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
                  value={auditElementsArray?.find(ae => ae.templateElementId === element._id)?.actionType || ''}
                  onChange={(e) => handleActionTypeChange(element._id, e.target.value)}
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
                  value={auditElementsArray?.find(ae => ae.templateElementId === element._id)?.actionOwner || ''}
                  onChange={(e) => handleActionOwnerChange(element._id, e.target.value)}
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

  const renderSubCategory = (subCategory: SubCategory, sectionId?: string, regulatoryContent?: JSX.Element) => {
    // Get and sort template elements for this subcategory
    const subCategoryElements = useMemo(() => {
      console.log(' AuditElements - Sorting template elements:', {
        hasElements: !!templateElements,
        count: templateElements?.length ?? 0
      });
      return templateElements ? sortTemplateElements(templateElements, templateVersion) : [];
    }, [templateElements, templateVersion]);

    if (subCategoryElements.length === 0) return null;

    return (
      <div key={subCategory._id} className="w-full">
        <h4 className="text-[rgb(146,208,80)] text-base font-medium mb-2">{subCategory.name}</h4>
        {regulatoryContent}
        <div className="w-full space-y-4">
          {subCategoryElements.map((element) => (
            <div key={element._id} className="grid grid-cols-[auto,2fr,3fr,1.5fr,1.5fr,3fr,1.5fr] gap-x-6 mb-2 p-2 bg-white rounded-lg shadow-sm w-full border border-gray-200">
              <div className="flex space-x-2 min-w-[60px] self-center">
                <button
                  onClick={() => {
                    onElementDelete(element._id);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <button
                  onClick={async () => {
                    try {
                      await onElementDuplicate(element);
                    } catch (error) {
                      console.error(' Error requesting element duplication:', error);
                    }
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
                  value={auditElementsArray?.find(ae => ae.templateElementId === element._id)?.status || ''}
                  onChange={(value) => handleStatusChange(element._id, value)}
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
                  value={auditElementsArray?.find(ae => ae.templateElementId === element._id)?.actionType || ''}
                  onChange={(e) => handleActionTypeChange(element._id, e.target.value)}
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
                  value={auditElementsArray?.find(ae => ae.templateElementId === element._id)?.actionOwner || ''}
                  onChange={(e) => handleActionOwnerChange(element._id, e.target.value)}
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