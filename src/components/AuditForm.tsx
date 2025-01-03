import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Eye, ArrowDownToLine } from 'lucide-react';
import { StatusDropdown } from './StatusDropdown';
import { ElementDropdown } from './ElementDropdown';
import { AddElementModal } from './AddElementModal';
import { InfoTable } from './InfoTable';
import { ICPETable } from './ICPETable';
import { AuditElements } from './AuditElements';
import ImageGallery from './ImageGallery';
import { generateTempId, formatDateToFrench, formatDate } from '../utils';
import { generateAuditPDF } from '../utils/pdfGenerator';
import type { AuditFormProps, ExpandedElement, Image } from '../types';

const AuditFormComponent = React.memo(({
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
  onICPEBuildingChange,
  onDeleteImage
}: AuditFormProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAuditDataChange = useCallback((field: string, value: string) => {
    if (onAuditChange) {
      onAuditChange(field, value);
    }
  }, [onAuditChange]);

  // Memoize complex data structures
  const statusOptions = useMemo(() => [
    'En cours de rédaction',
    'Fini',
    'En relecture',
    'En attente de documents',
    'Envoyé'
  ], []);

  const infoTableRows = useMemo(() => [
    { label: 'Date', value: formatDate(audit?.visitDate), editable: false },
    { label: 'Bâtiment', value: building?.name ?? '' },
    { label: 'Portefeuille', value: building?.portfolio ?? '' },
    { label: 'Adresse du site', value: building?.address ?? '' }
  ], [audit?.visitDate, building?.name, building?.portfolio, building?.address]);

  const arretePrefectoralRows = useMemo(() => [
    { label: "Nom du titulaire de l'arrêté préfectoral :", value: building?.titularArreteePrefectoral ?? '' },
    { label: 'Adresse du site :', value: building?.address ?? '' },
    { label: "Date de l'arrêté préfectoral en vigueur et arrêté précédents :", value: building?.dateAPAPC ?? '' },
    { label: "Changement d'exploitant connu :", value: building?.changementExploitant ?? '' }
  ], [building?.titularArreteePrefectoral, building?.address, building?.dateAPAPC, building?.changementExploitant]);

  const exploitationRows = useMemo(() => [
    { label: 'Propriétaire :', value: building?.owner ?? '' },
    { label: 'Locataire du bâtiment :', value: building?.tenant ?? '' },
    { label: 'Gestionnaire technique :', value: building?.technicalManager ?? '' },
    { label: 'Date de la dernière inspection :', value: building?.dateDerniereInspection ?? '' },
    { label: 'Contact sur site :', value: building?.siteContact ?? '' }
  ], [building?.owner, building?.tenant, building?.technicalManager, building?.dateDerniereInspection, building?.siteContact]);

  const auditRows = useMemo(() => [
    { 
      label: 'Date de visite :', 
      value: formatDateToFrench(audit?.visitDate) ?? '', 
      displayValue: audit?.visitDate ?? '', 
      editable: true, 
      onChange: (value: string) => handleAuditDataChange('visitDate', value) 
    },
    { 
      label: "Date d'émission du rapport :", 
      value: formatDateToFrench(audit?.reportDate) ?? '', 
      displayValue: audit?.reportDate ?? '', 
      editable: true, 
      onChange: (value: string) => handleAuditDataChange('reportDate', value) 
    },
    { 
      label: 'Rédacteur :', 
      value: audit?.editor ?? '' 
    }
  ], [audit?.visitDate, audit?.reportDate, audit?.editor, handleAuditDataChange]);

  const handleAuditElementChange = useCallback((elementId: string, field: string, value: string) => {
    if (onElementChange) {
      onElementChange(elementId, field, value);
    }
  }, [onElementChange]);

  const handleAuditElementAdd = useCallback((
    categoryId: string,
    subCategoryId: string | null,
    name: string,
  ) => {
    if (onElementAdd) {
      onElementAdd(name, subCategoryId, categoryId);
    }
  }, [onElementAdd]);

  const handleElementDelete = useCallback((element: ExpandedElement) => {
    if (onElementDelete) {
      onElementDelete(element);
    }
  }, [onElementDelete]);

  const handleElementDuplicate = useCallback((element: ExpandedElement) => {
    if (onElementDuplicate) {
      onElementDuplicate(element);
    }
  }, [onElementDuplicate]);

  const handleNewElementAdd = useCallback((
    categoryId: string,
    subCategoryId: string | null,
    name: string,
    position: number
  ) => {
    if (onTemplateElementAdd) {
      onTemplateElementAdd(generateTempId(), name, subCategoryId, categoryId, [position]);
    }
    setIsModalOpen(false);
  }, [onTemplateElementAdd]);

  const handleGeneratePDF = useCallback(async () => {
    try {
      const doc = await generateAuditPDF({
        building,
        audit,
        sections,
        categories,
        subCategories,
        regulatories,
        infoTableRows,
        arretePrefectoralRows,
        exploitationRows,
        auditRows,
        templateElements,
        auditElements,
        images
      });
      doc.save(`audit-${building.name}-${audit.year}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Add appropriate error handling here
    }
  }, [building, audit, sections, categories, subCategories, regulatories, infoTableRows, arretePrefectoralRows, exploitationRows, auditRows, templateElements, auditElements, images]);

  const handleVisualizePDF = useCallback(async () => {
    try {
      const doc = await generateAuditPDF({
        building,
        audit,
        sections,
        categories,
        subCategories,
        regulatories,
        infoTableRows,
        arretePrefectoralRows,
        exploitationRows,
        auditRows,
        templateElements,
        auditElements,
        images
      });
      const pdfBlob = new Blob([doc.output('blob')], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
      // Clean up the blob URL after opening
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Add appropriate error handling here
    }
  }, [building, audit, sections, categories, subCategories, regulatories, infoTableRows, arretePrefectoralRows, exploitationRows, auditRows, templateElements, auditElements, images]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-0 left-0 right-0 bg-[#e8fbd3] p-4 z-50 shadow-md">
        <h1 className="text-[rgb(146,208,80)] text-2xl font-bold mb-4">
          {building.name} - {audit.year}
        </h1>
        <div className="flex space-x-4 items-center">
          <div className="w-64">
            <StatusDropdown
              value={audit?.status || ''}
              onChange={(value) => handleAuditDataChange('status', value)}
              options={statusOptions}
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
            onClick={useCallback(() => setIsModalOpen(true), [])}
            className="p-2 text-green-600 hover:text-green-700"
          >
            <Plus className="h-6 w-6" />
          </button>
          <button
            onClick={handleVisualizePDF}
            className="px-4 py-2 bg-sde-green text-white rounded hover:bg-sde-green/90 flex items-center gap-3"
          >
            <Eye className="h-5 w-5" />
            PDF
          </button>
          <button
            onClick={handleGeneratePDF}
            className="px-4 py-2 bg-sde-green text-white rounded hover:bg-sde-green/90 flex items-center gap-3"
          >
            <ArrowDownToLine className="h-5 w-5" />
            PDF
          </button>
        </div>
      </div>

      <div className="pt-32 px-6 pb-8 w-full space-y-8">
        <InfoTable rows={infoTableRows} />

        <InfoTable
          title="Informations relatives à l'arrêté préfectoral"
          rows={arretePrefectoralRows}
        />

        <InfoTable
          title="Informations relatives à l'exploitation"
          rows={exploitationRows}
        />

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-[rgb(0,106,60)] font-medium mb-2">
            Réglementation ICPE applicable
          </h3>
          <div className="whitespace-pre-line">{building?.icpeRegulations ?? ''}</div>
        </div>

        <InfoTable rows={auditRows} />

        <div className="border-t-2 border-[rgb(0,106,60)]" />

        <ICPETable
          icpeTypes={building?.icpeTypes ?? []}
          onCapacityChange={useCallback((id: string, value: string) => {
            if (onICPEBuildingChange) {
              onICPEBuildingChange(id, 'capacity', value);
            }
          }, [onICPEBuildingChange])}
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
        onClose={useCallback(() => setIsModalOpen(false), [])}
        onAdd={handleNewElementAdd}
        sections={sections}
        categories={categories}
        subCategories={subCategories}
        templateVersion={audit.templateVersion}
        templateElements={templateElements}
      />
    </div>
  );
});

AuditFormComponent.displayName = 'AuditForm';

export const AuditForm = AuditFormComponent;