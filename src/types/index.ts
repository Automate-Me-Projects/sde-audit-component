export interface Audit {
  id: string;
  buildingId: string;
  year: number;
  visitDate: string;
  status: string;
  editor: string;
  portfolio: string;
  templateVersion: number;
  actors: string[];
  reportDate: string;
}

export interface Building {
  name: string;
  address: string;
  siteContact: string;
  conformity: string;
  dateDerniereInspection: string;
  dateAPAPC: string;
  titularArreteePrefectoral: string;
  changementExploitant: string;
  owner: string;
  technicalManager: string;
  propertyManager: string;
  tenant: string;
  responsableSDE: string[];
  portfolio: string;
  icpeRegulations: string;
  icpeTypes: IcpeType[];
  AP?: Regulatory[];
  _id: string;
}

export interface IcpeType {
  refId: string;
  critere?: string;
  description?: string;
  regime?: string;
  rubrique?: string;
  capacity?: string;
}

export interface Section {
  name: string;
  templateVersion: readonly number[];
  position: number;
  _id: string;
}

export interface Category {
  name: string;
  templateVersion: readonly number[];
  positionByVersion: readonly number[];
  section?: string;
  _id: string;
}

export interface SubCategory {
  name: string;
  categoryId: string;
  templateVersion: readonly number[];
  positionByVersion: readonly number[];
  _id: string;
}

export interface TemplateElement {
  _id: string;
  categoryId: string;
  subCategoryId: string | null;
  isDefault: boolean;
  name: string;
  templateVersion: readonly number[];
  positionByVersion: readonly number[];
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  updatedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
}

export type ExpandedElement = TemplateElement & {
  auditElement: AuditElement | null;
};

export interface AuditElement {
  auditId: string;
  templateElementId: string;
  categoryId: string;
  subCategoryId: string| null;
  status: string| null;
  constat: string | null;
  actionType: string | null;
  actionOwner: string | null;
  action: string | null;
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  updatedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  _id: string;
}

export interface Regulatory {
  sectionId: string;
  categoryId: string;
  subCategoryId?: string;
  text: string;
  _id: string;
}

export interface ICPETableComponentProps {
  icpeTypes: IcpeType[];
  onCapacityChange: (id: string, value: string) => void;
}

export type SaveStatus = 'saved' | 'saving' | 'pending' | 'error';

export interface AuditFormProps {
  audit: Audit;
  building: Building;
  sections: Section[];
  categories: Category[];
  subCategories: SubCategory[];
  templateElements: TemplateElement[];
  allTemplateElements: TemplateElement[];
  auditElements: AuditElement[];
  regulatories: Regulatory[];
  images: S3Item[];
  files: S3Item[];
  saveStatus?: SaveStatus;
  onAuditChange?: (field: string, value: any) => void;
  onElementChange?: (elementId: string | undefined, templateElementId: string, field: string, value: any) => void;
  onElementDuplicate?: (element: ExpandedElement) => void;
  onElementDelete?: (element: ExpandedElement) => void;
  onElementAdd?: (
    name: string, 
    subCategoryId: string | null, 
    categoryId: string,
  ) => void;
  onTemplateElementAdd?: (
    _id: string,
    name: string,
    subCategoryId: string | null,
    categoryId: string,
    positionByVersion: number[],
  ) => void;
  onBuildingChange?: (refId: string | null, field: string, value: string) => void;
}

export interface AddElementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, subCategoryId: string | null, categoryId: string, position: number) => void;
  sections: Section[];
  categories: Category[];
  subCategories: SubCategory[];
  templateVersion: number;
  templateElements: TemplateElement[];
}

export interface AuditElementsProps {
  sections: Section[];
  categories: Category[];
  subCategories: SubCategory[];
  templateElements: TemplateElement[];
  auditElements: AuditElement[];
  regulatories: Regulatory[];
  templateVersion: number;
  actors: string[];
  onAuditElementChange: (elementId: string | undefined, templateElementId: string, field: string, value: string) => void;
  onElementDuplicate: (element: ExpandedElement) => void;
  onElementDelete: (element: ExpandedElement) => void;
}

export interface AuditElementRowProps {
  expandedElement: ExpandedElement;
  onElementDelete: (element: ExpandedElement) => void;
  onElementDuplicate: (element: ExpandedElement) => void;
  onAuditElementChange: (elementId: string | undefined, templateElementId: string,field: string, value: string) => void;
  actors: string[];
}

export interface ElementDropdownProps {
  sections: Section[];
  categories: Category[];
  subCategories: SubCategory[];
  templateElements: TemplateElement[];
  allTemplateElements: TemplateElement[];
  templateVersion?: number;
  onSelect: (categoryId: string, subCategoryId: string | null, name: string, position: number) => void;
}
export interface S3Item {
  name: string;
  url: string;
  key: string;
}
export interface S3Response {
  images: S3Item[];
  files: S3Item[];
}
export interface ImageGalleryProps {
  images: S3Item[];
}

export interface TableRow {
  label: string;
  value: string;
}

export interface PDFGeneratorOptions {
  building: Building;
  audit: Audit;
  sections: Section[];
  categories: Category[]; 
  subCategories: SubCategory[];
  regulatories: Regulatory[];
  infoTableRows: TableRow[];
  arretePrefectoralRows: TableRow[];
  exploitationRows: TableRow[];
  auditRows: TableRow[];
  templateElements: TemplateElement[];
  auditElements: AuditElement[];
  images: S3Item[];
  files: S3Item[];
}