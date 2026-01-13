import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuditForm } from '../components/AuditForm';
import { useAuditData } from '../hooks/useAuditData';
import { Loader2 } from 'lucide-react';

export function AuditPage() {
  const [searchParams] = useSearchParams();
  const auditId = searchParams.get('id');

  const {
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
    loading,
    error,
    saveStatus,
    handleAuditChange,
    handleAuditElementAdd,
    handleAuditElementChange,
    handleAuditElementDelete,
    handleElementDuplicate,
    handleTemplateElementAdd,
    handleBuildingChange,
  } = useAuditData(auditId);

  // Stable key for AuditForm re-render optimization
  const dataVersion = useMemo(() => {
    const auditElementsIds = (auditElements || []).map(ae => ae._id).sort().join(',');
    const templateElementsIds = (templateElements || []).map(te => te._id).sort().join(',');
    return `${auditElementsIds}-${templateElementsIds}`;
  }, [auditElements, templateElements]);

  // No audit ID provided
  if (!auditId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">ID d'audit manquant</h1>
          <p className="text-gray-600 mb-4">
            Veuillez fournir un ID d'audit dans l'URL.
          </p>
          <p className="text-sm text-gray-500">
            Format attendu : <code className="bg-gray-100 px-2 py-1 rounded">/audit?id=votre-id</code>
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-sde-green mx-auto mb-4" />
          <p className="text-gray-600">Chargement de l'audit...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur</h1>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-sde-green text-white px-4 py-2 rounded hover:bg-opacity-90 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Audit not found
  if (!audit || !building) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Audit introuvable</h1>
          <p className="text-gray-600 mb-4">
            L'audit avec l'ID <code className="bg-gray-100 px-2 py-1 rounded">{auditId}</code> n'existe pas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <AuditForm
        key={dataVersion}
        audit={audit}
        building={building}
        sections={sections}
        categories={categories}
        subCategories={subCategories}
        templateElements={templateElements}
        allTemplateElements={allTemplateElements}
        auditElements={auditElements}
        regulatories={regulatories}
        images={images}
        files={files}
        saveStatus={saveStatus}
        onAuditChange={handleAuditChange}
        onElementAdd={handleAuditElementAdd}
        onElementChange={handleAuditElementChange}
        onElementDelete={handleAuditElementDelete}
        onElementDuplicate={handleElementDuplicate}
        onTemplateElementAdd={handleTemplateElementAdd}
        onBuildingChange={handleBuildingChange}
      />
    </div>
  );
}
