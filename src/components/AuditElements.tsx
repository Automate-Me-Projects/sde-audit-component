import React from 'react';
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
import { sortByPosition } from '../utils';

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
}) => {
  const renderRegulatory = (sectionId: string, categoryId: string, subCategoryId?: string) => {
    const regulatory = regulatories.find(
      r =>
        r.sectionId === sectionId &&
        r.categoryId === categoryId &&
        r.subCategoryId === subCategoryId
    );

    if (!regulatory) return null;

    return (
      <div className="bg-gray-100 p-4 my-2 italic text-black">
        {regulatory.text}
      </div>
    );
  };

  const renderElements = () => {
    if (templateVersion === 2) {
      return sortByPosition(sections, templateVersion).map((section) => {
        const sectionCategories = sortByPosition(
          categories.filter((c) => c.section === section._id),
          templateVersion
        );

        if (sectionCategories.length === 0) return null;

        return (
          <div key={section._id} className="w-full mb-8">
            <h2 className="text-xl font-bold mb-4">{section.name}</h2>
            {sectionCategories.map((category) => renderCategory(category, section._id))}
          </div>
        );
      });
    }

    return sortByPosition(categories, templateVersion).map((category) =>
      renderCategory(category)
    );
  };

  const renderCategory = (category: Category, sectionId?: string) => {
    const categorySubCategories = sortByPosition(
      subCategories.filter((s) => s.categoryId === category._id),
      templateVersion
    );

    if (categorySubCategories.length === 0) return null;

    return (
      <div key={category._id} className="w-full mb-6">
        <h3 className="text-lg font-semibold mb-3">{category.name}</h3>
        {sectionId && renderRegulatory(sectionId, category._id)}
        {categorySubCategories.map((subCategory) =>
          renderSubCategory(subCategory, sectionId)
        )}
      </div>
    );
  };

  const renderSubCategory = (subCategory: SubCategory, sectionId?: string) => {
    const subCategoryElements = sortByPosition(
      templateElements.filter((t) => t.subCategoryId === subCategory._id),
      templateVersion
    );

    if (subCategoryElements.length === 0) return null;

    return (
      <div key={subCategory._id} className="w-full mb-4">
        <h4 className="text-md font-medium mb-2">{subCategory.name}</h4>
        {sectionId && renderRegulatory(sectionId, subCategory.categoryId, subCategory._id)}
        <div className="w-full space-y-6">
          {subCategoryElements.map((element) => {
            const auditElement = auditElements.find(
              (ae) => ae.templateElementId === element._id
            );

            return (
              <div
                key={element._id}
                className="grid grid-cols-7 gap-4 items-center mb-2 p-2 bg-white rounded-lg shadow-sm w-full"
              >
                <div className="flex space-x-2">
                  <button
                    onClick={() => onElementDelete(element._id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onElementDuplicate(element)}
                    className="text-green-500 hover:text-green-700"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
                <div className="text-sm">{element.name}</div>
                <textarea
                  value={auditElement?.constat || ''}
                  onChange={(e) =>
                    onElementChange(element._id, 'constat', e.target.value)
                  }
                  className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                <StatusDropdown
                  value={auditElement?.status || ''}
                  onChange={(value) => onElementChange(element._id, 'status', value)}
                  options={[
                    'Conforme',
                    'Non conforme',
                    'Observation',
                    'Sans objet',
                    'Pour information',
                  ]}
                />
                <select
                  value={auditElement?.actionType || ''}
                  onChange={(e) =>
                    onElementChange(element._id, 'actionType', e.target.value)
                  }
                  className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <textarea
                  value={auditElement?.action || ''}
                  onChange={(e) =>
                    onElementChange(element._id, 'action', e.target.value)
                  }
                  className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                <select
                  value={auditElement?.actionOwner || ''}
                  onChange={(e) =>
                    onElementChange(element._id, 'actionOwner', e.target.value)
                  }
                  className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Acteur</option>
                  {actors.map((actor) => (
                    <option key={actor} value={actor}>
                      {actor}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-8">
      {renderElements()}
    </div>
  );
};
