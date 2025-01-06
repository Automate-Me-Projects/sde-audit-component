import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { type FC } from 'react';
import { Retool } from '@tryretool/custom-component-support';
import { AuditForm } from './components/AuditForm';
import ImageGallery from './components/ImageGallery';
import { config } from './config';
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
  S3ListResponse
} from './types';
import './output.css';
import { generateTempId, createTimestamp, debounce } from './utils';

export const AuditFormComponent: FC = () => {
  // Retool state hooks
  const [audit, setAudit] = Retool.useStateObject({
    name: 'audit',
    description: 'The audit object',
  }) as unknown as [Audit, (value: Audit) => void];

  useEffect(() => {
    console.log('Current audit:', audit);
  }, [audit]);

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

  const [s3Response, setS3Response] = Retool.useStateObject({
    name: 'images',
    description: 'S3 bucket list response',
  }) as unknown as [S3ListResponse, (value: S3ListResponse) => void];

  useEffect(() => {
    console.log('S3 Images state:', { imagesCount: s3Response?.Contents?.length });
  }, [s3Response]);

  // Convert S3 response to [] for AuditForm
  const processedImages = useMemo(() => {
    if (!s3Response?.Contents?.length) return [];
    
    return s3Response.Contents.map(obj => ({
      id: obj.Key,
      name: obj.Key.split('_').pop() || obj.Key,
      url: `${config.aws.s3Url}/${obj.Key}`,
      key: obj.Key,
      auditId: obj.Key.split('_')[0],
      createdAt: obj.LastModified
    }));
  }, [s3Response]);

  // Event-related state
  const [changedAudit, setChangedAudit] = Retool.useStateObject({
    name: 'changedAudit',
    description: 'Audit changes'
  }) as unknown as [any, (value: any) => void];

  const [newAuditElement, setNewAuditElement] = Retool.useStateObject({
    name: 'newAuditElement',
    description: 'New audit element'
  }) as unknown as [any, (value: any) => void];

  const [changedAuditElement, setChangedAuditElement] = Retool.useStateArray({
    name: 'changedAuditElement',
    description: 'Array of changed audit elements',
  }) as unknown as [Array<{ elementId: string; field: string; value: any }>, (value: Array<{ elementId: string; field: string; value: any }>) => void];

  const [deletedAuditElement, setDeletedAuditElement] = Retool.useStateObject({
    name: 'deletedAuditElement',
    description: 'Audit element to delete'
  }) as unknown as [any, (value: any) => void];

  const [newTemplateElement, setNewTemplateElement] = Retool.useStateObject({
    name: 'newTemplateElement',
    description: 'New template element data'
  }) as unknown as [any, (value: any) => void];

  const [changedBuilding, setChangedBuilding] = Retool.useStateObject({
    name: 'changedBuilding',
    description: 'Building changes'
  }) as unknown as [any, (value: any) => void];

  // Event callbacks
  const onAuditChange = Retool.useEventCallback({ name: 'auditChange' });
  const onAuditElementAdd = Retool.useEventCallback({ name: 'auditElementAdd' });
  const onAuditElementChange = Retool.useEventCallback({ name: 'auditElementChange' });
  const onAuditElementDelete = Retool.useEventCallback({ name: 'auditElementDelete' });
  const onTemplateElementAdd = Retool.useEventCallback({ name: 'templateElementAdd' });
  const onBuildingChange = Retool.useEventCallback({ name: 'buildingChange' });

  const triggerEvent = useCallback((eventName: string, data: any) => {
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
      case 'auditElementAdd':
        if (data.element) {
          setNewAuditElement(data.element);
        }
        onAuditElementAdd();
        setNewAuditElement(null);
        break;
      case 'auditElementChange':
        const newChangedElement = { elementId: data.elementId, field: data.field, value: data.value };
        setChangedAuditElement([newChangedElement]);
        onAuditElementChange();
        setChangedAuditElement([]);
        break;
      case 'auditElementDelete':
        setDeletedAuditElement(data);
        onAuditElementDelete();
        setDeletedAuditElement(null);
        break;
      case 'templateElementAdd':
        if (data.element) {
          setNewTemplateElement(data.element);
        }
        onTemplateElementAdd();
        setNewTemplateElement(null);
        break;
      case 'buildingChange':
        setChangedBuilding(data);
        onBuildingChange();
        setChangedBuilding(null);
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
  }, [
    setChangedAudit, onAuditChange,
    setNewAuditElement, onAuditElementAdd,
    setChangedAuditElement, onAuditElementChange,
    setDeletedAuditElement, onAuditElementDelete,
    setNewTemplateElement, onTemplateElementAdd,
    setChangedBuilding, onBuildingChange
  ]);

  const handleAuditChange = useCallback((field: string, value: any) => {
    setAudit({...audit, [field]: value });
    triggerEvent('auditChange', { auditId: audit.id, field, value });
  }, [audit, setAudit, triggerEvent]);

  const handleAuditElementAdd = useCallback((name: string, subCategoryId: string | null, categoryId: string) => {
    const selectedElement = allTemplateElements.find(element => 
      element.categoryId === categoryId && 
      (element.subCategoryId ? element.subCategoryId === subCategoryId : true) && 
      element.name === name
    );

    if (!selectedElement) {
      console.error('Selected template element not found');
      return;
    }

    const elementExists = templateElements.some(element => element._id === selectedElement._id);
    const timestamp = createTimestamp();

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

    if (!elementExists) {
      const newTemplateElements = [...templateElements, selectedElement];
      setTemplateElements(newTemplateElements);
    }

    const newAuditElements = [...auditElements, auditElement];
    setAuditElements(newAuditElements);

    const { _id, createdAt, updatedAt, ...retoolAuditElement } = auditElement;
    triggerEvent('auditElementAdd', { element: retoolAuditElement });
  }, [
    allTemplateElements,
    templateElements,
    auditElements,
    audit.id,
    setTemplateElements,
    setAuditElements,
    triggerEvent
  ]);

  const handleAuditElementChange = useCallback((elementId: string, field: string, value: any) => {
    triggerEvent('auditElementChange', { elementId, field, value });

    if (auditElements && Array.isArray(auditElements)) {
      const updatedElements = auditElements.map(element => 
        element._id === elementId ? { ...element, [field]: value } : element
      );
      setAuditElements(updatedElements);
    }
  }, [auditElements, setAuditElements, triggerEvent]);

  const handleAuditElementDelete = useCallback((expandedElement: ExpandedElement) => {
    triggerEvent('auditElementDelete', { expandedElement });

    const newAuditElements = auditElements.filter(
      auditElement => auditElement._id !== expandedElement.auditElement?._id
    );

    const hasRemainingAuditElements = newAuditElements.some(
      auditElement => auditElement.templateElementId === expandedElement._id
    );

    if (!hasRemainingAuditElements) {
      const newTemplateElements = templateElements.filter(
        template => template._id !== expandedElement._id
      );
      setTemplateElements(newTemplateElements);
    }

    setAuditElements(newAuditElements);
  }, [auditElements, templateElements, setAuditElements, setTemplateElements, triggerEvent]);

  const handleElementDuplicate = useCallback((element: ExpandedElement) => {
    if (!element.auditElement) return;
  
    const timestamp = createTimestamp();
    const { _id, createdAt, updatedAt, ...retoolAuditElement } = element.auditElement;
    
    const newAuditElement = {
      ...retoolAuditElement,
      _id: generateTempId(),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    triggerEvent('auditElementAdd', { element: retoolAuditElement });
    const newAuditElements = [...auditElements, newAuditElement];
    setAuditElements(newAuditElements);
  }, [auditElements, setAuditElements, triggerEvent]);

  const handleTemplateElementAdd = useCallback((_id: string, name: string, subCategoryId: string | null, categoryId: string, position: number[]) => {
    if (!categoryId) {
      console.error('🚨 Index handleTemplateElementAdd - Missing categoryId:');
      return;
    }

    const timestamp = createTimestamp();

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

    const newTemplateElements = [...templateElements, templateElement];
    const newAuditElements = [...auditElements, auditElement];
    
    setTemplateElements(newTemplateElements);
    setAuditElements(newAuditElements);

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

    triggerEvent('templateElementAdd', { element: retoolData });
  }, [audit.id, audit.templateVersion, templateElements, auditElements, setTemplateElements, setAuditElements, triggerEvent]);

  const debouncedICPEBuildingChange = useCallback(
    debounce((refId: string, field: string, value: string) => {
      const currentBuilding = building;
      if (!currentBuilding?.icpeTypes) {
        console.error('Building or icpeTypes is undefined');
        return;
      }

      const updatedBuilding: Building = {
        ...currentBuilding,
        icpeTypes: currentBuilding.icpeTypes.map(icpe => 
          icpe.refId === refId ? { ...icpe, [field]: value } : icpe
        )
      };

      triggerEvent('buildingChange', { buildingId: currentBuilding._id, refId, field, value });
      setBuilding(updatedBuilding);
    }, 1000),
    [building, triggerEvent]
  );

  const handleICPEBuildingChange = useCallback((refId: string, field: string, value: string) => {
    if (!building?.icpeTypes) {
      console.error('Building or icpeTypes is undefined in handleICPEBuildingChange');
      return;
    }
    debouncedICPEBuildingChange(refId, field, value);
  }, [building?.icpeTypes, debouncedICPEBuildingChange]);

  // Store raw template elements when they come from Retool
  useEffect(() => {
    if (allTemplateElements && allTemplateElements !== rawAllTemplateElements) {
      setRawAllTemplateElements(allTemplateElements);
    }
  }, [allTemplateElements, rawAllTemplateElements]);

  // Memoize the props passed to AuditForm
  const auditFormProps = useMemo(() => ({
    audit,
    building,
    sections,
    categories,
    subCategories,
    templateElements,
    allTemplateElements,
    auditElements,
    regulatories,
    images: processedImages,
    onAuditChange: handleAuditChange,
    onElementAdd: handleAuditElementAdd,
    onElementChange: handleAuditElementChange,
    onElementDelete: handleAuditElementDelete,
    onElementDuplicate: handleElementDuplicate,
    onTemplateElementAdd: handleTemplateElementAdd,
    onICPEBuildingChange: handleICPEBuildingChange
  }), [
    audit,
    building,
    sections,
    categories,
    subCategories,
    templateElements,
    allTemplateElements,
    auditElements,
    regulatories,
    processedImages,
    handleAuditChange,
    handleAuditElementAdd,
    handleAuditElementChange,
    handleAuditElementDelete,
    handleElementDuplicate,
    handleTemplateElementAdd,
    handleICPEBuildingChange
  ]);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <AuditForm {...auditFormProps} />
      <div className="mt-8">
        <ImageGallery s3Response={s3Response} />
      </div>
    </div>
  );
};