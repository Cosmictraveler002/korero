import React, { useState } from 'react';
import { X, Sparkles, Image as ImageIcon, Info, Clock, ShieldCheck } from 'lucide-react';
import { ImageQuotaInfo } from '../types';

interface ImageGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  quota: ImageQuotaInfo | null;
}

export const ImageGenerateModal: React.FC<ImageGenerateModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
  quota,
}) => {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const samplePrompts = [
    'A cyberpunk neon owl perched on glowing circuitry in rain, synthwave aesthetic, 8k',
    'A futuristic botanical greenhouse with bioluminescent flora and glass domes, cinematic light',
    'Minimalist isometric room with retro computer workstations, warm sunset lighting',
    'A majestic fantasy library inside a giant hollowed oak tree, golden dust motes',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = prompt.trim();
    if (!clean) {
      setError('Please provide a prompt describing the image.');
      return;
    }

    if (quota && quota.hourlyAvailable < 1) {
      setError('Hourly image limit (10 images/hour) reached. Please wait for the next hourly rollover.');
      return;
    }

    if (quota && quota.dailyTokensUsed + 260 > quota.dailyCap) {
      setError('Daily token limit (2,600 tokens/day) reached. Quota resets in 24 hours.');
      return;
    }

    try {
      setError(null);
      await onGenerate(clean);
      setPrompt('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to generate image');
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-neutral-950 border border-neutral-800 rounded-2xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-850 bg-neutral-900/70 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Generate Image
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-orange-950/80 text-orange-300 border-orange-800/80">
                  Flux 1 Schnell
                </span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Powered by Cloudflare Workers AI (<code className="text-neutral-300">@cf/black-forest-labs/flux-1-schnell</code>)
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Prompt Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Image Description / Prompt:
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create (e.g. A serene Japanese garden in autumn with vibrant red maples and a stone bridge)..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition resize-none"
              autoFocus
              required
            />
          </div>

          {/* Quick Idea Starters */}
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1.5 block">
              Quick Inspiration Starters:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {samplePrompts.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(sample)}
                  className="p-2 rounded-lg bg-neutral-900/60 hover:bg-neutral-800/80 border border-neutral-850 hover:border-neutral-750 text-[11px] text-neutral-300 hover:text-white text-left transition truncate block cursor-pointer"
                  title={sample}
                >
                  "{sample}"
                </button>
              ))}
            </div>
          </div>

          {/* Rate Limit & Rollover Policy Info */}
          <div className="p-3 bg-neutral-900/50 rounded-xl border border-neutral-850 space-y-2 text-[11px]">
            <div className="flex items-center justify-between text-neutral-300 font-medium">
              <div className="flex items-center gap-1.5 text-orange-300">
                <Clock size={13} />
                <span>Rate Limits & Token Cap</span>
              </div>
              {quota && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                  {quota.hourlyAvailable} credits left (Rollover active)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-400 font-mono">
              <div className="bg-neutral-950 p-2 rounded border border-neutral-850">
                <span className="text-neutral-500 block">Hourly Limit:</span>
                <strong className="text-white">10 images/hour</strong>
                <span className="text-[9px] text-emerald-400 block mt-0.5">Leftover rolls over to next hours</span>
              </div>
              <div className="bg-neutral-950 p-2 rounded border border-neutral-850">
                <span className="text-neutral-500 block">Daily Cap:</span>
                <strong className="text-white">
                  {quota ? `${quota.dailyTokensUsed} / ${quota.dailyCap}` : '0 / 2,600'}
                </strong> tokens/day
              </div>
            </div>

            <p className="text-[10px] text-neutral-500 leading-tight">
              💡 Tip: You or any bot can also type <code className="text-neutral-300 font-mono">/image &lt;prompt&gt;</code> directly in chat anytime to generate images in parallel!
            </p>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-900 transition font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="px-5 py-2.5 bg-white hover:bg-neutral-200 disabled:opacity-40 text-black text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={14} />
              <span>{isGenerating ? 'Synthesizing Image...' : 'Generate with Flux 1'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
