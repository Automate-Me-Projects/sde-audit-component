import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  addDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Audit,
  Building,
  Section,
  Category,
  SubCategory,
  TemplateElement,
  AuditElement,
  Regulatory,
} from '../types';

// Collection names
const COLLECTIONS = {
  AUDITS: 'audits',
  BUILDINGS: 'buildings',
  SECTIONS: 'sections',
  CATEGORIES: 'categories',
  SUB_CATEGORIES: 'subCategories',
  TEMPLATE_ELEMENTS: 'templateElements',
  AUDIT_ELEMENTS: 'auditElements',
  REGULATORIES: 'regulatories',
  PORTFOLIOS: 'portfolios',
  CONTACTS: 'contacts',
  EDITORS: 'editors',
  ICPE_TYPES: 'icpeTypes',
} as const;

// Reference types
interface Portfolio {
  _id: string;
  name: string;
}

interface Contact {
  _id: string;
  name: string;
  company?: string;
}

interface Editor {
  _id: string;
  name: string;
}

interface IcpeTypeRef {
  _id: string;
  rubrique: string;
  description: string;
  regime: string;
  critere?: string;
}

// ============ READ OPERATIONS ============

export async function fetchAuditById(auditId: string): Promise<Audit | null> {
  const docRef = doc(db, COLLECTIONS.AUDITS, auditId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return { id: docSnap.id, ...docSnap.data() } as Audit;
}

export async function fetchBuildingById(buildingId: string): Promise<Building | null> {
  const docRef = doc(db, COLLECTIONS.BUILDINGS, buildingId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return { _id: docSnap.id, ...docSnap.data() } as Building;
}

export async function fetchSectionsByVersion(templateVersion: number): Promise<Section[]> {
  const q = query(
    collection(db, COLLECTIONS.SECTIONS),
    where('templateVersion', 'array-contains', templateVersion)
  );
  const querySnapshot = await getDocs(q);

  const sections = querySnapshot.docs.map(doc => ({
    _id: doc.id,
    ...doc.data()
  })) as Section[];

  // Sort by position
  return sections.sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));
}

export async function fetchCategoriesByVersion(templateVersion: number): Promise<Category[]> {
  const q = query(
    collection(db, COLLECTIONS.CATEGORIES),
    where('templateVersion', 'array-contains', templateVersion)
  );
  const querySnapshot = await getDocs(q);

  const categories = querySnapshot.docs.map(doc => ({
    _id: doc.id,
    ...doc.data()
  })) as Category[];

  // Sort by positionByVersion - find index of templateVersion in templateVersion array
  return categories.sort((a, b) => {
    const indexA = (a.templateVersion as readonly number[])?.indexOf(templateVersion) ?? -1;
    const indexB = (b.templateVersion as readonly number[])?.indexOf(templateVersion) ?? -1;
    const posA = indexA !== -1 ? (a.positionByVersion?.[indexA] ?? Infinity) : Infinity;
    const posB = indexB !== -1 ? (b.positionByVersion?.[indexB] ?? Infinity) : Infinity;
    return posA - posB;
  });
}

export async function fetchSubCategoriesByVersion(templateVersion: number): Promise<SubCategory[]> {
  const q = query(
    collection(db, COLLECTIONS.SUB_CATEGORIES),
    where('templateVersion', 'array-contains', templateVersion)
  );
  const querySnapshot = await getDocs(q);

  const subCategories = querySnapshot.docs.map(doc => ({
    _id: doc.id,
    ...doc.data()
  })) as SubCategory[];

  // Sort by positionByVersion - find index of templateVersion in templateVersion array
  return subCategories.sort((a, b) => {
    const indexA = (a.templateVersion as readonly number[])?.indexOf(templateVersion) ?? -1;
    const indexB = (b.templateVersion as readonly number[])?.indexOf(templateVersion) ?? -1;
    const posA = indexA !== -1 ? (a.positionByVersion?.[indexA] ?? Infinity) : Infinity;
    const posB = indexB !== -1 ? (b.positionByVersion?.[indexB] ?? Infinity) : Infinity;
    return posA - posB;
  });
}

