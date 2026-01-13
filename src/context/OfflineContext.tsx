import React, { createContext, useContext, ReactNode } from 'react';
import { useOffline, UseOfflineReturn } from '../hooks/useOffline';

const OfflineContext = createContext<UseOfflineReturn | null>(null);

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const offlineState = useOffline();

  return (
    <OfflineContext.Provider value={offlineState}>
      {children}
      {/* Offline indicator banner */}
      {!offlineState.isOnline && (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center text-sm z-50">
          Mode hors ligne - Les modifications seront synchronisées au retour de la connexion
          {offlineState.pendingChangesCount > 0 && (
            <span className="ml-2">
              ({offlineState.pendingChangesCount} modification{offlineState.pendingChangesCount > 1 ? 's' : ''} en attente)
            </span>
          )}
        </div>
      )}
      {/* Syncing indicator */}
      {offlineState.isSyncing && (
        <div className="fixed bottom-0 left-0 right-0 bg-blue-500 text-white px-4 py-2 text-center text-sm z-50">
          Synchronisation en cours...
        </div>
      )}
    </OfflineContext.Provider>
  );
}

export function useOfflineContext(): UseOfflineReturn {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOfflineContext must be used within an OfflineProvider');
  }
  return context;
}
