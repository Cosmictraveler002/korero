import React from 'react';
import { X, Download, Sparkles, Copy, Check } from 'lucide-react';
import { GeneratedImageAttachment, ImageQuotaInfo } from '../types';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: GeneratedImageAttachment | null;
  quota?: ImageQuotaInfo | null;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  image,
  quota,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !image) return null;

  const handleDownload = () => {
    try {
      const a = document.createElement('a');
      a.href = image.image_url;
      const safePrompt = image.prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `flux_${safePrompt}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(image.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-neutral-950 border border-neutral-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-neutral-850 bg-neutral-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300">
              <Sparkles size={14} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                Generated Image
              </div>
              <p className="text-[10px] text-neutral-400">
                AI text-to-image preview
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Image Preview Container */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-black/90 space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-neutral-800 shadow-2xl max-h-[60vh] flex items-center justify-center group">
            <img
              src={image.image_url}
              alt={image.prompt}
              className="max-w-full max-h-[58vh] object-contain rounded-lg"
            />
          </div>

          {/* Prompt Box */}
          <div className="w-full bg-neutral-900/70 border border-neutral-800 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                Prompt
              </span>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
              >
                {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copied ? 'Copied!' : 'Copy prompt'}</span>
              </button>
            </div>
            <p className="text-xs text-neutral-200 leading-relaxed font-sans select-all">
              "{image.prompt}"
            </p>
          </div>

          {/* Quota & Generation Stats */}
          {quota && (
            <div className="w-full grid grid-cols-2 gap-2 text-[10px] text-neutral-400 font-mono bg-neutral-950 p-2.5 rounded-lg border border-neutral-850">
              <div>
                <span className="text-neutral-500">Hourly Rate Limit:</span>{' '}
                <span className="text-white font-semibold">{quota.hourlyAvailable} left</span>{' '}
                <span className="text-emerald-400">(Rollover active)</span>
              </div>
              <div>
                <span className="text-neutral-500">Daily Token Cap:</span>{' '}
                <span className="text-white font-semibold">
                  {quota.dailyTokensUsed} / {quota.dailyCap}
                </span>{' '}
                tokens
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-neutral-850 bg-neutral-900/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-1.5 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Download size={13} />
            <span>Download Image</span>
          </button>
        </div>
      </div>
    </div>
  );
};
