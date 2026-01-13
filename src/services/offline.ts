import { get, set, del, keys } from 'idb-keyval';
import * as firestoreService from './firestore';

// ============ TYPES ============

export interface PendingChange {
  id: string;
  timestamp: number;
  operation: 'create' | 'update' | 'delete';
  collection: string;
  documentId: string;
  field?: string;
  data: any;
  retryCount: number;
}

// ============ CACHE KEYS ============

const CACHE_KEYS = {
  PENDING_CHANGES: 'pendingChanges',
  AUDIT: (id: string) => `audit_${id}`,
  BUILDING: (id: string) => `building_${id}`,
  AUDIT_ELEMENTS: (auditId: string) => `auditElements_${auditId}`,
  TEMPLATE_ELEMENTS: (auditId: string) => `templateElements_${auditId}`,
  SECTIONS: (version: number) => `sections_v${version}`,
  CATEGORIES: (version: number) => `categories_v${version}`,
  SUB_CATEGORIES: (version: number) => `subCategories_v${version}`,
  ALL_TEMPLATE_ELEMENTS: (version: number) => `allTemplateElements_v${version}`,
  REGULATORIES: 'regulatories',
};

// ============ PENDING CHANGES QUEUE ============

export async function getPendingChanges(): Promise<PendingChange[]> {
  return (await get(CACHE_KEYS.PENDING_CHANGES)) || [];
}

export async function addPendingChange(change: Omit<PendingChange, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
  const changes = await getPendingChanges();
  const newChange: PendingChange = {
    ...change,
    id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    retryCount: 0,
  };
  changes.push(newChange);
  await set(CACHE_KEYS.PENDING_CHANGES, changes);
}

export async function removePendingChange(changeId: string): Promise<void> {
  const changes = await getPendingChanges();
  const filtered = changes.filter(c => c.id !== changeId);
  await set(CACHE_KEYS.PENDING_CHANGES, filtered);
}

export async function updatePendingChangeRetry(changeId: string): Promise<void> {
  const changes = await getPendingChanges();
  const updated = changes.map(c =>
    c.id === changeId ? { ...c, retryCount: c.retryCount + 1 } : c
  );
  await set(CACHE_KEYS.PENDING_CHANGES, updated);
}

// ============ SYNC PENDING CHANGES ============

const MAX_RETRIES = 3;

export async function syncPendingChanges(): Promise<{
  success: number;
  failed: number;
  errors: string[]
}> {
  const changes = await getPendingChanges();
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const change of changes) {
    try {
      await processChange(change);
      await removePendingChange(change.id);
      success++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (change.retryCount >= MAX_RETRIES) {
        // Max retries reached, remove and log error
        await removePendingChange(change.id);
        errors.push(`Failed after ${MAX_RETRIES} retries: ${change.collection}/${change.documentId} - ${errorMessage}`);
        failed++;
      } else {
        // Increment retry count
        await updatePendingChangeRetry(change.id);
        errors.push(`Retry ${change.retryCount + 1}/${MAX_RETRIES}: ${change.collection}/${change.documentId} - ${errorMessage}`);
      }
    }
  }

  return { success, failed, errors };
}

async function processChange(change: PendingChange): Promise<void> {
  switch (change.collection) {
    case 'audits':
      if (change.operation === 'update' && change.field) {
        await firestoreService.updateAudit(change.documentId, change.field, change.data);
      }
      break;

    case 'buildings':
      if (change.operation === 'update') {
        await firestoreService.updateBuilding(change.documentId, change.data);
      }
      break;

    case 'auditElements':
      if (change.operation === 'create') {
        await firestoreService.createAuditElement(change.data);
      } else if (change.operation === 'update') {
        await firestoreService.updateAuditElement(change.documentId, change.data);
      } else if (change.operation === 'delete') {
        await firestoreService.deleteAuditElement(change.documentId);
      }
      break;

    case 'templateElements':
      if (change.operation === 'create') {
        await firestoreService.createTemplateElement(change.data);
      }
      break;

    default:
      throw new Error(`Unknown collection: ${change.collection}`);
  }
}

// ============ DATA CACHE ============

