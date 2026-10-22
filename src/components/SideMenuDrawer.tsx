import React, { useState, useEffect } from 'react';
import { X, Trash2, RefreshCw } from 'lucide-react';
import { ChatContext, Persona, ModelSettings } from '../types';
import { PersonaAvatar } from './PersonaAvatar';
import { PWAInstallButton } from './PWAInstallButton';

interface SideMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  // New Chat
  onNewChat: () => void;
  // NSFW
  nsfwMode: boolean;
  onToggleNsfw: (enabled: boolean) => void;
  // Personas
  personas: Persona[];
  onOpenCreatePersona: () => void;
  onEditPersona: (persona: Persona) => void;
  onDeletePersona: (id: string) => void;
  onSelectPersonaForTurn: (name: string) => void;
  // Contexts / Topics
  contexts: ChatContext[];
  currentContextId: string;
  onSwitchContext: (contextId: string) => void;
  // Models
  settings: ModelSettings;
  onSelectModel: (modelId: string) => void;
  onRefreshModels?: () => Promise<void>;
  isRefreshingModels?: boolean;
  // API Keys
  onSaveKey: (provider: 'groq' | 'openrouter' | 'nvidia' | 'cloudflare' | 'tavily' | 'e2b', key: string, name?: string) => Promise<void>;
  onToggleKey: (id: string) => Promise<void>;
  onDeleteKey: (id: string) => Promise<void>;
  onTestModel: (modelId?: string) => Promise<void>;
  isTestingModel: boolean;
  testResult: { success: boolean; message: string } | null;
}

