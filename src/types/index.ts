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
  _id: string;
}

export interface IcpeType {
  critere: string;
  description: string;
  regime: string;
  rubrique: string;
  capacity: string;
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
  sectionId: string | null;
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

export interface AuditElement {
  auditId: string;
  templateElementId: string;
  categoryId: string;
  subCategoryId: string;
  status: string;
  constat: string;
  actionType: string | null;
  actionOwner: string | null;
  action: string | null;
  createdAt: string;
  updatedAt: string;
  _id: string;
  name: string;
  positionByVersion: readonly number[];
}

export interface Regulatory {
  sectionId: string;
  categoryId: string;
  subCategoryId?: string;
  text: string;
  _id: string;
}

export interface Image {
  id: string;
  name: string;
  isPublic: boolean;
  type: string;
  url: string;
  folderName: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface ElementChange {
  elementId: string;
  field: string;
  value: any;
}

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
  images: Image[];
  onElementChange?: (elementId: string, field: string, value: any) => void;
  onElementDuplicate?: (element: TemplateElement) => void;
  onElementDelete?: (elementId: string) => void;
  onElementAdd?: (sectionId: string | null, categoryId: string, subCategoryId: string | null, name: string, position: number) => void;
  onTemplateElementAdd?: (data: {
    categoryId: string;
    subCategoryId: string | null;
    name: string;
    positionByVersion: number[];
    templateVersion: number[];
  }) => void;
}