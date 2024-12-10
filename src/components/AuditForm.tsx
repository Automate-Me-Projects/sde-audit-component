import React, { useState, useCallback } from 'react';
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
import { generateTempId } from '../utils';
import type { AuditFormProps, TemplateElement } from '../types';

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
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [changedElements, setChangedElements] = useState<Array<{ elementId: string; field: string; value: any }>>([]);
  const [duplicatedElements, setDuplicatedElements] = useState<Array<any>>([]);
  const [deletedElements, setDeletedElements] = useState<Array<string>>([]);

  const debouncedElementChange = useCallback(
    debounce((elementId: string, field: string, value: any) => {
      setChangedElements((prev) => [...prev, { elementId, field, value }]);
    }, 500),
    []
  );

  const handleElementChange = (elementId: string, field: string, value: any) => {
    debouncedElementChange(elementId, field, value);
  };

  const handleElementDuplicate = (element: any) => {
    setDuplicatedElements((prev) => [...prev, element]);
  };

  const handleElementDelete = (elementId: string) => {
    setDeletedElements((prev) => [...prev, elementId]);
  };

  const handleAddElement = (sectionId: string | null, categoryId: string, subCategoryId: string | null, name: string) => {
    const newElement = {
      _id: generateTempId(),
      sectionId,
      categoryId,
      subCategoryId,
      isDefault: false,
      name,
      templateVersion: [audit.templateVersion] as const,
      positionByVersion: [templateElements.length + 1] as const,
      createdAt: {
        _seconds: Math.floor(Date.now() / 1000),
        _nanoseconds: 0
      },
      updatedAt: {
        _seconds: Math.floor(Date.now() / 1000),
        _nanoseconds: 0
      }
    };

    templateElements.push(newElement);
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    // Implement PDF generation based on template version
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
              value={audit.status}
              onChange={(value) => handleElementChange(audit.id, 'status', value)}
              options={[
                'En cours de rédaction',
                'Fini',
                'En relecture',
                'En attente de documents',
                'Envoyé'
              ]}
              type="audit"
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
              onSelect={handleAddElement}
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
            { label: 'Date', value: audit?.visitDate ?? '', editable: true, onChange: (value) => handleElementChange(audit?.id ?? '', 'visitDate', value) },
            { label: 'Bâtiment', value: building?.name ?? '' },
            { label: 'Portefeuille', value: building?.portfolio ?? '' },
            { label: 'Adresse du site', value: building?.address ?? '' }
          ]}
        />

        <InfoTable
          title="Informations relatives à l&apos;arrêté préfectoral"
          rows={[
            { label: "Nom du titulaire de l&apos;arrêté préfectoral :", value: building?.titularArreteePrefectoral ?? '' },
            { label: 'Adresse du site :', value: building?.address ?? '' },
            { label: "Date de l&apos;arrêté préfectoral en vigueur et arrêté précédents :", value: building?.dateAPAPC ?? '' },
            { label: "Changement d&apos;exploitant connu :", value: building?.changementExploitant ?? '' }
          ]}
        />

        <InfoTable
          title="Informations relatives à l&apos;exploitation"
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
            { label: 'Date de visite :', value: audit?.visitDate ?? '', editable: true, onChange: (value) => handleElementChange(audit?.id ?? '', 'visitDate', value) },
            { label: "Date d&apos;émission du rapport :", value: audit?.reportDate ?? '', editable: true, onChange: (value) => handleElementChange(audit?.id ?? '', 'reportDate', value) },
            { label: 'Rédacteur :', value: audit?.editor ?? '' }
          ]}
        />

        <div className="border-t-2 border-[rgb(0,106,60)]" />

        <ICPETable
          icpeTypes={building?.icpeTypes ?? []}
          onCapacityChange={(index, value) =>
            handleElementChange(`icpe-${index}`, 'capacity', value)
          }
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
          onElementChange={handleElementChange}
          onElementDuplicate={handleElementDuplicate}
          onElementDelete={handleElementDelete}
        />

        <ImageGallery images={images} />
      </div>

      <AddElementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddElement}
        sections={sections}
        categories={categories}
        subCategories={subCategories}
        templateVersion={audit.templateVersion}
      />
    </div>
  );
};