export const SideMenuDrawer: React.FC<SideMenuDrawerProps> = ({
  isOpen,
  onClose,
  onNewChat,
  nsfwMode,
  onToggleNsfw,
  personas,
  onOpenCreatePersona,
  onEditPersona,
  onDeletePersona,
  onSelectPersonaForTurn,
  contexts,
  currentContextId,
  onSwitchContext,
  settings,
  onSelectModel,
  onRefreshModels,
  isRefreshingModels,
  onSaveKey,
  onToggleKey,
  onDeleteKey,
  onTestModel,
  isTestingModel,
  testResult,
}) => {
  const [activeTab, setActiveTab] = useState<'chats' | 'personas' | 'models' | 'keys' | 'search'>('chats');

  // Reset to 'chats' tab when opening the drawer
  useEffect(() => {
    if (isOpen) {
      setActiveTab('chats');
    }
  }, [isOpen]);

  // Dedicated Tavily key state
  const [tavilyKeyValue, setTavilyKeyValue] = useState('');
  const [isSavingTavily, setIsSavingTavily] = useState(false);
  const [tavilySuccess, setTavilySuccess] = useState<string | null>(null);

  // Dedicated E2B Code Sandbox key state
  const [e2bKeyValue, setE2bKeyValue] = useState('');
  const [isSavingE2b, setIsSavingE2b] = useState(false);
  const [e2bSuccess, setE2bSuccess] = useState<string | null>(null);

  // Model key form state
  const [newKeyProvider, setNewKeyProvider] = useState<'groq' | 'cloudflare' | 'openrouter' | 'nvidia'>('groq');
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySuccess, setKeySuccess] = useState<string | null>(null);
  const [modelProviderFilter, setModelProviderFilter] = useState<'all' | 'groq' | 'cloudflare' | 'openrouter' | 'nvidia'>('all');

  // Search & Execution logs state
  const [searchLogs, setSearchLogs] = useState<Array<{ id: number; query: string; result_count: number; timestamp: string }>>([]);
  const [crawlLogs, setCrawlLogs] = useState<Array<{ id: number; url: string; success: number; char_count: number; timestamp: string }>>([]);
  const [execLogs, setExecLogs] = useState<Array<{ id: number; persona: string; code: string; output: string; success: boolean; duration_ms: number; timestamp: string }>>([]);

  const fetchLogs = async () => {
    try {
      const devId = localStorage.getItem('korero_device_id') || 'dev-local';
      const res = await fetch('/api/search/logs', {
        headers: { 'x-device-id': devId },
      });
      if (res.ok) {
        const data = await res.json();
        setSearchLogs(data.searches || []);
        setCrawlLogs(data.crawls || []);
        setExecLogs(data.execs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'search') {
      fetchLogs();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleSaveTavilyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tavilyKeyValue.trim()) return;
    try {
      setIsSavingTavily(true);
      setTavilySuccess(null);
      await onSaveKey('tavily', tavilyKeyValue.trim(), 'Tavily Search API');
      setTavilyKeyValue('');
      setTavilySuccess('Tavily Search key saved and activated!');
      setTimeout(() => setTavilySuccess(null), 3000);
    } catch (err: any) {
      setKeyError(err?.message || 'Failed to save Tavily key');
    } finally {
      setIsSavingTavily(false);
    }
  };

  const handleSaveE2bKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!e2bKeyValue.trim()) return;
    try {
      setIsSavingE2b(true);
      setE2bSuccess(null);
      await onSaveKey('e2b', e2bKeyValue.trim(), 'E2B Code Sandbox');
      setE2bKeyValue('');
      setE2bSuccess('E2B Sandbox API key saved and activated!');
      setTimeout(() => setE2bSuccess(null), 3000);
    } catch (err: any) {
      setKeyError(err?.message || 'Failed to save E2B key');
    } finally {
      setIsSavingE2b(false);
    }
  };

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyValue.trim()) {
      setKeyError('Please enter an API key');
      return;
    }
    try {
      setIsSavingKey(true);
      setKeyError(null);
      setKeySuccess(null);
      await onSaveKey(newKeyProvider, newKeyValue.trim(), newKeyName.trim() || undefined);
      setNewKeyValue('');
      setNewKeyName('');
      setKeySuccess(`${newKeyProvider.toUpperCase()} key saved permanently!`);
      setTimeout(() => setKeySuccess(null), 3000);
    } catch (err: any) {
      setKeyError(err?.message || 'Failed to save key');
    } finally {
      setIsSavingKey(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Window sliding in from left */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-neutral-950 border-r border-neutral-850 h-full flex flex-col z-50 shadow-2xl text-neutral-200 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="p-3.5 border-b border-neutral-850 bg-neutral-900/90 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base tracking-tight">Kōrero</span>
              {nsfwMode && (
                <span className="text-[10px] text-rose-400 font-medium">
                  · NSFW 18+
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400">Multi-Persona AI Chatroom</p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Bar: New Chat, PWA Install & 18+ NSFW Mode */}
        <div className="p-3 border-b border-neutral-850 bg-neutral-900/30 space-y-2 shrink-0">
          {/* New Chat Primary Button */}
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full py-2 px-3 bg-white hover:bg-neutral-200 text-black rounded text-xs font-semibold shadow-xs transition"
          >
            + New Chat with Selected Bots
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton variant="drawer" />

          {/* 18+ NSFW Mode Card */}
          <div className="p-2.5 rounded border border-neutral-850 bg-neutral-900/40 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-xs text-neutral-200">18+ NSFW Mode</span>
                <span className="text-[10px] text-neutral-400">
                  {nsfwMode ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                Uncensored candid dialogue for allowed bots
              </p>
            </div>

            <button
              type="button"
              onClick={() => onToggleNsfw(!nsfwMode)}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                nsfwMode ? 'bg-rose-600' : 'bg-neutral-800'
              }`}
              aria-label="Toggle NSFW mode"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  nsfwMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Tab Navigation - Pure Clean Text */}
        <div className="flex border-b border-neutral-850 bg-neutral-950 text-xs shrink-0 px-2 pt-1 gap-1">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 pb-2 pt-1.5 text-center font-medium border-b-2 transition ${
              activeTab === 'chats'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Chats
          </button>

          <button
            onClick={() => setActiveTab('personas')}
            className={`flex-1 pb-2 pt-1.5 text-center font-medium border-b-2 transition ${
              activeTab === 'personas'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Bots ({personas.length})
          </button>

          <button
            onClick={() => setActiveTab('models')}
            className={`flex-1 pb-2 pt-1.5 text-center font-medium border-b-2 transition ${
              activeTab === 'models'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Models
          </button>

          <button
            onClick={() => setActiveTab('keys')}
            className={`flex-1 pb-2 pt-1.5 text-center font-medium border-b-2 transition ${
              activeTab === 'keys'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Keys
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 pb-2 pt-1.5 text-center font-medium border-b-2 transition ${
              activeTab === 'search'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Search
          </button>
        </div>

        {/* Tab Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3 text-xs space-y-3">
          {/* TAB 1: CHATS / TOPICS */}
          {activeTab === 'chats' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-neutral-400 px-1">
                <span className="text-[11px] font-medium text-neutral-400">
                  Topic Threads ({contexts.length})
                </span>
                <button
                  onClick={() => {
                    onNewChat();
                    onClose();
                  }}
                  className="text-[11px] text-neutral-300 hover:text-white"
                >
                  + New
                </button>
              </div>

              {contexts.map((ctx) => {
                const isActive = ctx.context_id === currentContextId;
                const topicBots = ctx.allowed_persona_ids
                  ? personas.filter((p) => ctx.allowed_persona_ids?.includes(p.id) || ctx.allowed_persona_ids?.includes(p.name))
                  : personas;

                return (
                  <div
                    key={ctx.context_id}
                    onClick={() => {
                      onSwitchContext(ctx.context_id);
                      onClose();
                    }}
                    className={`p-2.5 rounded border transition cursor-pointer ${
                      isActive
                        ? 'bg-neutral-900 border-neutral-700 shadow-xs'
                        : 'bg-neutral-900/40 border-neutral-850 hover:border-neutral-750 hover:bg-neutral-900/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isActive ? 'bg-emerald-400' : 'bg-neutral-600'
                          }`}
                        />
                        <span className="font-medium text-white truncate text-xs">
                          {ctx.topic_label}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 shrink-0">
                        {ctx.message_count ?? 0} msgs
                      </span>
                    </div>

                    <div className="flex items-center gap-1 mt-1.5 pl-3.5">
                      <span className="text-[10px] text-neutral-500 mr-1">Bots:</span>
                      <div className="flex items-center -space-x-1 overflow-hidden">
                        {topicBots.slice(0, 5).map((b) => (
                          <div
                            key={b.id}
                            className="w-4 h-4 rounded-full overflow-hidden border border-neutral-900 shrink-0"
                            title={b.name}
                          >
                            {b.avatarUrl ? (
                              <img src={b.avatarUrl} alt={b.name} className="w-full h-full object-cover" />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center text-[7px] font-bold text-white"
                                style={{ backgroundColor: b.badgeColor }}
                              >
                                {b.avatarLetter}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] text-neutral-400 ml-1">
                        ({topicBots.length})
                      </span>
                    </div>

                    {ctx.summary && (
                      <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 italic pl-3.5">
                        "{ctx.summary}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: PERSONAS & BOTS */}
          {activeTab === 'personas' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-400">
                  Bot Characters ({personas.length})
                </span>
                <button
                  onClick={onOpenCreatePersona}
                  className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-750 rounded text-[11px] font-medium transition"
                >
                  + Create Bot
                </button>
              </div>

              <div className="space-y-2">
                {personas.map((persona) => (
                  <div
                    key={persona.id}
                    className="p-2.5 rounded border border-neutral-850 bg-neutral-900/50 hover:border-neutral-750 transition flex items-start gap-3"
                  >
                    <PersonaAvatar
                      name={persona.name}
                      avatarUrl={persona.avatarUrl}
                      avatarLetter={persona.avatarLetter}
                      badgeColor={persona.badgeColor}
                      size="md"
                      allowNsfw={persona.allowNsfw}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-white text-xs truncate">
                            {persona.name}
                          </span>
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: persona.badgeColor }}
                          />
                          {persona.allowNsfw ? (
                            <span className="text-[9px] text-rose-400 font-medium">
                              · NSFW
                            </span>
                          ) : (
                            <span className="text-[9px] text-neutral-500">
                              · Safe
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => onEditPersona(persona)}
                            className="text-neutral-400 hover:text-white px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-800 hover:bg-neutral-700 transition"
                            title={`Change ${persona.name}'s name or profile picture`}
                          >
                            Edit
                          </button>

                          {persona.isCustom && (
                            <button
                              onClick={() => onDeletePersona(persona.id)}
                              className="text-neutral-500 hover:text-red-400 p-0.5 transition"
                              title="Delete custom bot"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                        {persona.description}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-neutral-850/60">
                        <button
                          onClick={() => {
                            onSelectPersonaForTurn(persona.name);
                            onClose();
                          }}
                          className="text-[10px] text-neutral-400 hover:text-white transition"
                        >
                          Trigger response next
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MODELS */}
          {activeTab === 'models' && (
            <div className="space-y-3">
              {/* Sticky Controls Header */}
              <div className="sticky -top-3 z-20 bg-neutral-950/98 backdrop-blur-md pt-1 pb-2 border-b border-neutral-850 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-neutral-400">
                    Select Provider & Model
                  </span>
                  <div className="flex items-center gap-1.5">
                    {onRefreshModels && (
                      <button
                        onClick={onRefreshModels}
                        disabled={isRefreshingModels}
                        className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/80 text-emerald-300 hover:text-emerald-200 rounded text-[11px] font-semibold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="Auto-refreshes weekly. Click to re-sync live OpenRouter available models now."
                      >
                        <RefreshCw size={11} className={isRefreshingModels ? 'animate-spin text-emerald-400' : 'text-emerald-400'} />
                        <span>{isRefreshingModels ? 'Refreshing...' : 'Refresh Models'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => onTestModel(settings.selectedModel)}
                      disabled={isTestingModel}
                      className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-750 text-neutral-200 rounded text-[11px] font-medium transition disabled:opacity-50 cursor-pointer"
                    >
                      {isTestingModel ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                </div>

                {/* Dynamic Auto-Refresh Weekly Status Banner */}
                <div className="px-2.5 py-1.5 rounded-lg bg-neutral-900/80 border border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-neutral-300 truncate">
                      Auto-refreshes weekly
                      {settings.modelsMetadata?.lastRefreshedAt
                        ? ` · Synced ${new Date(settings.modelsMetadata.lastRefreshedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                        : ''}
                    </span>
                  </div>
                  <span className="text-emerald-400 font-mono text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-800/60 shrink-0 font-medium">
                    {settings.availableModels.filter((m) => m.provider === 'openrouter').length} OpenRouter live
                  </span>
                </div>

                {/* Provider Filter Tabs with counts */}
                <div className="flex items-center gap-1 p-1 bg-neutral-900/80 rounded-lg border border-neutral-800 text-[10px]">
                  {[
                    { id: 'all', label: `All (${settings.availableModels.length})` },
                    { id: 'groq', label: `Groq (${settings.availableModels.filter((m) => m.provider === 'groq').length})` },
                    { id: 'cloudflare', label: `CF (${settings.availableModels.filter((m) => m.provider === 'cloudflare').length})` },
                    { id: 'openrouter', label: `OpenRouter (${settings.availableModels.filter((m) => m.provider === 'openrouter').length})` },
                    { id: 'nvidia', label: `NVIDIA (${settings.availableModels.filter((m) => m.provider === 'nvidia').length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setModelProviderFilter(tab.id as any)}
                      className={`flex-1 py-1 px-1 rounded text-center transition font-medium truncate ${
                        modelProviderFilter === tab.id
                          ? 'bg-neutral-800 text-white shadow-xs font-semibold'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-lg text-[11px] space-y-2 ${
                    testResult.success
                      ? 'bg-neutral-900 border border-emerald-900 text-emerald-300'
                      : 'bg-neutral-900 border border-red-900 text-red-300'
                  }`}
                >
                  <div>{testResult.message}</div>
                  {!testResult.success &&
                    (testResult.message.includes('openrouter.ai/settings/privacy') ||
                      testResult.message.includes('ZDR')) && (
                      <div className="pt-1.5 border-t border-red-900/60 flex flex-col gap-1.5 text-neutral-300">
                        <span className="text-[10px] text-neutral-400 leading-relaxed">
                          Free OpenRouter models require <strong className="text-white">Zero Data Retention (ZDR) Only</strong> to be turned <strong className="text-emerald-400">OFF</strong> and <strong className="text-white">Free Endpoints</strong> enabled in your OpenRouter account:
                        </span>
                        <a
                          href="https://openrouter.ai/settings/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center px-2.5 py-1.5 rounded bg-red-950/80 hover:bg-red-900/80 border border-red-700/70 text-red-200 font-semibold text-[11px] transition"
                        >
                          Open OpenRouter Privacy Settings ↗
                        </a>
                      </div>
                    )}
                </div>
              )}

              <div className="space-y-2">
                {settings.availableModels
                  .filter((m) =>
                    modelProviderFilter === 'all'
                      ? true
                      : m.provider === modelProviderFilter || (m.id === 'auto/smart-routing' && modelProviderFilter === 'groq')
                  )
                  .map((m) => {
                  const isSelected = settings.selectedModel === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => onSelectModel(m.id)}
                      className={`p-2.5 rounded-lg border transition cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-900 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/50'
                          : 'bg-neutral-900/40 border-neutral-850 hover:border-neutral-750 hover:bg-neutral-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-white text-xs truncate">
                          {m.name}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/50 shrink-0">
                          {m.provider}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 line-clamp-2">
                        {m.description}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        {m.tag && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800/80 text-neutral-400 font-mono border border-neutral-750/40">
                            {m.tag}
                          </span>
                        )}
                        {isSelected && (
                          <div className="text-[10px] text-emerald-400 font-bold ml-auto flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active Model
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: API KEYS */}
          {activeTab === 'keys' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-white">
                  Manage API Keys
                </span>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Configure Tavily Search and AI Model providers. All keys are stored privately on this device only.
                </p>
              </div>

              {/* 1. DEDICATED TAVILY SEARCH API KEY CARD */}
              <div className="p-3 bg-neutral-900/80 rounded-lg border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white">
                      🌐 Tavily Search API Key
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-mono">
                      WEB SEARCH
                    </span>
                  </div>
                  {settings.keys.some((k) => k.provider === 'tavily' && k.isActive) && (
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  Required for real-time web research, fact verification, and deep crawling citations in conversations.
                </p>

                {tavilySuccess && (
                  <div className="p-2 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-[11px]">
                    ✓ {tavilySuccess}
                  </div>
                )}

                <form onSubmit={handleSaveTavilyKey} className="space-y-2">
                  <input
                    type="password"
                    value={tavilyKeyValue}
                    onChange={(e) => setTavilyKeyValue(e.target.value)}
                    placeholder={
                      settings.keys.find((k) => k.provider === 'tavily')?.maskedKey ||
                      'tvly-dev-...'
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-600 font-mono"
                  />

                  <button
                    type="submit"
                    disabled={isSavingTavily || !tavilyKeyValue.trim()}
                    className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded text-xs font-semibold transition"
                  >
                    {isSavingTavily ? 'Saving Tavily Key...' : 'Save Tavily Search Key'}
                  </button>
                </form>
              </div>

              {/* 2. DEDICATED E2B CODE SANDBOX API KEY CARD */}
              <div className="p-3 bg-neutral-900/80 rounded-lg border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white">
                      ⚡ E2B Code Sandbox API Key
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 text-amber-300 font-mono">
                      PYTHON SANDBOX
                    </span>
                  </div>
                  {settings.keys.some((k) => k.provider === 'e2b' && k.isActive) && (
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  Powers isolated Python code execution for Pixel and the Research Crew to compute real numbers, verify statistics, and execute code snippets. Strictly stored on this device only.
                </p>

                {e2bSuccess && (
                  <div className="p-2 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-[11px]">
                    ✓ {e2bSuccess}
                  </div>
                )}

                <form onSubmit={handleSaveE2bKey} className="space-y-2">
                  <input
                    type="password"
                    value={e2bKeyValue}
                    onChange={(e) => setE2bKeyValue(e.target.value)}
                    placeholder={
                      settings.keys.find((k) => k.provider === 'e2b')?.maskedKey ||
                      'e2b_...'
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-600 font-mono"
                  />

                  <button
                    type="submit"
                    disabled={isSavingE2b || !e2bKeyValue.trim()}
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded text-xs font-semibold transition"
                  >
                    {isSavingE2b ? 'Saving E2B Key...' : 'Save E2B Sandbox Key'}
                  </button>
                </form>
              </div>

              {/* 2. AI MODEL KEYS (Groq / OpenRouter / NVIDIA) */}
              <form onSubmit={handleKeySubmit} className="p-3 bg-neutral-900/60 rounded-lg border border-neutral-850 space-y-2.5">
                <span className="font-semibold text-xs text-white block">
                  AI Model Providers (Groq / OpenRouter / NVIDIA)
                </span>

                {keyError && (
                  <div className="p-2 rounded bg-neutral-950 border border-red-900 text-red-300 text-[11px]">
                    {keyError}
                  </div>
                )}

                {keySuccess && (
                  <div className="p-2 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-[11px]">
                    ✓ {keySuccess}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">Select Provider</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                    {(['groq', 'cloudflare', 'openrouter', 'nvidia'] as const).map((prov) => (
                      <button
                        key={prov}
                        type="button"
                        onClick={() => setNewKeyProvider(prov)}
                        className={`py-1.5 text-center rounded text-[11px] font-medium transition ${
                          newKeyProvider === prov
                            ? 'bg-neutral-800 text-white border border-neutral-700'
                            : 'bg-neutral-950 text-neutral-400 hover:text-white border border-transparent'
                        }`}
                      >
                        {prov === 'groq' ? 'Groq LPU' : prov === 'cloudflare' ? 'Cloudflare AI' : prov === 'openrouter' ? 'OpenRouter' : 'NVIDIA NIM'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">
                    API Key Value
                  </label>
                  <input
                    type="password"
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                    placeholder={
                      newKeyProvider === 'groq'
                        ? 'gsk_...'
                        : newKeyProvider === 'cloudflare'
                        ? 'Cloudflare API Token...'
                        : newKeyProvider === 'openrouter'
                        ? 'sk-or-v1-...'
                        : 'nvapi-...'
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">
                    Friendly Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder={
                      newKeyProvider === 'groq'
                        ? 'My Fast Groq Key'
                        : newKeyProvider === 'cloudflare'
                        ? 'My Cloudflare Workers Key'
                        : newKeyProvider === 'openrouter'
                        ? 'My OpenRouter Key'
                        : 'My NVIDIA NIM Key'
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingKey || !newKeyValue.trim()}
                  className="w-full py-1.5 bg-white hover:bg-neutral-200 text-black rounded text-xs font-semibold transition disabled:opacity-40"
                >
                  {isSavingKey ? 'Saving...' : `Save ${newKeyProvider.toUpperCase()} Key`}
                </button>
              </form>

              {/* 3. CONFIGURED KEYS LIST */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-neutral-400">
                  All Stored Keys ({settings.keys.length})
                </span>

                {settings.keys.length === 0 ? (
                  <p className="text-[11px] text-neutral-500 py-2">
                    No custom keys saved yet. Add a key above or configure via .env.
                  </p>
                ) : (
                  settings.keys
                    .filter((k, idx, arr) => arr.findIndex((x) => x.id === k.id) === idx)
                    .map((k, idx) => (
                      <div
                        key={`${k.id || k.provider}-${idx}`}
                        className="p-2.5 rounded-lg border border-neutral-850 bg-neutral-900/40 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-xs text-white truncate">
                              {k.name}
                            </span>
                            <span className="text-[9px] uppercase font-mono text-neutral-400 bg-neutral-950 px-1 py-0.5 rounded">
                              {k.provider}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-neutral-500 block truncate mt-0.5">
                            {k.maskedKey}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onToggleKey(k.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                              k.isActive
                                ? 'bg-neutral-800 text-neutral-200 border border-neutral-700'
                                : 'bg-neutral-950 text-neutral-500 border border-neutral-900'
                            }`}
                          >
                            {k.isActive ? 'Active' : 'Disabled'}
                          </button>
                          <button
                            onClick={() => onDeleteKey(k.id)}
                            className="text-neutral-500 hover:text-red-400 p-1 transition"
                            title="Delete key"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: WEB SEARCH & CRAWL LOGS */}
          {activeTab === 'search' && (
            <div className="space-y-3">
              {/* Quick Tavily Key Card */}
              <div className="p-3 bg-neutral-900/80 rounded-lg border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    🌐 Tavily Web Search API Key
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {settings.keys.find((k) => k.provider === 'tavily')?.maskedKey || 'Default Key Active'}
                  </span>
                </div>

                <form onSubmit={handleSaveTavilyKey} className="flex gap-1.5">
                  <input
                    type="password"
                    value={tavilyKeyValue}
                    onChange={(e) => setTavilyKeyValue(e.target.value)}
                    placeholder="Enter custom Tavily key (tvly-...)"
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-600 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isSavingTavily || !tavilyKeyValue.trim()}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded text-xs font-medium transition shrink-0"
                  >
                    Save
                  </button>
                </form>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-medium text-neutral-400">
                  Tavily Intermediary Logs
                </span>
                <button
                  onClick={fetchLogs}
                  className="text-[11px] text-neutral-400 hover:text-white transition"
                >
                  Refresh
                </button>
              </div>

              <div>
                <span className="text-[10px] text-neutral-500 font-semibold block mb-1">
                  RECENT WEB SEARCHES ({searchLogs.length})
                </span>
                {searchLogs.length === 0 ? (
                  <p className="text-[11px] text-neutral-500 py-1">
                    No web searches requested by personas yet.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {searchLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2 rounded bg-neutral-900/50 border border-neutral-850 text-[11px]"
                      >
                        <div className="font-medium text-white truncate">
                          "{log.query}"
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-0.5 flex items-center justify-between">
                          <span>{log.result_count} results found</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <span className="text-[10px] text-neutral-500 font-semibold block mb-1">
                  RECENT PAGE CRAWLS ({crawlLogs.length})
                </span>
                {crawlLogs.length === 0 ? (
                  <p className="text-[11px] text-neutral-500 py-1">
                    No deep crawls performed yet.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {crawlLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2 rounded bg-neutral-900/50 border border-neutral-850 text-[11px]"
                      >
                        <div className="font-mono text-white truncate text-[10px]">
                          {log.url}
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-0.5 flex items-center justify-between">
                          <span>
                            {log.success ? `Success (${log.char_count} chars)` : 'Failed'}
                          </span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <span className="text-[10px] text-amber-400/90 font-semibold block mb-1">
                  ⚡ PYTHON SANDBOX EXECUTIONS ({execLogs.length})
                </span>
                {execLogs.length === 0 ? (
                  <p className="text-[11px] text-neutral-500 py-1">
                    No Python scripts executed by personas yet.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {execLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2 rounded bg-neutral-900/50 border border-amber-900/40 text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-amber-300">{log.persona}</span>
                          <span className={log.success ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                            {log.success ? `Success (${log.duration_ms}ms)` : 'Failed'}
                          </span>
                        </div>
                        <pre className="p-1.5 rounded bg-black/60 border border-neutral-800 text-[10px] font-mono text-neutral-300 overflow-x-auto whitespace-pre-wrap max-h-20">
                          {log.code}
                        </pre>
                        {log.output && (
                          <p className="text-[10px] text-neutral-400 font-mono truncate">
                            Out: {log.output}
                          </p>
                        )}
                        <span className="text-[9px] text-neutral-600 block text-right">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
