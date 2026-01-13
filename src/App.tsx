import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuditPage } from './pages/AuditPage';
import { OfflineProvider } from './context/OfflineContext';

function App() {
  return (
    <OfflineProvider>
      <Routes>
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/" element={<Navigate to="/audit" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </OfflineProvider>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-gray-600">Page non trouvée</p>
        <p className="text-sm text-gray-500 mt-2">
          Utilisez une URL avec un ID d'audit : <code>/audit?id=xxx</code>
        </p>
      </div>
    </div>
  );
}

export default App;
