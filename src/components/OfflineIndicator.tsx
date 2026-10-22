import React, { useState } from 'react';
import { WifiOff, X, RefreshCw, Info } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // If back online, reset dismissed state so it alerts next time connectivity is lost
  React.useEffect(() => {
    if (isOnline) {
      setIsDismissed(false);
    }
  }, [isOnline]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await fetch('/api/settings', { cache: 'no-store' });
      // If succeeded, window event or hook will catch it
    } catch (e) {}
    setTimeout(() => setIsChecking(false), 800);
  };

  if (isOnline || isDismissed) return null;

  return (
    <div className="fixed bottom-24 right-3 sm:bottom-16 sm:left-4 z-30 flex flex-col gap-1.5 rounded-xl bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 p-2.5 text-xs font-medium text-neutral-200 shadow-2xl animate-in fade-in slide-in-from-bottom-2 max-w-[calc(100vw-1.5rem)] sm:max-w-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <WifiOff size={13} className="text-amber-400 shrink-0" />
          <span className="truncate font-semibold text-white">Offline Mode Active</span>
        </div>

        <button
          type="button"
          onClick={handleManualCheck}
          disabled={isChecking}
          className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition shrink-0 cursor-pointer"
          title="Retry server connection"
          aria-label="Retry server connection"
        >
          <RefreshCw size={12} className={isChecking ? 'animate-spin text-cyan-400' : ''} />
        </button>

        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition shrink-0 cursor-pointer"
          title="Offline mode details"
          aria-label="Offline mode details"
        >
          <Info size={12} />
        </button>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition shrink-0 cursor-pointer"
          title="Dismiss offline notice"
          aria-label="Dismiss offline notice"
        >
          <X size={12} />
        </button>
      </div>

      <p className="text-[11px] text-neutral-400 leading-snug">
        Chats are safely stored locally on your device. You can browse discussions and view previous messages offline.
      </p>

      {showDetails && (
        <div className="text-[10px] text-neutral-400 pt-1.5 border-t border-neutral-800 space-y-1">
          <p>
            • <strong>Cached discussions:</strong> Stored in high-capacity IndexedDB on your phone.
          </p>
          <p>
            • <strong>New messages:</strong> Sending will resume as soon as internet connection is re-established.
          </p>
        </div>
      )}
    </div>
  );
};

