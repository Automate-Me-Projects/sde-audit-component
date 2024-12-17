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
  onElementChange,
  onElementDuplicate,
  onElementDelete,
  onElementAdd,
  onTemplateElementAdd
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [changedElements, setChangedElements] = useState<Array<{ elementId: string; field: string; value: any }>>([]);
  const [duplicatedElements, setDuplicatedElements] = useState<Array<any>>([]);
  const [deletedElements, setDeletedElements] = useState<Array<string>>([]);
  const [templateVersion, setTemplateVersion] = useState(audit.templateVersion);

  const debouncedElementChange = useCallback(
    debounce((elementId: string, field: string, value: any) => {
      handleElementChange(elementId, field, value);
    }, 500),
    []
  );

  const handleElementChange = (elementId: string, field: string, value: any) => {
    if (onElementChange) {
      onElementChange(elementId, field, value);
    }

    const newChangedElements = [...changedElements, { elementId, field, value }];
    setChangedElements(newChangedElements);
  };

  const handleElementDuplicate = (element: any) => {
    if (onElementDuplicate) {
      onElementDuplicate(element);
    }

    const newDuplicatedElements = [...duplicatedElements, element];
    setDuplicatedElements(newDuplicatedElements);
  };

  const handleElementDelete = (elementId: string) => {
    if (onElementDelete) {
      onElementDelete(elementId);
    }

    const newDeletedElements = [...deletedElements, elementId];
    setDeletedElements(newDeletedElements);
  };

  useEffect(() => {
    console.log('AuditForm - templateElements updated:', JSON.stringify({
      length: templateElements.length,
      sample: templateElements.slice(0, 2),
      timestamp: new Date().toISOString()
    }, null, 2));
  }, [templateElements]);

  const handleElementAdd = (sectionId: string | null, categoryId: string, subCategoryId: string | null, name: string, position: number) => {
    console.log('🔍 AuditForm handleElementAdd - Raw input:', {
      sectionId,
      categoryId,
      subCategoryId,
      name,
      position,
      onTemplateElementAdd: !!onTemplateElementAdd,
      onElementAdd: !!onElementAdd
    });

    // Validate required fields
    if (!categoryId) {
      console.error('🚨 AuditForm handleElementAdd - Missing categoryId');
      return;
    }

    // Create new template element with required fields
    if (onTemplateElementAdd) {
      // Prepare data for Retool
      const retoolData = {
        categoryId,
        subCategoryId,
        name,
        positionByVersion: [position],
        templateVersion: [audit.templateVersion]
      };

      console.log('🔍 AuditForm - Data for Retool:', {
        data: retoolData,
        validation: {
          categoryId: {
            value: retoolData.categoryId,
            type: typeof retoolData.categoryId
          },
          subCategoryId: {
            value: retoolData.subCategoryId,
            type: typeof retoolData.subCategoryId
          },
          name: {
            value: retoolData.name,
            type: typeof retoolData.name
          },
          positionByVersion: {
            value: retoolData.positionByVersion,
            type: typeof retoolData.positionByVersion,
            isArray: Array.isArray(retoolData.positionByVersion)
          },
          templateVersion: {
            value: retoolData.templateVersion,
            type: typeof retoolData.templateVersion,
            isArray: Array.isArray(retoolData.templateVersion)
          }
        }
      });

      onTemplateElementAdd(retoolData);
    }

    // Call existing onElementAdd for backward compatibility
    if (onElementAdd) {
      const elementData = {
        name,
        categoryId,
        subCategoryId,
        positionByVersion: [position],
        templateVersion: [audit.templateVersion]
      };

      console.log('🔍 AuditForm - Calling onElementAdd with elementData:', elementData);
      // Send the data directly without nesting
      onElementAdd(elementData);
    }
  };

  React.useEffect(() => {
    console.log('AuditForm templateElements changed:', JSON.stringify({
      length: templateElements.length,
      timestamp: new Date().toISOString()
    }, null, 2));
  }, [templateElements]);

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
              onChange={(value) => handleElementChange(audit?.id ?? '', 'status', value)}
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
              onSelect={handleElementAdd}
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
            { label: 'Date de visite :', value: audit?.visitDate ?? '', editable: true, onChange: (value) => handleElementChange(audit?.id ?? '', 'visitDate', value) },
            { label: "Date d'émission du rapport :", value: audit?.reportDate ?? '', editable: true, onChange: (value) => handleElementChange(audit?.id ?? '', 'reportDate', value) },
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
          onElementAdd={handleElementAdd}
        />

        <ImageGallery images={images} />
      </div>

      <AddElementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleElementAdd}
        sections={sections}
        categories={categories}
        subCategories={subCategories}
        templateVersion={audit?.templateVersion || 1}
        templateElements={templateElements}
      />
    </div>
  );
};