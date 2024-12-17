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
  const [changedElement, setChangedElement] = Retool.useStateObject({
    name: 'changedElement',
    description: 'Last changed element data',
    inspector: 'hidden',
  });

  const [duplicatedElement, setDuplicatedElement] = Retool.useStateObject({
    name: 'duplicatedElement',
    description: 'Last duplicated element data',
    inspector: 'hidden',
  });

  const [deletedElementId, setDeletedElementId] = Retool.useStateString({
    name: 'deletedElementId',
    description: 'Last deleted element ID',
    inspector: 'hidden',
  });

  const [changedElements, setChangedElements] = Retool.useStateArray({
    name: 'changedElements',
    description: 'Array of changed elements',
  }) as unknown as [Array<{ elementId: string; field: string; value: any }>, (value: Array<{ elementId: string; field: string; value: any }>) => void];

  // Additional state for event data
  const [lastElementChange, setLastElementChange] = Retool.useStateObject({
    name: 'lastElementChange',
    description: 'Last element change data'
  }) as unknown as [any, (value: any) => void];

  const [newElement, setNewElement] = Retool.useStateObject({
    name: 'newElement',
    description: 'New element data'
  }) as unknown as [any, (value: any) => void];

  const [elementToDuplicate, setElementToDuplicate] = Retool.useStateObject({
    name: 'elementToDuplicate',
    description: 'Element to duplicate'
  }) as unknown as [any, (value: any) => void];

  // Event callbacks
  const onElementChange = Retool.useEventCallback({ name: 'elementChange' });
  const onElementDuplicate = Retool.useEventCallback({ name: 'elementDuplicate' });
  const onElementDelete = Retool.useEventCallback({ name: 'elementDelete' });
  const onElementAdd = Retool.useEventCallback({ name: 'elementAdd' });

  const triggerEvent = (eventName: string, data: any) => {
    console.log('🎯 Triggering event:', JSON.stringify({ eventName, data }, null, 2));
    
    // Update changedElements first if it's an element change
    if (eventName === 'onElementChange') {
      const newChangedElement = { elementId: data.elementId, field: data.field, value: data.value };
      setChangedElements([...changedElements, newChangedElement]);
    }

    // Set relevant state before triggering the event
    switch (eventName) {
      case 'onElementChange':
        setLastElementChange({
          elementId: data.elementId,
          field: data.field,
          value: data.value
        });
        onElementChange();
        break;
      case 'onElementDelete':
        setDeletedElementId(data.elementId);
        onElementDelete();
        break;
      case 'onElementAdd':
        setNewElement({
          sectionId: data.sectionId,
          categoryId: data.categoryId,
          subCategoryId: data.subCategoryId,
          name: data.name,
          position: data.position
        });
        onElementAdd();
        break;
      case 'onElementDuplicate':
        setElementToDuplicate(data);
        onElementDuplicate();
        break;
      default:
        console.error(`Unknown event name: ${eventName}`);
    }
  };

  const handleElementChange = (elementId: string, field: string, value: any) => {
    console.log('🔍 Index handleElementChange - Input:', JSON.stringify({ 
      elementId, 
      field, 
      value,
      currentAuditElements: auditElements.length,
      auditElementsSample: auditElements.slice(0, 2)
    }, null, 2));

    // First trigger the Retool event with the change data
    const changeData = { elementId, field, value };
    console.log('🔄 Index handleElementChange - Triggering Retool event with data:', JSON.stringify(changeData, null, 2));
    triggerEvent('onElementChange', changeData);

    // Then update local state
    const updatedElements = auditElements.map(element => {
      // Check if this is the element we want to update
      if (element._id === elementId || element.templateElementId === elementId) {
        // Create updated element with new value
        const updatedElement = { ...element, [field]: value };
        console.log('✏️ Updating element:', JSON.stringify({
          elementId,
          before: element,
          after: updatedElement,
          field,
          value
        }, null, 2));
        return updatedElement;
      }
      return element;
    });

    console.log('📊 Index handleElementChange - State update details:', JSON.stringify({
      totalElements: updatedElements.length,
      originalElements: auditElements.length,
      matchingElement: auditElements.find(el => el._id === elementId || el.templateElementId === elementId),
      updatedElement: updatedElements.find(el => el._id === elementId || el.templateElementId === elementId),
      elementId,
      field,
      value
    }, null, 2));
    
    setAuditElements(updatedElements);
  };

  useEffect(() => {
    console.log('👀 AuditElements changed:', JSON.stringify({
      length: auditElements.length,
      sample: auditElements.slice(0, 2),
      timestamp: new Date().toISOString()
    }, null, 2));
  }, [auditElements]);

  useEffect(() => {
    // Initialize auditElements if empty
    if ((!auditElements || auditElements.length === 0) && 
        Array.isArray(templateElements) && templateElements.length > 0 &&
        audit && audit.id) {
      console.log('🔄 Initializing auditElements from templateElements:', {
        templateElementsLength: templateElements.length,
        templateElementsSample: templateElements.slice(0, 2)
      });
      
      const initialAuditElements: AuditElement[] = templateElements.map((element) => ({
        _id: element._id,
        templateElementId: element._id,
        auditId: audit.id,
        categoryId: element.categoryId,
        subCategoryId: element.subCategoryId || '',
        name: element.name,
        positionByVersion: element.positionByVersion,
        constat: '',
        status: '',
        action: '',
        actionType: '',
        actionOwner: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      console.log('✅ Created initialAuditElements:', {
        length: initialAuditElements.length,
        sample: initialAuditElements.slice(0, 2)
      });

      setAuditElements(initialAuditElements);
    }
  }, [templateElements, auditElements, audit]);

  const handleElementAdd = (sectionId: string | null, categoryId: string, subCategoryId: string | null, name: string, position: number) => {
    const timestamp = new Date().toISOString();
    const currentTemplateVersion = audit?.templateVersion || 1;

    const newElement = {
      _id: `new_element_${timestamp}`,
      name,
      sectionId,
      categoryId,
      subCategoryId,
      isDefault: false,
      createdAt: {
        _seconds: Math.floor(Date.now() / 1000),
        _nanoseconds: (Date.now() % 1000) * 1000000
      },
      updatedAt: {
        _seconds: Math.floor(Date.now() / 1000),
        _nanoseconds: (Date.now() % 1000) * 1000000
      },
      positionByVersion: [position],
      templateVersion: [currentTemplateVersion]
    };

    // First trigger Retool event
    triggerEvent('onElementAdd', { element: newElement });

    // Then update local state
    // Insert the new element at its correct position
    const updatedElements = [...templateElements];
    const insertIndex = updatedElements.findIndex(el => {
      if (el.categoryId !== categoryId) return false;
      if (el.subCategoryId !== subCategoryId) return false;
      if (el.sectionId !== sectionId) return false;
      
      const elIndex = el.templateVersion.indexOf(currentTemplateVersion);
      if (elIndex === -1) return false;
      
      return el.positionByVersion[elIndex] > position;
    });

    if (insertIndex === -1) {
      updatedElements.push(newElement);
    } else {
      updatedElements.splice(insertIndex, 0, newElement);
    }

    setTemplateElements(updatedElements);
  };

  const handleElementDuplicate = (element: any) => {
    console.log('Index handleElementDuplicate - Element:', JSON.stringify(element, null, 2));

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

    console.log('Index handleElementDuplicate - Created new element:', JSON.stringify(newElement, null, 2));

    // First trigger the Retool event
    console.log('Index handleElementDuplicate - Triggering Retool event');
    triggerEvent('onElementDuplicate', { element: newElement });

    // Then update local state
    const newTemplateElements = [...templateElements, newElement];
    console.log('Index handleElementDuplicate - Updating local state with:', JSON.stringify(newTemplateElements.length, null, 2), 'elements');
    setTemplateElements(newTemplateElements);
  };

  const handleElementDelete = (elementId: string) => {
    console.log('Index handleElementDelete - Element ID:', elementId);

    // First trigger the Retool event
    console.log('Index handleElementDelete - Triggering Retool event');
    triggerEvent('onElementDelete', { elementId });

    // Then update local state
    const newTemplateElements = templateElements.filter(element => element._id !== elementId);
    console.log('Index handleElementDelete - Updating local state with:', JSON.stringify(newTemplateElements.length, null, 2), 'elements');
    setTemplateElements(newTemplateElements);
  };

  const [lastUpdateTime, setLastUpdateTime] = useState(new Date().toISOString());

  useEffect(() => {
    console.log('🔄 Index useEffect - templateElements changed:', JSON.stringify({
      length: templateElements.length,
      lastUpdateTime
    }, null, 2));
  }, [templateElements, lastUpdateTime]);

  React.useEffect(() => {
    console.log('🔄 Index state changed:', JSON.stringify({
      templateElements: templateElements.length,
      lastUpdateTime,
      timestamp: new Date().toISOString()
    }, null, 2));
  }, [templateElements, lastUpdateTime]);

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
      />
    </div>
  );
};