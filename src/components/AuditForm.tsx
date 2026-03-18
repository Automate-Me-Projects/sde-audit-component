import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Plus, Eye, ArrowDownToLine, Loader2 } from 'lucide-react';
import { StatusDropdown } from './StatusDropdown';
import { ElementDropdown } from './ElementDropdown';
import { AddElementModal } from './AddElementModal';
import { InfoTable } from './InfoTable';
import { ICPETable } from './ICPETable';
import { AuditElements } from './AuditElements';
import { SaveIndicator } from './SaveIndicator';
import ImageGallery from './ImageGallery';
import { generateTempId, formatDateToFrench, formatDate, toISODateString } from '../utils';
import { generateAuditPDF } from '../pdfGenerator';
import type { AuditFormProps, ExpandedElement } from '../types';

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
  files,
  saveStatus,
  onAuditChange,
  onElementAdd,
  onElementChange,
  onElementDelete,
  onElementDuplicate,
  onTemplateElementAdd,
  onBuildingChange,
}: AuditFormProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localIcpeRegulations, setLocalIcpeRegulations] = useState(building?.icpeRegulations ?? '');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(200, textarea.scrollHeight)}px`;
    }
  }, []);

  useEffect(() => {
    setLocalIcpeRegulations(building?.icpeRegulations ?? '');
    // Adjust height after content is updated
    setTimeout(adjustTextareaHeight, 0);
  }, [building?.icpeRegulations, adjustTextareaHeight]);

  const handleAuditDataChange = useCallback((field: string, value: string) => {
    if (onAuditChange) {
      onAuditChange(field, value);
    }
  }, [onAuditChange]);

  const handleIcpeRegulationsChange = useCallback((value: string) => {
    setLocalIcpeRegulations(value);
    // Adjust height when content changes
    setTimeout(adjustTextareaHeight, 0);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onBuildingChange?.(null, 'icpeRegulations', value);
    }, 1000);
  }, [onBuildingChange, adjustTextareaHeight]);

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
    { label: 'Contact sur site :', value: building?.siteContact ?? '' },
    { label: 'Attestation de conformité :', value: building?.conformity ?? ''}
  ], [building?.owner, building?.tenant, building?.technicalManager, building?.dateDerniereInspection, building?.siteContact, building?.conformity]);

  const auditRows = useMemo(() => [
    {
      label: 'Date de visite :',
      value: formatDateToFrench(audit?.visitDate) ?? '',
      displayValue: toISODateString(audit?.visitDate),
      editable: true,
      onChange: (value: string) => handleAuditDataChange('visitDate', value)
    },
    {
      label: "Date d'émission du rapport :",
      value: formatDateToFrench(audit?.reportDate) ?? '',
      displayValue: toISODateString(audit?.reportDate),
      editable: true,
      onChange: (value: string) => handleAuditDataChange('reportDate', value)
    },
    {
      label: 'Rédacteur :',
      value: audit?.editor ?? ''
    }
  ], [audit?.visitDate, audit?.reportDate, audit?.editor, handleAuditDataChange]);

  const handleAuditElementChange = useCallback((elementId: string | undefined, templateElementId: string, field: string, value: string) => {
    if (onElementChange) {
      onElementChange(elementId, templateElementId, field, value);
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

  const handleVisualizePDF = async () => {
    try {
      setIsVisualizing(true);
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
        images,
        files
      });
      const pdfBlob = new Blob([doc.output('blob')], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
      // Clean up the blob URL after opening
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsVisualizing(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setIsGenerating(true);
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
        images,
        files
      });
      doc.save(`audit-${building.name}-${audit.year}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 absolute inset-0">
      <style>
        {`
          .spinner {
            animation: rotate 1s linear infinite;
          }
          @keyframes rotate {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
      <div className="fixed top-0 left-0 right-0 bg-[#e8fbd3] px-3 py-2 sm:px-6 sm:py-4 z-50 shadow-md">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <h1 className="text-[rgb(146,208,80)] text-lg sm:text-2xl font-bold truncate">
            {building.name} - {audit.year}
          </h1>
          {saveStatus && <SaveIndicator status={saveStatus} />}
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
          <div className="w-full sm:w-48 lg:w-64 order-1">
            <StatusDropdown
              value={audit?.status || ''}
              onChange={(value) => handleAuditDataChange('status', value)}
              options={statusOptions}
            />
          </div>
          <div className="flex-1 min-w-[200px] order-3 sm:order-2">
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
          <div className="flex items-center gap-2 order-2 sm:order-3">
            <button
              onClick={useCallback(() => setIsModalOpen(true), [])}
              className="p-2 text-green-600 hover:text-green-700"
            >
              <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button
              onClick={handleVisualizePDF}
              disabled={isVisualizing}
              className="px-2 sm:px-4 py-2 bg-sde-green text-white rounded hover:bg-sde-green/90 disabled:bg-sde-green/50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-3 text-sm sm:text-base"
            >
              {isVisualizing ? (
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 spinner" />
              ) : (
                <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="px-2 sm:px-4 py-2 bg-sde-green text-white rounded hover:bg-sde-green/90 disabled:bg-sde-green/50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-3 text-sm sm:text-base"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 spinner" />
              ) : (
                <ArrowDownToLine className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="pt-28 sm:pt-32 px-3 sm:px-6 pb-8 w-full max-w-full mx-auto space-y-4 sm:space-y-8">
        <InfoTable rows={infoTableRows} />

        <InfoTable
          title="INFORMATIONS RELATIVES À L'ARRÊTÉ PRÉFECTORAL"
          rows={arretePrefectoralRows}
        />

        <InfoTable
          title="INFORMATIONS RELATIVES À L'EXPLOITATION"
          rows={exploitationRows}
        />

        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <h3 className="text-[rgb(0,106,60)] font-medium mb-2 text-sm sm:text-base">
          DESCRIPTIF DU DÉROULÉ DE L&apos;AUDIT
          </h3>
          <textarea
            ref={textareaRef}
            className="w-full whitespace-pre-line min-h-[150px] sm:min-h-[200px] p-2 border rounded text-sm sm:text-base"
            value={localIcpeRegulations}
            onChange={(e) => handleIcpeRegulationsChange(e.target.value)}
          />
        </div>

        <InfoTable rows={auditRows} />

        <div className="border-t-2 border-[rgb(0,106,60)]" />

        <ICPETable
          icpeTypes={building?.icpeTypes ?? []}
          onCapacityChange={useCallback((id: string, value: string) => {
            if (onBuildingChange) {
              onBuildingChange(id, 'capacity', value);
            }
          }, [onBuildingChange])}
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