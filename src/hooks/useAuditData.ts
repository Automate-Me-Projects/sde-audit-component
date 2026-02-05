import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as firestoreService from '../services/firestore';
import * as offlineService from '../services/offline';
import * as s3Service from '../services/s3';
import { useOfflineContext } from '../context/OfflineContext';
import { generateTempId, createTimestamp, debounce } from '../utils';
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
  S3Item,
  SaveStatus,
} from '../types';

export interface UseAuditDataReturn {
  // Data
  audit: Audit | null;
  building: Building | null;
  sections: Section[];
  categories: Category[];
  subCategories: SubCategory[];
  templateElements: TemplateElement[];
  allTemplateElements: TemplateElement[];
  auditElements: AuditElement[];
  regulatories: Regulatory[];
  images: S3Item[];
  files: S3Item[];

  // States
  loading: boolean;
  error: Error | null;
  saveStatus: SaveStatus;
  pendingCount: number;

  // Handlers
  handleAuditChange: (field: string, value: any) => void;
  handleAuditElementAdd: (name: string, subCategoryId: string | null, categoryId: string) => void;
  handleAuditElementChange: (elementId: string | undefined, templateElementId: string, field: string, value: any) => void;
  handleAuditElementDelete: (expandedElement: ExpandedElement) => void;
  handleElementDuplicate: (element: ExpandedElement) => void;
  handleTemplateElementAdd: (_id: string, name: string, subCategoryId: string | null, categoryId: string, position: number[]) => void;
  handleBuildingChange: (refId: string | null, field: string, value: string) => void;

  // Refresh
  refresh: () => Promise<void>;
}