export async function cacheAuditData(
  auditId: string,
  data: {
    audit: any;
    building: any;
    sections: any[];
    categories: any[];
    subCategories: any[];
    templateElements: any[];
    allTemplateElements: any[];
    auditElements: any[];
    regulatories: any[];
  }
): Promise<void> {
  const templateVersion = data.audit?.templateVersion;

  await Promise.all([
    set(CACHE_KEYS.AUDIT(auditId), data.audit),
    set(CACHE_KEYS.BUILDING(data.building?._id), data.building),
    set(CACHE_KEYS.AUDIT_ELEMENTS(auditId), data.auditElements),
    set(CACHE_KEYS.TEMPLATE_ELEMENTS(auditId), data.templateElements),
    templateVersion && set(CACHE_KEYS.SECTIONS(templateVersion), data.sections),
    templateVersion && set(CACHE_KEYS.CATEGORIES(templateVersion), data.categories),
    templateVersion && set(CACHE_KEYS.SUB_CATEGORIES(templateVersion), data.subCategories),
    templateVersion && set(CACHE_KEYS.ALL_TEMPLATE_ELEMENTS(templateVersion), data.allTemplateElements),
    set(CACHE_KEYS.REGULATORIES, data.regulatories),
  ].filter(Boolean));
}

export async function getCachedAuditData(auditId: string): Promise<{
  audit: any | null;
  building: any | null;
  sections: any[];
  categories: any[];
  subCategories: any[];
  templateElements: any[];
  allTemplateElements: any[];
  auditElements: any[];
  regulatories: any[];
} | null> {
  const audit = await get(CACHE_KEYS.AUDIT(auditId));

  if (!audit) return null;

  const templateVersion = audit.templateVersion;
  const buildingId = audit.buildingId;

  const [
    building,
    sections,
    categories,
    subCategories,
    templateElements,
    allTemplateElements,
    auditElements,
    regulatories,
  ] = await Promise.all([
    get(CACHE_KEYS.BUILDING(buildingId)),
    get(CACHE_KEYS.SECTIONS(templateVersion)),
    get(CACHE_KEYS.CATEGORIES(templateVersion)),
    get(CACHE_KEYS.SUB_CATEGORIES(templateVersion)),
    get(CACHE_KEYS.TEMPLATE_ELEMENTS(auditId)),
    get(CACHE_KEYS.ALL_TEMPLATE_ELEMENTS(templateVersion)),
    get(CACHE_KEYS.AUDIT_ELEMENTS(auditId)),
    get(CACHE_KEYS.REGULATORIES),
  ]);

  return {
    audit,
    building: building || null,
    sections: sections || [],
    categories: categories || [],
    subCategories: subCategories || [],
    templateElements: templateElements || [],
    allTemplateElements: allTemplateElements || [],
    auditElements: auditElements || [],
    regulatories: regulatories || [],
  };
}

// Update local cache for audit elements
export async function updateCachedAuditElements(
  auditId: string,
  auditElements: any[]
): Promise<void> {
  await set(CACHE_KEYS.AUDIT_ELEMENTS(auditId), auditElements);
}

// Update local cache for template elements
export async function updateCachedTemplateElements(
  auditId: string,
  templateElements: any[]
): Promise<void> {
  await set(CACHE_KEYS.TEMPLATE_ELEMENTS(auditId), templateElements);
}

// Update local cache for audit
export async function updateCachedAudit(auditId: string, audit: any): Promise<void> {
  await set(CACHE_KEYS.AUDIT(auditId), audit);
}

// Update local cache for building
export async function updateCachedBuilding(buildingId: string, building: any): Promise<void> {
  await set(CACHE_KEYS.BUILDING(buildingId), building);
}

// ============ CLEAR CACHE ============

export async function clearCache(): Promise<void> {
  const allKeys = await keys();
  for (const key of allKeys) {
    await del(key);
  }
}

export async function clearAuditCache(auditId: string): Promise<void> {
  const audit = await get(CACHE_KEYS.AUDIT(auditId));
  const keysToDelete = [
    CACHE_KEYS.AUDIT(auditId),
    CACHE_KEYS.AUDIT_ELEMENTS(auditId),
    CACHE_KEYS.TEMPLATE_ELEMENTS(auditId),
  ];

  if (audit) {
    keysToDelete.push(CACHE_KEYS.BUILDING(audit.buildingId));
  }

  await Promise.all(keysToDelete.map(key => del(key)));
}
