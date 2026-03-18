import { useState, useEffect, useCallback } from 'react';
import { syncPendingChanges, getPendingChanges } from '../services/offline';

export interface UseOfflineReturn {
  isOnline: boolean;
  pendingChangesCount: number;
  isSyncing: boolean;
  lastSyncResult: {
    success: number;
    failed: number;
    errors: string[];
  } | null;
  syncNow: () => Promise<void>;
}

export function useOffline(): UseOfflineReturn {
  // Default to true - we'll verify with a real connectivity check
  const [isOnline, setIsOnline] = useState(true);
  const [pendingChangesCount, setPendingChangesCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // Update pending changes count
  const updatePendingCount = useCallback(async () => {
    const changes = await getPendingChanges();
    setPendingChangesCount(changes.length);
  }, []);

  // Sync pending changes
  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    try {
      const result = await syncPendingChanges();
      setLastSyncResult(result);
      await updatePendingCount();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, updatePendingCount]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Real connectivity check - fetch a small resource
    const checkConnectivity = async () => {
      try {
        // Try to fetch from Google's favicon (small, reliable, cached)
        const response = await fetch('https://www.google.com/favicon.ico', {
          mode: 'no-cors',
          cache: 'no-store'
        });
        setIsOnline(true);
      } catch {
        // Fallback to navigator.onLine
        setIsOnline(navigator.onLine ?? true);
      }
    };

    checkConnectivity();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow]);

  // Initial pending count
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  // Periodic sync when online (every 30 seconds)
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      if (pendingChangesCount > 0) {
        syncNow();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline, pendingChangesCount, syncNow]);

  return {
    isOnline,
    pendingChangesCount,
    isSyncing,
    lastSyncResult,
    syncNow,
  };
}
