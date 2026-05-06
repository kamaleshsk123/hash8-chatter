import { useState, useEffect } from 'react';

interface NetworkState {
  isOnline: boolean;
  wasOffline: boolean;
  connectionType?: string;
}

export const useNetworkStatus = () => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: navigator.onLine,
    wasOffline: false,
    connectionType: (navigator as any)?.connection?.effectiveType || 'unknown'
  });

  useEffect(() => {
    const handleOnline = () => {
      setNetworkState(prev => ({
        ...prev,
        isOnline: true,
        wasOffline: prev.wasOffline || !prev.isOnline
      }));
    };

    const handleOffline = () => {
      setNetworkState(prev => ({
        ...prev,
        isOnline: false,
        wasOffline: true
      }));
    };

    const handleConnectionChange = () => {
      setNetworkState(prev => ({
        ...prev,
        connectionType: (navigator as any)?.connection?.effectiveType || 'unknown'
      }));
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen to connection changes if supported
    if ((navigator as any)?.connection) {
      (navigator as any).connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ((navigator as any)?.connection) {
        (navigator as any).connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  const resetWasOffline = () => {
    setNetworkState(prev => ({
      ...prev,
      wasOffline: false
    }));
  };

  return {
    ...networkState,
    resetWasOffline
  };
};