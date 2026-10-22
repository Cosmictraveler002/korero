import { useEffect, useState, useCallback } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const checkConnectivity = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      return false;
    }
    try {
      // Lightweight health ping to server
      const res = await fetch('/api/settings', {
        method: 'HEAD',
        cache: 'no-store',
      }).catch(() => null);

      if (res && (res.ok || res.status === 200 || res.status === 304)) {
        setIsOnline(true);
        return true;
      }
    } catch (e) {}

    // Fallback to navigator status
    const status = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOnline(status);
    return status;
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkConnectivity();
    };

    const handleOffline = () => {
      // Double check before alarming the user on mobile network transition
      setTimeout(() => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setIsOnline(false);
        } else {
          checkConnectivity();
        }
      }, 1000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkConnectivity();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnectivity]);

  return isOnline;
}

