import React, { useState, useCallback, useEffect } from 'react';
import { Plus } from 'lucide-react';
import debounce from 'lodash/debounce';
import { jsPDF } from 'jspdf';
import { StatusDropdown } from './StatusDropdown';
import { ElementDropdown } from './ElementDropdown';
import { AddElementModal } from './AddElementModal';
import { InfoTable } from './InfoTable';
import { ICPETable } from './ICPETable';
import { AuditElements } from './AuditElements';
import { ImageGallery } from './ImageGallery';
import { generateTempId, formatDate } from '../utils';
import type { AuditFormProps, ExpandedElement } from '../types';

export const AuditForm: React.FC<AuditFormProps> = ({
  audit,
  building,
  sections,
  categories,
  subCategories,
  templateElements,
  allTemplateElements,
  auditElements,
  regulatories,
  images,
  onAuditChange,
  onElementAdd,
  onElementChange,
  onElementDelete,
  onElementDuplicate,
  onTemplateElementAdd,
  onICPEBuildingChange
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAuditDataChange = (field: string, value: any) => {
    if (onAuditChange) {
      onAuditChange(field, value);
    }
  };

  const handleAuditElementAdd = (
    categoryId: string,
    subCategoryId: string | null,
    name: string,
  ) => {
    if (onElementAdd) {
      onElementAdd(name, subCategoryId, categoryId);
    }
  };

  const handleElementChange = (elementId: string, field: string, value: any) => {
    if (onElementChange) {
      onElementChange(elementId, field, value);
    }
  };

  const debouncedAuditElementChange = useCallback(
    debounce((elementId: string, field: string, value: any) => {
      handleElementChange(elementId, field, value);
    }, 1000),
    []
  );

  const handleAuditElementChange = (elementId: string, field: string, value: string) => {
    debouncedAuditElementChange(elementId, field, value);
  };

  const handleElementDelete = (element: ExpandedElement) => {
    if (onElementDelete) {
      onElementDelete(element);
    }
  };

  const handleElementDuplicate = (element: ExpandedElement) => {
    if (onElementDuplicate) {
      onElementDuplicate(element);
    }
  };

  const handleNewElementAdd = (
    categoryId: string,
    subCategoryId: string | null,
    name: string,
    position: number) => {

    if (onTemplateElementAdd) {
      onTemplateElementAdd(generateTempId(), name, subCategoryId, categoryId, [position]);
    }
    setIsModalOpen(false);
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    doc.save(`audit-${building.name}-${audit.year}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-[#e8fbd3] p-4 z-50 shadow-md">
        <h1 className="text-[rgb(146,208,80)] text-2xl font-bold mb-4">
          {building.name} - {audit.year}
        </h1>
        <div className="flex space-x-4 items-center">
          <div className="w-64">
            <StatusDropdown
              value={audit?.status || ''}
              onChange={(value) => handleAuditDataChange('status', value)}
              options={[
                'En cours de rédaction',
                'Fini',
                'En relecture',
                'En attente de documents',
                'Envoyé'
              ]}
            />
          </div>
          <div className="flex-1">
            <ElementDropdown
              sections={sections}
              categories={categories}
              subCategories={subCategories}
              templateElements={templateElements}
              allTemplateElements={allTemplateElements}
              templateVersion={audit.templateVersion}
              onSelect={handleAuditElementAdd}
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 text-green-600 hover:text-green-700"
          >
            <Plus className="h-6 w-6" />
          </button>
          <button
            onClick={handleGeneratePDF}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Générer PDF
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-32 px-6 pb-8 w-full space-y-8">
        <InfoTable
          rows={[
            { label: 'Date', value: formatDate(audit?.visitDate), editable: false },
            { label: 'Bâtiment', value: building?.name ?? '' },
            { label: 'Portefeuille', value: building?.portfolio ?? '' },
            { label: 'Adresse du site', value: building?.address ?? '' }
          ]}
        />

        <InfoTable
          title="Informations relatives à l'arrêté préfectoral"
          rows={[
            { label: "Nom du titulaire de l'arrêté préfectoral :", value: building?.titularArreteePrefectoral ?? '' },
            { label: 'Adresse du site :', value: building?.address ?? '' },
            { label: "Date de l'arrêté préfectoral en vigueur et arrêté précédents :", value: building?.dateAPAPC ?? '' },
            { label: "Changement d'exploitant connu :", value: building?.changementExploitant ?? '' }
          ]}
        />

        <InfoTable
          title="Informations relatives à l'exploitation"
          rows={[
            { label: 'Propriétaire :', value: building?.owner ?? '' },
            { label: 'Locataire du bâtiment :', value: building?.tenant ?? '' },
            { label: 'Gestionnaire technique :', value: building?.technicalManager ?? '' },
            { label: 'Date de la dernière inspection :', value: building?.dateDerniereInspection ?? '' },
            { label: 'Contact sur site :', value: building?.siteContact ?? '' }
          ]}
        />

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-[rgb(0,106,60)] font-medium mb-2">
            Réglementation ICPE applicable
          </h3>
          <div className="whitespace-pre-line">{building?.icpeRegulations ?? ''}</div>
        </div>

        <InfoTable
          rows={[
            { label: 'Date de visite :', value: audit?.visitDate ?? '', editable: true, onChange: (value) => handleAuditDataChange('visitDate', value) },
            { label: "Date d'émission du rapport :", value: audit?.reportDate ?? '', editable: true, onChange: (value) => handleAuditDataChange('reportDate', value) },
            { label: 'Rédacteur :', value: audit?.editor ?? '' }
          ]}
        />

        <div className="border-t-2 border-[rgb(0,106,60)]" />

        <ICPETable
          icpeTypes={building?.icpeTypes ?? []}
          onCapacityChange={(id, value) => {
            if (onICPEBuildingChange) {
              onICPEBuildingChange(id, 'capacity', value);
            }
          }}
        />

        <div className="border-t-2 border-[rgb(0,106,60)]" />

        <AuditElements
          sections={sections}
          categories={categories}
          subCategories={subCategories}
          templateElements={templateElements}
          auditElements={auditElements}
          regulatories={regulatories}
          templateVersion={audit.templateVersion}
          actors={audit.actors}
          onAuditElementChange={handleAuditElementChange}
          onElementDuplicate={handleElementDuplicate}
          onElementDelete={handleElementDelete}
        />

        <ImageGallery images={images} />
      </div>

      <AddElementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleNewElementAdd}
        sections={sections}
        categories={categories}
        subCategories={subCategories}
        templateVersion={audit.templateVersion}
        templateElements={templateElements}
      />
    </div>
  );
};