export function useAuditData(auditId: string | null): UseAuditDataReturn {
  const { isOnline } = useOfflineContext();

  // State
  const [audit, setAudit] = useState<Audit | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [templateElements, setTemplateElements] = useState<TemplateElement[]>([]);
  const [allTemplateElements, setAllTemplateElements] = useState<TemplateElement[]>([]);
  const [auditElements, setAuditElements] = useState<AuditElement[]>([]);
  const [regulatories, setRegulatories] = useState<Regulatory[]>([]);
  const [images, setImages] = useState<S3Item[]>([]);
  const [files, setFiles] = useState<S3Item[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Save status tracking
  const [pendingCount, setPendingCount] = useState(0);
  const [savingCount, setSavingCount] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Debounce timeouts refs
  const debounceTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Track documents being created (to queue updates until create completes)
  const pendingCreates = useRef<Map<string, { promise: Promise<void>; resolve: () => void }>>(new Map());
  const pendingUpdates = useRef<Map<string, { field: string | null; data: any }[]>>(new Map());

  // Load data
  const loadData = useCallback(async () => {
    if (!auditId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try to load from cache first if offline
      if (!isOnline) {
        const cachedData = await offlineService.getCachedAuditData(auditId);
        if (cachedData && cachedData.audit) {
          setAudit(cachedData.audit);
          setBuilding(cachedData.building);
          setSections(cachedData.sections);
          setCategories(cachedData.categories);
          setSubCategories(cachedData.subCategories);
          setTemplateElements(cachedData.templateElements);
          setAllTemplateElements(cachedData.allTemplateElements);
          setAuditElements(cachedData.auditElements);
          setRegulatories(cachedData.regulatories);
          setLoading(false);
          return;
        }
      }

      // Load from Firestore
      const data = await firestoreService.fetchAllDataForAudit(auditId);

      if (!data.audit) {
        throw new Error(`Audit not found: ${auditId}`);
      }

      setAudit(data.audit);
      setBuilding(data.building);
      setSections(data.sections);
      setCategories(data.categories);
      setSubCategories(data.subCategories);
      setTemplateElements(data.templateElements);
      setAllTemplateElements(data.allTemplateElements);
      setAuditElements(data.auditElements);
      setRegulatories(data.regulatories);

      // Cache data for offline use
      await offlineService.cacheAuditData(auditId, data);

      // Load S3 images/files via backend
      if (data.audit && data.building) {
        try {
          const s3Data = await s3Service.fetchAuditFiles(auditId, data.building._id);
          setImages(s3Data.images);
          setFiles(s3Data.files);
        } catch (s3Error) {
          console.warn('Failed to load S3 files:', s3Error);
          // Continue without images/files - not critical
        }
      }

    } catch (err) {
      console.error('Error loading audit data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      setLoading(false);
    }
  }, [auditId, isOnline]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============ DEBOUNCED FIREBASE UPDATE ============

  // Process queued updates for a document after it's been created
  const processQueuedUpdates = useCallback(async (collection: string, documentId: string) => {
    const docKey = `${collection}-${documentId}`;
    const queuedUpdates = pendingUpdates.current.get(docKey);

    if (queuedUpdates && queuedUpdates.length > 0) {
      // Merge all queued updates
      const mergedData = queuedUpdates.reduce((acc, update) => {
        return { ...acc, ...update.data };
      }, {});

      pendingUpdates.current.delete(docKey);

      try {
        if (collection === 'auditElements') {
          await firestoreService.updateAuditElement(documentId, mergedData);
        }
      } catch (error) {
        console.error(`Failed to apply queued updates for ${collection}/${documentId}:`, error);
        setHasError(true);
      }
    }
  }, []);

  const debouncedFirebaseUpdate = useCallback((
    collection: string,
    documentId: string,
    field: string | null,
    data: any,
    operation: 'update' | 'create' | 'delete',
    delayMs: number = 1000
  ) => {
    const key = `${collection}-${documentId}-${field || 'all'}`;
    const docKey = `${collection}-${documentId}`;

    // For updates, check if the document is still being created
    if (operation === 'update' && pendingCreates.current.has(docKey)) {
      // Queue the update to be applied after create completes
      const existingQueue = pendingUpdates.current.get(docKey) || [];
      existingQueue.push({ field, data });
      pendingUpdates.current.set(docKey, existingQueue);
      return;
    }

    // For creates, mark as pending immediately (before setTimeout)
    // Create a real promise that will be resolved when the create completes
    if (operation === 'create') {
      let resolveCreate: () => void = () => {};
      const createPromise = new Promise<void>((resolve) => {
        resolveCreate = resolve;
      });
      pendingCreates.current.set(docKey, { promise: createPromise, resolve: resolveCreate });
    }

    // Clear existing timeout
    const existingTimeout = debounceTimeouts.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    } else {
      // New pending operation
      setPendingCount(prev => prev + 1);
    }

    // Clear any previous error when new changes are made
    setHasError(false);

    // Set new timeout
    const timeout = setTimeout(async () => {
      debounceTimeouts.current.delete(key);

      // Move from pending to saving
      setPendingCount(prev => Math.max(0, prev - 1));
      setSavingCount(prev => prev + 1);

      if (isOnline) {
        try {
          switch (collection) {
            case 'audits':
              if (field) {
                await firestoreService.updateAudit(documentId, field, data);
              }
              break;
            case 'buildings':
              await firestoreService.updateBuilding(documentId, data);
              break;
            case 'auditElements':
              if (operation === 'update') {
                // Double-check if there's a pending create (belt and suspenders)
                const pendingCreate = pendingCreates.current.get(docKey);
                if (pendingCreate) {
                  // Wait for create to complete before updating
                  await pendingCreate.promise;
                }
                await firestoreService.updateAuditElement(documentId, data);
              } else if (operation === 'create') {
                // Get the pending create entry (already set before setTimeout)
                const pendingEntry = pendingCreates.current.get(docKey);

                // Pass documentId to use setDoc with specific ID instead of addDoc
                await firestoreService.createAuditElement(data, documentId);

                // Mark create as complete by resolving the promise
                if (pendingEntry) {
                  pendingEntry.resolve();
                }

                // Process any queued updates after create completes
                await processQueuedUpdates(collection, documentId);
                pendingCreates.current.delete(docKey);
              } else if (operation === 'delete') {
                await firestoreService.deleteAuditElement(documentId);
              }
              break;
            case 'templateElements':
              if (operation === 'create') {
                // Pass documentId to use setDoc with specific ID
                await firestoreService.createTemplateElement(data, documentId);
              }
              break;
          }
        } catch (error) {
          console.error(`Failed to sync ${collection}/${documentId}:`, error);
          setHasError(true);
          // Clean up pending create on error and resolve promise to unblock waiting updates
          const pendingEntry = pendingCreates.current.get(docKey);
          if (pendingEntry) {
            pendingEntry.resolve();
            pendingCreates.current.delete(docKey);
          }
          // Add to offline queue for retry
          await offlineService.addPendingChange({
            operation,
            collection,
            documentId,
            field: field || undefined,
            data,
          });
        }
      } else {
        // Offline: add to pending queue
        await offlineService.addPendingChange({
          operation,
          collection,
          documentId,
          field: field || undefined,
          data,
        });
        // Clean up pending create for offline mode
        if (operation === 'create') {
          const pendingEntry = pendingCreates.current.get(docKey);
          if (pendingEntry) {
            pendingEntry.resolve();
            pendingCreates.current.delete(docKey);
          }
        }
      }

      // Done saving
      setSavingCount(prev => Math.max(0, prev - 1));
    }, delayMs);

    debounceTimeouts.current.set(key, timeout);
  }, [isOnline, processQueuedUpdates]);

  // ============ HANDLERS ============

  const handleAuditChange = useCallback((field: string, value: any) => {
    if (!audit) return;

    // Optimistic update
    const updatedAudit = { ...audit, [field]: value };
    setAudit(updatedAudit);

    // Update cache
    if (auditId) {
      offlineService.updateCachedAudit(auditId, updatedAudit);
    }

    // Debounced Firebase update (500ms for dropdowns, 1000ms for text)
    const delay = ['status'].includes(field) ? 0 : 500;
    debouncedFirebaseUpdate('audits', audit.id, field, value, 'update', delay);
  }, [audit, auditId, debouncedFirebaseUpdate]);

  const handleAuditElementAdd = useCallback((name: string, subCategoryId: string | null, categoryId: string) => {
    if (!audit) return;

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

    const newAuditElement: AuditElement = {
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
      updatedAt: timestamp,
    };

    // Optimistic updates
    if (!elementExists) {
      const newTemplateElements = [...templateElements, selectedElement];
      setTemplateElements(newTemplateElements);
      if (auditId) {
        offlineService.updateCachedTemplateElements(auditId, newTemplateElements);
      }
    }

    const newAuditElements = [...auditElements, newAuditElement];
    setAuditElements(newAuditElements);
    if (auditId) {
      offlineService.updateCachedAuditElements(auditId, newAuditElements);
    }

    // Firebase update (immediate)
    const { _id, ...elementData } = newAuditElement;
    debouncedFirebaseUpdate('auditElements', _id, null, elementData, 'create', 0);
  }, [audit, auditId, allTemplateElements, templateElements, auditElements, debouncedFirebaseUpdate]);

  const handleAuditElementChange = useCallback((
    elementId: string | undefined,
    templateElementId: string,
    field: string,
    value: any
  ) => {
    if (!elementId) return;

    // Optimistic update
    const updatedElements = auditElements.map(element =>
      element._id === elementId
        ? { ...element, [field]: value, updatedAt: createTimestamp() }
        : element
    );
    setAuditElements(updatedElements);

    // Update cache
    if (auditId) {
      offlineService.updateCachedAuditElements(auditId, updatedElements);
    }

    // Debounced Firebase update
    const delay = ['status', 'actionType', 'actionOwner'].includes(field) ? 0 : 1000;
    debouncedFirebaseUpdate('auditElements', elementId, field, { [field]: value }, 'update', delay);
  }, [auditId, auditElements, debouncedFirebaseUpdate]);

  const handleAuditElementDelete = useCallback((expandedElement: ExpandedElement) => {
    if (!expandedElement.auditElement) {
      console.error('Cannot delete: auditElement is null');
      return;
    }

    const auditElementId = expandedElement.auditElement._id;

    // Optimistic updates
    const newAuditElements = auditElements.filter(
      ae => ae._id !== auditElementId
    );

    const hasRemainingAuditElements = newAuditElements.some(
      ae => ae.templateElementId === expandedElement._id
    );

    if (!hasRemainingAuditElements) {
      const newTemplateElements = templateElements.filter(
        te => te._id !== expandedElement._id
      );
      setTemplateElements(newTemplateElements);
      if (auditId) {
        offlineService.updateCachedTemplateElements(auditId, newTemplateElements);
      }
    }

    setAuditElements(newAuditElements);
    if (auditId) {
      offlineService.updateCachedAuditElements(auditId, newAuditElements);
    }

    // Firebase delete (immediate)
    debouncedFirebaseUpdate('auditElements', auditElementId, null, null, 'delete', 0);
  }, [auditId, auditElements, templateElements, debouncedFirebaseUpdate]);

  const handleElementDuplicate = useCallback((element: ExpandedElement) => {
    if (!element.auditElement || !audit) return;

    const timestamp = createTimestamp();
    const { _id, createdAt, updatedAt, ...dataAuditElement } = element.auditElement;
    const tempId = generateTempId();

    const newAuditElement: AuditElement = {
      ...dataAuditElement,
      _id: tempId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Optimistic update
    const newAuditElements = [...auditElements, newAuditElement];
    setAuditElements(newAuditElements);
    if (auditId) {
      offlineService.updateCachedAuditElements(auditId, newAuditElements);
    }

    // Firebase create (immediate)
    const { _id: newId, ...elementData } = newAuditElement;
    debouncedFirebaseUpdate('auditElements', tempId, null, elementData, 'create', 0);
  }, [audit, auditId, auditElements, debouncedFirebaseUpdate]);

  const handleTemplateElementAdd = useCallback((
    _id: string,
    name: string,
    subCategoryId: string | null,
    categoryId: string,
    position: number[]
  ) => {
    if (!categoryId || !audit) {
      console.error('Missing categoryId or audit');
      return;
    }

    const timestamp = createTimestamp();
    const tempId = generateTempId();

    const newTemplateElement: TemplateElement = {
      _id,
      name,
      subCategoryId,
      categoryId,
      positionByVersion: position,
      templateVersion: [audit.templateVersion],
      isDefault: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const newAuditElement: AuditElement = {
      _id: tempId,
      auditId: audit.id,
      templateElementId: _id,
      categoryId,
      subCategoryId,
      status: null,
      constat: null,
      actionType: null,
      actionOwner: null,
      action: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Optimistic updates
    const newTemplateElements = [...templateElements, newTemplateElement];
    const newAuditElements = [...auditElements, newAuditElement];

    setTemplateElements(newTemplateElements);
    setAuditElements(newAuditElements);

    if (auditId) {
      offlineService.updateCachedTemplateElements(auditId, newTemplateElements);
      offlineService.updateCachedAuditElements(auditId, newAuditElements);
    }

    // Firebase creates (immediate)
    const { _id: teId, ...teData } = newTemplateElement;
    const { _id: aeId, ...aeData } = newAuditElement;
    debouncedFirebaseUpdate('templateElements', _id, null, teData, 'create', 0);
    debouncedFirebaseUpdate('auditElements', tempId, null, aeData, 'create', 0);
  }, [audit, auditId, templateElements, auditElements, debouncedFirebaseUpdate]);

  const handleBuildingChange = useCallback((refId: string | null, field: string, value: string) => {
    if (!building) return;

    let updatedBuilding: Building;

    if (refId === null) {
      // Direct building field update
      updatedBuilding = { ...building, [field]: value };
    } else {
      // ICPE type update
      if (!building.icpeTypes) {
        console.error('icpeTypes is undefined');
        return;
      }
      updatedBuilding = {
        ...building,
        icpeTypes: building.icpeTypes.map(icpe =>
          icpe.refId === refId ? { ...icpe, [field]: value } : icpe
        ),
      };
    }

    // Optimistic update
    setBuilding(updatedBuilding);

    // Update cache
    offlineService.updateCachedBuilding(building._id, updatedBuilding);

    // Debounced Firebase update - clean undefined values from icpeTypes
    let updateData: Record<string, any>;
    if (refId === null) {
      updateData = { [field]: value };
    } else {
      // Remove undefined values from icpeTypes to avoid Firebase error
      const cleanedIcpeTypes = updatedBuilding.icpeTypes?.map(icpe => {
        const cleaned: Record<string, any> = {};
        for (const [key, val] of Object.entries(icpe)) {
          if (val !== undefined) {
            cleaned[key] = val;
          }
        }
        return cleaned;
      });
      updateData = { icpeTypes: cleanedIcpeTypes };
    }

    debouncedFirebaseUpdate('buildings', building._id, null, updateData, 'update', 500);
  }, [building, debouncedFirebaseUpdate]);

  // Filter templateElements to only include those used in auditElements
  const filteredTemplateElements = useMemo(() => {
    const usedTemplateIds = new Set(auditElements.map(ae => ae.templateElementId));
    return templateElements.filter(te => usedTemplateIds.has(te._id));
  }, [templateElements, auditElements]);

  // Compute save status
  const saveStatus: SaveStatus = useMemo(() => {
    if (hasError) return 'error';
    if (savingCount > 0) return 'saving';
    if (pendingCount > 0) return 'pending';
    return 'saved';
  }, [hasError, savingCount, pendingCount]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      debounceTimeouts.current.forEach(timeout => clearTimeout(timeout));
      debounceTimeouts.current.clear();
    };
  }, []);

  return {
    audit,
    building,
    sections,
    categories,
    subCategories,
    templateElements: filteredTemplateElements,
    allTemplateElements,
    auditElements,
    regulatories,
    images,
    files,
    loading,
    error,
    saveStatus,
    pendingCount,
    handleAuditChange,
    handleAuditElementAdd,
    handleAuditElementChange,
    handleAuditElementDelete,
    handleElementDuplicate,
    handleTemplateElementAdd,
    handleBuildingChange,
    refresh: loadData,
  };
}
