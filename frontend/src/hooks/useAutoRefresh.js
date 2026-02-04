import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

/**
 * Hook for automatic data refresh when Google Sheet changes
 * @param {Function} onDataChanged - Callback when data has been synced
 * @param {number} intervalMs - Polling interval in milliseconds (default: 30000)
 * @param {boolean} enabled - Whether auto-refresh is enabled (default: true)
 */
export function useAutoRefresh(onDataChanged, intervalMs = 30000, enabled = true) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);
  const [error, setError] = useState(null);
  const [syncCount, setSyncCount] = useState(0);
  const intervalRef = useRef(null);

  const checkAndSync = useCallback(async () => {
    if (isChecking) return;

    setIsChecking(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/sheets/auto-sync`);
      const data = response.data;

      setLastCheck(new Date().toISOString());

      if (data.synced) {
        setLastSync(data.last_sync);
        setSyncCount(data.records_synced);
        if (onDataChanged) {
          onDataChanged(data);
        }
      } else if (data.last_sync) {
        setLastSync(data.last_sync);
        setSyncCount(data.records_count || 0);
      }

      if (data.error) {
        setError(data.error);
      }

      return data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message;
      setError(errorMsg);
      console.error('Auto-sync error:', errorMsg);
      return { synced: false, error: errorMsg };
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, onDataChanged]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    try {
      setIsChecking(true);
      setError(null);

      const response = await axios.post(`${API_BASE_URL}/api/sheets/sync`);
      const data = response.data;

      setLastSync(data.last_sync);
      setSyncCount(data.records_synced);

      if (onDataChanged) {
        onDataChanged({ synced: true, ...data });
      }

      return data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message;
      setError(errorMsg);
      throw err;
    } finally {
      setIsChecking(false);
    }
  }, [onDataChanged]);

  // Set up polling interval
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial check on mount
    checkAndSync();

    // Set up interval
    intervalRef.current = setInterval(checkAndSync, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, checkAndSync]);

  return {
    isChecking,
    lastSync,
    lastCheck,
    error,
    syncCount,
    triggerSync,
    checkAndSync,
  };
}

export default useAutoRefresh;
