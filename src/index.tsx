import React, { useEffect, useState } from 'react';
import { type FC } from 'react';
import { Retool } from '@tryretool/custom-component-support';
import { AuditForm } from './components/AuditForm';
import type {
  Audit,
  Building,
  Section,
  Category,
  SubCategory,
  TemplateElement,
  AuditElement,
  ExpandedElement,
  Regulatory,
  Image,
} from './types';
import './output.css';
import { generateTempId, createTimestamp } from './utils';

export const AuditFormComponent: FC = () => {
  const [audit, setAudit] = Retool.useStateObject({
    name: 'audit',
    description: 'The audit object',
  }) as unknown as [Audit, (value: Audit) => void];

  const [building, setBuilding] = Retool.useStateObject({
    name: 'building',
    description: 'The building object',
  }) as unknown as [Building, (value: Building) => void];

  const [sections, setSections] = Retool.useStateArray({
    name: 'sections',
    description: 'The sections array',
  }) as unknown as [Section[], (value: Section[]) => void];

  const [categories, setCategories] = Retool.useStateArray({
    name: 'categories',
    description: 'The categories array',
  }) as unknown as [Category[], (value: Category[]) => void];

  const [subCategories, setSubCategories] = Retool.useStateArray({
    name: 'subCategories',
    description: 'The subCategories array',
  }) as unknown as [SubCategory[], (value: SubCategory[]) => void];

  const [templateElements, setTemplateElements] = Retool.useStateArray({
    name: 'templateElements',
    description: 'The templateElements array',
  }) as unknown as [TemplateElement[], (value: TemplateElement[]) => void];

  const [rawAllTemplateElements, setRawAllTemplateElements] = useState<TemplateElement[]>([]);

  const [allTemplateElements, setAllTemplateElements] = Retool.useStateArray({
    name: 'allTemplateElements',
    description: 'All available templateElements array',
  }) as unknown as [TemplateElement[], (value: TemplateElement[]) => void];

  const [auditElements, setAuditElements] = Retool.useStateArray({
    name: 'auditElements',
    description: 'The auditElements array',
  }) as unknown as [AuditElement[], (value: AuditElement[]) => void];

  const [regulatories, setRegulatories] = Retool.useStateArray({
    name: 'regulatories',
    description: 'The regulatories array',
  }) as unknown as [Regulatory[], (value: Regulatory[]) => void];

  const [images, setImages] = Retool.useStateArray({
    name: 'images',
    description: 'The images array',
  }) as unknown as [Image[], (value: Image[]) => void];

  // Event-related state
  const [changedAudit, setChangedAudit] = Retool.useStateObject({
    name: 'changedAudit',
    description: 'Audit changes'
  }) as unknown as [any, (value: any) => void];

  const [newAuditElement, setNewAuditElement] = Retool.useStateObject({
    name: 'newAuditElement',
    description: 'New audit element data'
  }) as unknown as [any, (value: any) => void];

  const [changedAuditElement, setChangedAuditElement] = Retool.useStateArray({
    name: 'changedAuditElement',
    description: 'Array of changed elements',
  }) as unknown as [Array<{ elementId: string; field: string; value: any }>, (value: Array<{ elementId: string; field: string; value: any }>) => void];

  const [newTemplateElement, setNewTemplateElement] = Retool.useStateObject({
    name: 'newTemplateElement',
    description: 'New template element data'
  }) as unknown as [any, (value: any) => void];

  const [duplicatedElement, setDuplicatedElement] = Retool.useStateObject({
    name: 'duplicatedElement',
    description: 'Element to duplicate'
  }) as unknown as [any, (value: any) => void];

  const [deletedElement, setDeletedElement] = Retool.useStateObject({
    name: 'deletedElement',
    description: 'Element to delete'
  }) as unknown as [any, (value: any) => void];

  // Event callbacks
  const onAuditChange = Retool.useEventCallback({ name: 'auditChange' });
  const onAuditElementAdd = Retool.useEventCallback({ name: 'auditElementAdd' });
  const onAuditElementChange = Retool.useEventCallback({ name: 'auditElementChange' });
  const onElementDuplicate = Retool.useEventCallback({ name: 'elementDuplicate' });
  const onElementDelete = Retool.useEventCallback({ name: 'elementDelete' });
  const onTemplateElementAdd = Retool.useEventCallback({ name: 'templateElementAdd' });

  const triggerEvent = (eventName: string, data: any) => {
    console.log('🎯 Triggering event:', {
      eventName,
      data,
      eventScope: {
        triggeredById: 'auditFormComponent1'
      }
    });

    switch (eventName) {
      case 'auditChange':
        setChangedAudit(data);
        onAuditChange();
        setChangedAudit({});
        break;
      case 'auditElementChange':
        const newChangedElement = { elementId: data.elementId, field: data.field, value: data.value };
        setChangedAuditElement([newChangedElement]);
        onAuditElementChange();
        setChangedAuditElement([]);
        break;
      case 'auditElementAdd':
        if (data.element) {
          setNewAuditElement(data.element);
        }
        onAuditElementAdd();
        setNewAuditElement(null);
        break;
      case 'onElementDuplicate':
        setDuplicatedElement(data.element);
        onElementDuplicate();
        setDuplicatedElement(null);
        break;
      case 'onElementDelete':
        setDeletedElement(data.element);
        onElementDelete();
        setDeletedElement(null);
        break;
      case 'onTemplateElementAdd':
        if (data.element) {
          setNewTemplateElement(data.element);
        }
        onTemplateElementAdd();
        setNewTemplateElement(null);
        break;
      default:
        console.error(`Unknown event name: ${eventName}`);
    }

    // @ts-ignore
    window.JSCode?.trigger(eventName, {
      triggeredById: 'auditFormComponent1',
      instance: [],
      data
    });
  };

  const handleAuditChange = (field: string, value: any) => {
    setAudit({...audit, [field]: value });

    triggerEvent('auditChange', { auditId: audit.id,field, value });
  };

  const handleElementChange = (elementId: string, field: string, value: any) => {

    // First trigger the Retool event with the change data
    const changeData = { elementId, field, value };
    triggerEvent('auditElementChange', changeData);

    // Then update local state if auditElements exists
    if (auditElements && Array.isArray(auditElements)) {
      const updatedElements = auditElements.map(element => {
        // Check if this is the element we want to update
        if (element._id === elementId || element.templateElementId === elementId) {
          // Create updated element with new value
          const updatedElement = { ...element, [field]: value };
          return updatedElement;
        }
        return element;
      });
      
      setAuditElements(updatedElements);
    }
  };

  const handleTemplateElementAdd = (_id: string, name: string, subCategoryId: string | null, categoryId: string, position: number[]) => {
    // Validate required fields
    if (!categoryId) {
      console.error('🚨 Index handleTemplateElementAdd - Missing categoryId:');
      return;
    }

    // Create timestamp for both elements
    const timestamp = createTimestamp();

    // Create the template element with the correct structure
    const templateElement = {
      _id,
      name,
      subCategoryId,
      categoryId,
      positionByVersion: position,
      templateVersion: [audit.templateVersion],
      isDefault: false,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Create the corresponding audit element
    const auditElement = {
      _id: generateTempId(),
      auditId: audit.id,
      templateElementId: templateElement._id,
      categoryId: templateElement.categoryId,
      subCategoryId: templateElement.subCategoryId,
      status: null,
      constat: null,
      actionType: null,
      actionOwner: null,
      action: null,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Update local state first
    const newTemplateElements = [...templateElements, templateElement];
    const newAuditElements = [...auditElements, auditElement];
    
    // Update state and force re-render
    setTemplateElements(newTemplateElements);
    setAuditElements(newAuditElements);

    // Format data for Retool
    const retoolData = {
      templateElement: {
        categoryId: templateElement.categoryId,
        subCategoryId: templateElement.subCategoryId,
        name: templateElement.name,
        positionByVersion: templateElement.positionByVersion,
        templateVersion: templateElement.templateVersion
      },
      auditElement: {
        auditId: auditElement.auditId,
        categoryId: auditElement.categoryId,
        subCategoryId: auditElement.subCategoryId,
        status: auditElement.status,
        constat: auditElement.constat,
        actionType: auditElement.actionType,
        actionOwner: auditElement.actionOwner,
        action: auditElement.action,
      }
    };

    // Then trigger Retool event with the correct structure
    triggerEvent('onTemplateElementAdd', { element: retoolData });
  };

  const handleElementAdd = (name: string, subCategoryId: string | null, categoryId: string) => {
    // Find the selected template element from allTemplateElements
    const selectedElement = allTemplateElements.find(element => 
      element.categoryId === categoryId && 
      (element.subCategoryId ? element.subCategoryId === subCategoryId : true) && 
      element.name === name
    );

    if (!selectedElement) {
      console.error('Selected template element not found');
      return;
    }

    // Check if the template element already exists in templateElements
    const elementExists = templateElements.some(element => element._id === selectedElement._id);

    // Create timestamp for both elements
    const timestamp = createTimestamp();

    // Create new audit element for local state
    const auditElement = {
      _id: generateTempId(),
      auditId: audit.id,
      templateElementId: selectedElement._id,
      categoryId: selectedElement.categoryId,
      subCategoryId: selectedElement.subCategoryId,
      status: null,
      constat: null,
      actionType: null,
      actionOwner: null,
      action: null,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Update local states
    if (!elementExists) {
      // If element doesn't exist, add it to templateElements
      const newTemplateElements = [...templateElements, selectedElement];
      setTemplateElements(newTemplateElements);
    }

    // Always add the new audit element
    const newAuditElements = [...auditElements, auditElement];
    setAuditElements(newAuditElements);

    // Remove _id, createdAt, and updatedAt from auditElement for Retool
    const { _id, createdAt, updatedAt, ...retoolAuditElement } = auditElement;

    // Trigger auditElementAdd event with simplified element
    triggerEvent('auditElementAdd', { element: retoolAuditElement });
  };

  const handleElementDuplicate = (element: any) => {
    const timestamp = createTimestamp();
    const newElement = {
      ...element,
      _id: `${element._id}_duplicate_${timestamp}`,
      isDefault: false,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // First trigger the Retool event
    triggerEvent('onElementDuplicate', { element: newElement });

    // Then update local state
    const newTemplateElements = [...templateElements, newElement];
    setTemplateElements(newTemplateElements);
  };

  const handleElementDelete = (expandedElement: ExpandedElement) => {

    // First trigger the Retool event
    triggerEvent('onElementDelete', { expandedElement });

    // Update auditElements state
    const newAuditElements = auditElements.filter(
      auditElement => auditElement._id !== expandedElement.auditElement?._id
    );
    setAuditElements(newAuditElements);

    // Check if there are any remaining audit elements for this template
    const hasRemainingAuditElements = newAuditElements.some(
      auditElement => auditElement.templateElementId === expandedElement._id
    );

    // If no audit elements remain, remove the template element
    if (!hasRemainingAuditElements) {
      const newTemplateElements = templateElements.filter(
        template => template._id !== expandedElement._id
      );
      setTemplateElements(newTemplateElements);
    }
  };

  // Store raw template elements when they come from Retool
  useEffect(() => {
    if (allTemplateElements && allTemplateElements !== rawAllTemplateElements) {
      setRawAllTemplateElements(allTemplateElements);
    }
  }, [allTemplateElements]);

  // Filter allTemplateElements based on audit.templateVersion
  useEffect(() => {
    if (rawAllTemplateElements && audit?.templateVersion) {
      const filteredElements = rawAllTemplateElements.filter(element => 
        element.templateVersion?.includes(audit.templateVersion)
      );
      setAllTemplateElements(filteredElements);
    }
  }, [rawAllTemplateElements, audit?.templateVersion]);

  return (
    <div className="retool-component">
      <AuditForm
        audit={audit}
        building={building}
        sections={sections}
        categories={categories}
        subCategories={subCategories}
        templateElements={templateElements}
        allTemplateElements={allTemplateElements}
        auditElements={auditElements}
        regulatories={regulatories}
        images={images}
        onAuditChange={handleAuditChange}
        onElementChange={handleElementChange}
        onElementDuplicate={handleElementDuplicate}
        onElementDelete={handleElementDelete}
        onElementAdd={handleElementAdd}
        onTemplateElementAdd={handleTemplateElementAdd}
      />
    </div>
  );
};