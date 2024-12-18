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
import type { AuditFormProps, TemplateElement, ElementChange } from '../types';

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
  onAuditElementChange,
  onAuditElementAdd,
  onAuditElementDelete,
  onTemplateElementAdd
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateVersion, setTemplateVersion] = useState(audit.templateVersion);

  // Helper function to generate a temporary ID
  const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleAuditElementChange = useCallback(
    debounce((data: ElementChange) => {
      if (onAuditElementChange) {
        onAuditElementChange(data);
      }
    }, 500),
    [onAuditElementChange]
  );

  const handleElementDuplicate = async (element: TemplateElement) => {
    console.log('🔄 Duplicating element:', {
      element,
      currentAuditElements: Array.isArray(auditElements) ? auditElements.length : 0
    });
    
    // When duplicating, we create a new audit element with the same values
    const existingAuditElement = Array.isArray(auditElements) ? 
      auditElements.find(ae => ae.templateElementId === element._id) : 
      undefined;
    
    console.log('🔍 Found existing audit element:', existingAuditElement);
    
    const newAuditElement: ElementChange = {
      templateElementId: element._id,
      categoryId: element.categoryId,
      subCategoryId: element.subCategoryId || null,
      constat: existingAuditElement?.constat || '',
      status: existingAuditElement?.status || '',
      actionType: existingAuditElement?.actionType || null,
      action: existingAuditElement?.action || null,
      actionOwner: existingAuditElement?.actionOwner || null,
      auditId: audit.id
    };

    console.log('📝 Creating new audit element:', newAuditElement);
    
    try {
      if (onAuditElementAdd) {
        console.log('⏳ Calling onAuditElementAdd with:', newAuditElement);
        await onAuditElementAdd(newAuditElement);
        console.log('✅ Successfully called onAuditElementAdd');
      } else {
        console.warn('⚠️ onAuditElementAdd is not defined');
      }
    } catch (error) {
      console.error('❌ Error duplicating audit element:', error);
    }
  };

  useEffect(() => {
    console.log('🔄 AuditForm - auditElements prop changed:', {
      isArray: Array.isArray(auditElements),
      length: Array.isArray(auditElements) ? auditElements.length : 0,
      elements: auditElements
    });
  }, [auditElements]);

  useEffect(() => {
    console.log('🔄 AuditForm - templateVersion state changed:', templateVersion);
  }, [templateVersion]);

  useEffect(() => {
    console.log('🔄 AuditForm - isModalOpen state changed:', isModalOpen);
  }, [isModalOpen]);

  const handleElementAdd = (sectionId: string | null, categoryId: string, subCategoryId: string | null, name: string, position: number) => {
    console.log('🔍 AuditForm handleElementAdd - Raw input:', {
      sectionId,
      categoryId,
      subCategoryId,
      name,
      position,
      onTemplateElementAdd: !!onTemplateElementAdd
    });

    // Create new template element with required fields
    if (onTemplateElementAdd) {
      // Prepare data for Retool
      const retoolData = {
        _id: generateTempId(),
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
          }
        }
      });

      onTemplateElementAdd(retoolData);
    }
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
              onChange={(value) => handleAuditElementChange({ templateElementId: audit?.id ?? '', field: 'status', value })}
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
            { label: 'Date', value: audit?.visitDate ?? '', editable: true, onChange: (value) => handleAuditElementChange({ templateElementId: audit?.id ?? '', field: 'visitDate', value }) },
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
            { label: 'Date de visite :', value: audit?.visitDate ?? '', editable: true, onChange: (value) => handleAuditElementChange({ templateElementId: audit?.id ?? '', field: 'visitDate', value }) },
            { label: "Date d'émission du rapport :", value: audit?.reportDate ?? '', editable: true, onChange: (value) => handleAuditElementChange({ templateElementId: audit?.id ?? '', field: 'reportDate', value }) },
            { label: 'Rédacteur :', value: audit?.editor ?? '' }
          ]}
        />

        <div className="border-t-2 border-[rgb(0,106,60)]" />

        <ICPETable
          icpeTypes={building?.icpeTypes ?? []}
          onCapacityChange={(index, value) =>
            handleAuditElementChange({ templateElementId: `icpe-${index}`, field: 'capacity', value })
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
          onElementChange={handleAuditElementChange}
          onElementDuplicate={handleElementDuplicate}
          onElementDelete={onAuditElementDelete}
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