export async function fetchTemplateElementsByAuditId(auditId: string): Promise<TemplateElement[]> {
  // First get audit to know template version
  const audit = await fetchAuditById(auditId);
  if (!audit) return [];

  // Get audit elements for this audit
  const auditElements = await fetchAuditElementsByAuditId(auditId);
  const templateElementIds = auditElements.map(ae => ae.templateElementId);

  if (templateElementIds.length === 0) return [];

  // Fetch template elements that are referenced by audit elements
  const templateElements: TemplateElement[] = [];

  // Firestore 'in' query limited to 30 items, batch if needed
  const batchSize = 30;
  for (let i = 0; i < templateElementIds.length; i += batchSize) {
    const batch = templateElementIds.slice(i, i + batchSize);
    const q = query(
      collection(db, COLLECTIONS.TEMPLATE_ELEMENTS),
      where('__name__', 'in', batch)
    );
    const querySnapshot = await getDocs(q);

    querySnapshot.docs.forEach(doc => {
      templateElements.push({
        _id: doc.id,
        ...doc.data()
      } as TemplateElement);
    });
  }

  return templateElements;
}

export async function fetchAllTemplateElementsByVersion(templateVersion: number): Promise<TemplateElement[]> {
  const q = query(
    collection(db, COLLECTIONS.TEMPLATE_ELEMENTS),
    where('templateVersion', 'array-contains', templateVersion)
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    _id: doc.id,
    ...doc.data()
  })) as TemplateElement[];
}

export async function fetchAuditElementsByAuditId(auditId: string): Promise<AuditElement[]> {
  const q = query(
    collection(db, COLLECTIONS.AUDIT_ELEMENTS),
    where('auditId', '==', auditId)
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    _id: doc.id,
    ...doc.data()
  })) as AuditElement[];
}

export async function fetchRegulatories(): Promise<Regulatory[]> {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.REGULATORIES));

  return querySnapshot.docs.map(doc => ({
    _id: doc.id,
    ...doc.data()
  })) as Regulatory[];
}

// ============ REFERENCE RESOLUTION ============

async function fetchPortfolioById(portfolioId: string): Promise<Portfolio | null> {
  if (!portfolioId) return null;
  try {
    const docRef = doc(db, COLLECTIONS.PORTFOLIOS, portfolioId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { _id: docSnap.id, ...docSnap.data() } as Portfolio;
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return null;
  }
}

async function fetchContactById(contactId: string): Promise<Contact | null> {
  if (!contactId) return null;
  try {
    const docRef = doc(db, COLLECTIONS.CONTACTS, contactId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { _id: docSnap.id, ...docSnap.data() } as Contact;
  } catch (error) {
    console.error('Error fetching contact:', error);
    return null;
  }
}

async function fetchEditorById(editorId: string): Promise<Editor | null> {
  if (!editorId) return null;

  // Try multiple collection names for editors/responsables SDE
  const collectionsToTry = [
    COLLECTIONS.EDITORS,
    'users',
    'employees',
    'team',
    COLLECTIONS.CONTACTS,
    'responsablesSDE',
    'sdeEmployees',
    'members',
    'auditeurs',
    'redacteurs'
  ];

  for (const collectionName of collectionsToTry) {
    try {
      const docRef = doc(db, collectionName, editorId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const name = data.name || data.displayName || data.fullName ||
                     (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : null);
        if (name) {
          return { _id: docSnap.id, name };
        }
      }
    } catch (error) {
      // Continue to next collection
    }
  }

  return null;
}

async function fetchIcpeTypeRefById(refId: string): Promise<IcpeTypeRef | null> {
  if (!refId) return null;
  try {
    const docRef = doc(db, COLLECTIONS.ICPE_TYPES, refId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { _id: docSnap.id, ...docSnap.data() } as IcpeTypeRef;
  } catch (error) {
    console.error('Error fetching ICPE type ref:', error);
    return null;
  }
}

async function fetchAllIcpeTypeRefs(): Promise<Map<string, IcpeTypeRef>> {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.ICPE_TYPES));
  const map = new Map<string, IcpeTypeRef>();
  querySnapshot.docs.forEach(doc => {
    map.set(doc.id, { _id: doc.id, ...doc.data() } as IcpeTypeRef);
  });
  return map;
}

// ============ WRITE OPERATIONS ============

export async function updateAudit(
  auditId: string,
  field: string,
  value: any
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.AUDITS, auditId);
  await updateDoc(docRef, { [field]: value });
}

export async function updateBuilding(
  buildingId: string,
  updates: Partial<Building>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.BUILDINGS, buildingId);
  // Remove _id from updates if present
  const { _id, ...updateData } = updates as any;
  await updateDoc(docRef, updateData);
}

