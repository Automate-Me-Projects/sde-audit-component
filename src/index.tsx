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
  Regulatory,
  Image,
} from './types';
import './output.css';

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
      case 'auditElementChange':
        const newChangedElement = { elementId: data.elementId, field: data.field, value: data.value };
        setChangedAuditElement([newChangedElement]);
        onAuditElementChange();
        setChangedAuditElement([]);
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

  const handleTemplateElementAdd = (templateElement: any) => {
    // Validate required fields
    if (!templateElement.categoryId) {
      console.error('🚨 Index handleTemplateElementAdd - Missing categoryId:', templateElement);
      return;
    }

    // Update local state first
    const newTemplateElements = [...templateElements, templateElement];
    // Update state and force re-render
    setTemplateElements(newTemplateElements);
    setLastUpdateTime(new Date().toISOString());

    // Format data for Retool
    const retoolData = {
      categoryId: templateElement.categoryId,
      subCategoryId: templateElement.subCategoryId,
      name: templateElement.name,
      positionByVersion: templateElement.positionByVersion,
      templateVersion: templateElement.templateVersion
    };

    // Then trigger Retool event with the correct structure
    triggerEvent('onTemplateElementAdd', { element: retoolData });
  };

  const handleElementAdd = (elementData: any) => {
    // Create the element with the correct structure
    const newElement = {
      name: elementData.name,
      categoryId: elementData.categoryId,
      subCategoryId: elementData.subCategoryId,
      positionByVersion: elementData.positionByVersion,
      templateVersion: [audit.templateVersion]
    };

    // Trigger the event with the correct structure
    triggerEvent('onElementAdd', { element: newElement });
  };

  const handleElementDuplicate = (element: any) => {
    const timestamp = new Date().toISOString();
    const newElement = {
      ...element,
      _id: `${element._id}_duplicate_${timestamp}`,
      isDefault: false,
      createdAt: {
        _seconds: Math.floor(Date.now() / 1000),
        _nanoseconds: (Date.now() % 1000) * 1000000
      },
      updatedAt: {
        _seconds: Math.floor(Date.now() / 1000),
        _nanoseconds: (Date.now() % 1000) * 1000000
      }
    };

    // First trigger the Retool event
    triggerEvent('onElementDuplicate', { element: newElement });

    // Then update local state
    const newTemplateElements = [...templateElements, newElement];
    setTemplateElements(newTemplateElements);
  };

  const handleElementDelete = (elementId: string) => {

    // First trigger the Retool event
    triggerEvent('onElementDelete', { elementId });

    // Then update local state
    const newTemplateElements = templateElements.filter(element => element._id !== elementId);
    setTemplateElements(newTemplateElements);
  };

  const [lastUpdateTime, setLastUpdateTime] = useState(new Date().toISOString());

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
        onElementChange={handleElementChange}
        onElementDuplicate={handleElementDuplicate}
        onElementDelete={handleElementDelete}
        onElementAdd={handleElementAdd}
        onTemplateElementAdd={handleTemplateElementAdd}
      />
    </div>
  );
};