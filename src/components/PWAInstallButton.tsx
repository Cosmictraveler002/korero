import React, { useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'drawer';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'drawer',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'header') {
      return (
        <button
          onClick={install}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded bg-white text-black hover:bg-neutral-200 text-[11px] font-medium transition shrink-0 ${className}`}
          title="Install Kōrero App"
        >
          <Download size={12} />
          <span>Install</span>
        </button>
      );
    }

    return (
      <button
        onClick={install}
        className={`w-full py-2 px-3 bg-neutral-900 hover:bg-neutral-850 text-white rounded text-xs font-medium border border-neutral-800 transition flex items-center justify-center gap-2 ${className}`}
      >
        <img src="/korero_o_symbol_logo_white.png" alt="Logo" className="w-4 h-4 object-contain" />
        <span>Install Kōrero App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        {variant === 'header' ? (
          <button
            onClick={() => setShowIOSGuide(true)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-900 text-neutral-300 hover:text-white text-[11px] font-medium transition shrink-0 ${className}`}
          >
            <Download size={12} />
            <span>Install</span>
          </button>
        ) : (
          <button
            onClick={() => setShowIOSGuide(true)}
            className={`w-full py-2 px-3 bg-neutral-900 hover:bg-neutral-850 text-white rounded text-xs font-medium border border-neutral-800 transition flex items-center justify-center gap-2 ${className}`}
          >
            <img src="/korero_o_symbol_logo_white.png" alt="Logo" className="w-4 h-4 object-contain" />
            <span>Install on iOS</span>
          </button>
        )}

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-xs sm:max-w-sm rounded-lg bg-neutral-900 border border-neutral-800 p-5 shadow-2xl text-neutral-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img src="/pwa-192x192.png" alt="Kōrero" className="w-6 h-6 rounded-md" />
                  <h3 className="text-sm font-semibold text-white">Install Kōrero on iOS</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-neutral-400 hover:text-white p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
                Install as a standalone home screen app for fast fullscreen messaging:
              </p>

              <ol className="space-y-2.5 text-xs text-neutral-300 mb-5 pl-1">
                <li className="flex items-start gap-2">
                  <span className="font-mono text-neutral-500">1.</span>
                  <span>
                    Tap the <strong className="text-white inline-flex items-center gap-1"><Share size={12} /> Share</strong> button in Safari's bottom toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-neutral-500">2.</span>
                  <span>
                    Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-neutral-500">3.</span>
                  <span>Tap <strong className="text-white">Add</strong> in the top right.</span>
                </li>
              </ol>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded bg-white py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