export async function createAuditElement(
  element: Omit<AuditElement, '_id'>,
  documentId?: string
): Promise<string> {
  if (documentId) {
    // Use setDoc with specified ID (for duplicates/new elements with temp IDs)
    const docRef = doc(db, COLLECTIONS.AUDIT_ELEMENTS, documentId);
    await setDoc(docRef, element);
    return documentId;
  } else {
    // Use addDoc for auto-generated ID
    const docRef = await addDoc(collection(db, COLLECTIONS.AUDIT_ELEMENTS), element);
    return docRef.id;
  }
}

export async function updateAuditElement(
  elementId: string,
  updates: Partial<AuditElement>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.AUDIT_ELEMENTS, elementId);
  // Remove _id from updates if present
  const { _id, ...updateData } = updates as any;
  await updateDoc(docRef, updateData);
}

export async function deleteAuditElement(elementId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.AUDIT_ELEMENTS, elementId);
  await deleteDoc(docRef);
}

export async function createTemplateElement(
  element: Omit<TemplateElement, '_id'>,
  documentId?: string
): Promise<string> {
  if (documentId) {
    // Use setDoc with specified ID
    const docRef = doc(db, COLLECTIONS.TEMPLATE_ELEMENTS, documentId);
    await setDoc(docRef, element);
    return documentId;
  } else {
    // Use addDoc for auto-generated ID
    const docRef = await addDoc(collection(db, COLLECTIONS.TEMPLATE_ELEMENTS), element);
    return docRef.id;
  }
}

// ============ BATCH OPERATIONS ============

export async function fetchAllDataForAudit(auditId: string): Promise<{
  audit: Audit | null;
  building: Building | null;
  sections: Section[];
  categories: Category[];
  subCategories: SubCategory[];
  templateElements: TemplateElement[];
  allTemplateElements: TemplateElement[];
  auditElements: AuditElement[];
  regulatories: Regulatory[];
}> {
  // Fetch audit first to get buildingId and templateVersion
  const audit = await fetchAuditById(auditId);

  if (!audit) {
    return {
      audit: null,
      building: null,
      sections: [],
      categories: [],
      subCategories: [],
      templateElements: [],
      allTemplateElements: [],
      auditElements: [],
      regulatories: [],
    };
  }

  // Parallel fetch of all related data
  const [
    building,
    sections,
    categories,
    subCategories,
    allTemplateElements,
    auditElements,
    regulatories,
    icpeTypeRefs,
  ] = await Promise.all([
    fetchBuildingById(audit.buildingId),
    fetchSectionsByVersion(audit.templateVersion),
    fetchCategoriesByVersion(audit.templateVersion),
    fetchSubCategoriesByVersion(audit.templateVersion),
    fetchAllTemplateElementsByVersion(audit.templateVersion),
    fetchAuditElementsByAuditId(auditId),
    fetchRegulatories(),
    fetchAllIcpeTypeRefs(),
  ]);

  // Filter templateElements to only those referenced by auditElements
  const templateElementIds = new Set(auditElements.map(ae => ae.templateElementId));
  const templateElements = allTemplateElements.filter(te => templateElementIds.has(te._id));

  // Resolve references for building and audit
  let resolvedBuilding = building;
  let resolvedAudit = audit;

  if (building) {
    // Fetch references in parallel
    const [portfolio, owner, technicalManager] = await Promise.all([
      fetchPortfolioById(building.portfolio),
      fetchContactById(building.owner),
      fetchContactById(building.technicalManager),
    ]);

    // Resolve ICPE types with reference data
    const resolvedIcpeTypes = (building.icpeTypes || []).map(icpeType => {
      const refData = icpeTypeRefs.get(icpeType.refId);
      if (refData) {
        return {
          ...icpeType,
          rubrique: refData.rubrique || icpeType.rubrique,
          description: refData.description || icpeType.description,
          regime: refData.regime || icpeType.regime,
          critere: refData.critere || icpeType.critere,
        };
      }
      return icpeType;
    });

    resolvedBuilding = {
      ...building,
      portfolio: portfolio?.name || building.portfolio,
      owner: owner?.name || building.owner,
      technicalManager: technicalManager
        ? (technicalManager.company
            ? `${technicalManager.name} - société ${technicalManager.company}`
            : technicalManager.name)
        : building.technicalManager,
      icpeTypes: resolvedIcpeTypes,
    };
  }

  if (audit) {
    // Resolve editor reference
    const editor = await fetchEditorById(audit.editor);
    resolvedAudit = {
      ...audit,
      editor: editor?.name || audit.editor,
    };
  }

  return {
    audit: resolvedAudit,
    building: resolvedBuilding,
    sections,
    categories,
    subCategories,
    templateElements,
    allTemplateElements,
    auditElements,
    regulatories,
  };
}
