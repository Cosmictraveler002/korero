import React, { useState } from 'react';
import { X, Key, ShieldCheck, ExternalLink, Check, Eye, EyeOff } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveKey: (
    provider: 'groq' | 'openrouter' | 'nvidia' | 'cloudflare' | 'tavily',
    key: string,
    name?: string
  ) => Promise<void>;
  onKeySavedSuccess?: () => void;
  initialProvider?: 'groq' | 'openrouter' | 'nvidia' | 'cloudflare' | 'tavily';
  errorMessage?: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSaveKey,
  onKeySavedSuccess,
  initialProvider = 'groq',
  errorMessage,
}) => {
  const [provider, setProvider] = useState<'groq' | 'openrouter' | 'nvidia' | 'cloudflare' | 'tavily'>(initialProvider);
  const [keyValue, setKeyValue] = useState('');
  const [keyName, setKeyName] = useState('');
  const [showPlainKey, setShowPlainKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const providerMeta = {
    groq: {
      name: 'Groq LPU',
      placeholder: 'gsk_••••••••••••••••••••••••••••••••••••',
      helpUrl: 'https://console.groq.com/keys',
      helpText: 'Get free instant key from console.groq.com',
      badge: 'Ultra Fast',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    cloudflare: {
      name: 'Cloudflare AI',
      placeholder: '••••••••••••••••••••••••••••••••••••••••',
      helpUrl: 'https://dash.cloudflare.com/profile/api-tokens',
      helpText: 'Get Workers AI API Token from Cloudflare Dashboard',
      badge: 'Workers AI',
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    },
    openrouter: {
      name: 'OpenRouter',
      placeholder: 'sk-or-v1-••••••••••••••••••••••••••••••••',
      helpUrl: 'https://openrouter.ai/keys',
      helpText: 'Get key from openrouter.ai/keys',
      badge: 'All Models',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    },
    nvidia: {
      name: 'NVIDIA NIM',
      placeholder: 'nvapi-••••••••••••••••••••••••••••••••',
      helpUrl: 'https://build.nvidia.com',
      helpText: 'Get free credits from build.nvidia.com',
      badge: 'Fast GPU',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    tavily: {
      name: 'Tavily Search',
      placeholder: 'tvly-••••••••••••••••••••••••••••••••',
      helpUrl: 'https://tavily.com',
      helpText: 'Get search key from tavily.com',
      badge: 'Live Search',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    },
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = keyValue.trim();
    if (!cleanKey) {
      setError('Please paste or enter your API key.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await onSaveKey(provider, cleanKey, keyName.trim() || undefined);
      setSuccess(`${providerMeta[provider].name} key saved and activated on this device!`);
      setTimeout(() => {
        setSuccess(null);
        setKeyValue('');
        setKeyName('');
        onClose();
        if (onKeySavedSuccess) onKeySavedSuccess();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-neutral-950 border border-neutral-800 rounded-2xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-850 bg-neutral-900/70 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Key size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                API Key Required
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-neutral-850 text-neutral-300 border-neutral-750">
                  Device Private
                </span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {errorMessage || 'Add your key to activate AI responses in this chat room'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4">
          {/* Provider Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Select Provider:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-neutral-900/80 rounded-xl border border-neutral-850">
              {(['groq', 'cloudflare', 'openrouter', 'nvidia', 'tavily'] as const).map((p) => {
                const isSelected = provider === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setProvider(p);
                      setError(null);
                    }}
                    className={`py-2 px-2 text-xs font-medium rounded-lg text-center transition flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-neutral-800 text-white shadow-xs border border-neutral-700'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850/50'
                    }`}
                  >
                    <span>{providerMeta[p].name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-normal border ${providerMeta[p].badgeColor}`}
                    >
                      {providerMeta[p].badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-300">
                {providerMeta[provider].name} API Key
              </label>
              <a
                href={providerMeta[provider].helpUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
              >
                <span>Get key</span>
                <ExternalLink size={10} />
              </a>
            </div>

            <div className="relative">
              <input
                type={showPlainKey ? 'text' : 'password'}
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder={providerMeta[provider].placeholder}
                className="w-full bg-neutral-900/90 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 font-mono transition pr-20"
                autoFocus
                required
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPlainKey(!showPlainKey)}
                  className="p-1.5 text-neutral-400 hover:text-white transition rounded"
                  title={showPlainKey ? 'Hide key' : 'Show key'}
                >
                  {showPlainKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Optional Key Name */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Custom Key Label (Optional)
            </label>
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder={`e.g. My ${providerMeta[provider].name} Key`}
              className="w-full bg-neutral-900/90 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition"
            />
          </div>

          {/* Privacy & Storage Guarantee */}
          <div className="p-3 bg-neutral-900/40 rounded-xl border border-neutral-850 flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Keys are stored <strong>only in this browser's local storage</strong> (<code className="text-neutral-300">localStorage</code>). They are never saved to a global server database.
            </p>
          </div>

          {/* Error / Success feedback */}
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs font-medium flex items-center gap-2">
              <Check size={14} />
              <span>{success}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-900 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !keyValue.trim()}
              className="px-5 py-2.5 bg-white hover:bg-neutral-200 disabled:opacity-40 text-black text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              {isSaving ? 'Saving...' : 'Save & Activate Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
