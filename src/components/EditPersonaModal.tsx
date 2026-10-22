import React, { useState, useEffect } from 'react';
import { X, Check, Brain, Database, Trash2, Plus, Sparkles, Eye } from 'lucide-react';
import { Persona, ThoughtfulnessLevel, ModelOption, BotMemoryBank } from '../types';
import { PersonaAvatar } from './PersonaAvatar';

interface EditPersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  persona: Persona | null;
  onSave: (personaId: string, updatedData: Partial<Persona>) => Promise<void>;
  globalNsfwEnabled: boolean;
  availableModels?: ModelOption[];
}

const PRESET_AVATARS = [
  { name: 'Tactical Analyst', url: 'https://api.dicebear.com/7.x/Notionists/svg?seed=Tactical&backgroundColor=1e293b' },
  { name: 'Researcher', url: 'https://api.dicebear.com/7.x/Notionists/svg?seed=Researcher&backgroundColor=0f172a' },
  { name: 'Philosopher', url: 'https://api.dicebear.com/7.x/Notionists/svg?seed=Philosopher&backgroundColor=1e1b4b' },
  { name: 'Strategist', url: 'https://api.dicebear.com/7.x/Notionists/svg?seed=Strategist&backgroundColor=172554' },
  { name: 'Technologist', url: 'https://api.dicebear.com/7.x/Notionists/svg?seed=Technologist&backgroundColor=042f2e' },
  { name: 'Engineer', url: 'https://api.dicebear.com/7.x/Notionists/svg?seed=Engineer&backgroundColor=27272a' },
  { name: 'Scholar', url: 'https://api.dicebear.com/7.x/Notionists/svg?seed=Scholar&backgroundColor=3f3f46' },
  { name: 'Creative Writer', url: 'https://api.dicebear.com/7.x/Notionists/svg?seed=Writer&backgroundColor=31102f' },
  { name: 'Curator', url: 'https://api.dicebear.com/7.x/Notionists/svg?seed=Curator&backgroundColor=1c1917' },
  { name: 'Critic', url: 'https://api.dicebear.com/7.x/Notionists/svg?seed=Critic&backgroundColor=2e1065' },
];

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#71717a',
];

function getDeviceHeaders(): Record<string, string> {
  let devId = 'dev-local';
  try {
    devId = localStorage.getItem('korero_device_id') || 'dev-local';
  } catch (e) {}
  return {
    'Content-Type': 'application/json',
    'x-device-id': devId,
  };
}

export const EditPersonaModal: React.FC<EditPersonaModalProps> = ({
  isOpen,
  onClose,
  persona,
  onSave,
  globalNsfwEnabled,
  availableModels,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [badgeColor, setBadgeColor] = useState('#3b82f6');
  const [allowNsfw, setAllowNsfw] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [intellect, setIntellect] = useState<number>(7);
  const [thoughtfulness, setThoughtfulness] = useState<ThoughtfulnessLevel>('balanced');
  const [pacingDelaySeconds, setPacingDelaySeconds] = useState<number>(1.0);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [newConstraint, setNewConstraint] = useState('');
  const [styleAnchors, setStyleAnchors] = useState<string[]>([]);
  const [newStyleAnchor, setNewStyleAnchor] = useState('');
  const [isRoleplayCard, setIsRoleplayCard] = useState(false);
  const [firstMessage, setFirstMessage] = useState('');
  const [scenario, setScenario] = useState('');

  // Per-Bot Coherent Memory Bank state
  const [memoryBank, setMemoryBank] = useState<BotMemoryBank | null>(null);
  const [microYamlPreview, setMicroYamlPreview] = useState<string>('');
  const [approxPromptTokens, setApproxPromptTokens] = useState<number>(0);
  const [byteSize, setByteSize] = useState<number>(0);
  const [showYamlPreview, setShowYamlPreview] = useState<boolean>(false);
  const [memUserName, setMemUserName] = useState<string>('');
  const [memRapport, setMemRapport] = useState<string>('');
  const [memTraits, setMemTraits] = useState<string[]>([]);
  const [newTraitInput, setNewTraitInput] = useState<string>('');
  const [newShardText, setNewShardText] = useState<string>('');
  const [newShardTags, setNewShardTags] = useState<string>('');
  const [newShardWeight, setNewShardWeight] = useState<number>(4);
  const [isMemoryLoading, setIsMemoryLoading] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBotMemory = async (personaId: string) => {
    try {
      setIsMemoryLoading(true);
      const res = await fetch(`/api/personas/${encodeURIComponent(personaId)}/memory`, {
        headers: getDeviceHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.memory) {
        setMemoryBank(data.memory);
        setMemUserName(data.memory.u?.name || '');
        setMemRapport(data.memory.u?.rapport || '');
        setMemTraits(Array.isArray(data.memory.u?.traits) ? data.memory.u.traits : []);
        setMicroYamlPreview(data.microYamlPreview || '');
        setApproxPromptTokens(data.approxPromptTokens || 0);
        setByteSize(data.byteSize || 0);
      }
    } catch (e) {
      // ignore fetch error
    } finally {
      setIsMemoryLoading(false);
    }
  };

  useEffect(() => {
    if (persona && isOpen) {
      setName(persona.name);
      setDescription(persona.description || '');
      setAvatarUrl(persona.avatarUrl || '');
      setCustomUrlInput(persona.avatarUrl || '');
      setBadgeColor(persona.badgeColor || '#3b82f6');
      setAllowNsfw(Boolean(persona.allowNsfw));
      setSelectedModelId(persona.selectedModelId || (persona.id === 'pixel' ? 'cohere/north-mini-code:free' : ''));
      setIntellect(persona.intellect ?? 7);
      setThoughtfulness(persona.thoughtfulness ?? 'balanced');
      setPacingDelaySeconds(persona.pacingDelaySeconds ?? (persona.thoughtfulness === 'scholarly' ? 3.0 : persona.thoughtfulness === 'thoughtful' ? 2.2 : persona.thoughtfulness === 'quick' ? 0 : 1.0));
      setConstraints(persona.negative_constraints || []);
      setStyleAnchors(persona.style_anchor || []);
      setIsRoleplayCard(Boolean(persona.isRoleplayCard));
      setFirstMessage(persona.firstMessage || '');
      setScenario(persona.scenario || '');
      fetchBotMemory(persona.id);
    }
  }, [persona, isOpen]);

  if (!isOpen || !persona) return null;

  const handleSaveCoreMemory = async (
    nextName = memUserName,
    nextRapport = memRapport,
    nextTraits = memTraits
  ) => {
    try {
      const res = await fetch(`/api/personas/${encodeURIComponent(persona.id)}/memory`, {
        method: 'PUT',
        headers: getDeviceHeaders(),
        body: JSON.stringify({
          userName: nextName,
          rapport: nextRapport,
          traits: nextTraits,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMemoryBank(data.memory);
        setMicroYamlPreview(data.microYamlPreview || '');
        setApproxPromptTokens(data.approxPromptTokens || 0);
        setByteSize(data.byteSize || 0);
      }
    } catch (e) {}
  };

  const handleAddMemoryTrait = () => {
    const clean = newTraitInput.trim().slice(0, 45);
    if (!clean || memTraits.length >= 5) return;
    const updated = [...memTraits, clean].slice(0, 5);
    setMemTraits(updated);
    setNewTraitInput('');
    handleSaveCoreMemory(memUserName, memRapport, updated);
  };

  const handleRemoveMemoryTrait = (idx: number) => {
    const updated = memTraits.filter((_, i) => i !== idx);
    setMemTraits(updated);
    handleSaveCoreMemory(memUserName, memRapport, updated);
  };

  const handleAddMemoryShard = async () => {
    if (!newShardText.trim()) return;
    const tags = newShardTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    try {
      const res = await fetch(`/api/personas/${encodeURIComponent(persona.id)}/memory`, {
        method: 'PUT',
        headers: getDeviceHeaders(),
        body: JSON.stringify({
          addShard: {
            s: newShardText.trim().slice(0, 120),
            k: tags,
            w: newShardWeight,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMemoryBank(data.memory);
        setMicroYamlPreview(data.microYamlPreview || '');
        setApproxPromptTokens(data.approxPromptTokens || 0);
        setByteSize(data.byteSize || 0);
        setNewShardText('');
        setNewShardTags('');
      }
    } catch (e) {}
  };

  const handleDeleteMemoryShard = async (shardId: string) => {
    try {
      const res = await fetch(`/api/personas/${encodeURIComponent(persona.id)}/memory`, {
        method: 'PUT',
        headers: getDeviceHeaders(),
        body: JSON.stringify({ deleteShardId: shardId }),
      });
      if (res.ok) {
        const data = await res.json();
        setMemoryBank(data.memory);
        setMicroYamlPreview(data.microYamlPreview || '');
        setApproxPromptTokens(data.approxPromptTokens || 0);
        setByteSize(data.byteSize || 0);
      }
    } catch (e) {}
  };

  const handleResetBotMemory = async () => {
    try {
      const res = await fetch(`/api/personas/${encodeURIComponent(persona.id)}/memory`, {
        method: 'DELETE',
        headers: getDeviceHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMemoryBank(data.memory);
        setMemUserName(data.memory.u?.name || '');
        setMemRapport(data.memory.u?.rapport || '');
        setMemTraits(data.memory.u?.traits || []);
        setMicroYamlPreview(data.microYamlPreview || '');
        setApproxPromptTokens(data.approxPromptTokens || 0);
        setByteSize(data.byteSize || 0);
      }
    } catch (e) {}
  };

  const handleAddConstraint = () => {
    if (newConstraint.trim()) {
      setConstraints((prev) => [...prev, newConstraint.trim()]);
      setNewConstraint('');
    }
  };

  const handleRemoveConstraint = (index: number) => {
    setConstraints((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddStyleAnchor = () => {
    if (newStyleAnchor.trim()) {
      setStyleAnchors((prev) => [...prev, newStyleAnchor.trim()]);
      setNewStyleAnchor('');
    }
  };

  const handleRemoveStyleAnchor = (index: number) => {
    setStyleAnchors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Bot name cannot be empty.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await handleSaveCoreMemory(memUserName, memRapport, memTraits);
      await onSave(persona.id, {
        name: name.trim(),
        description: description.trim(),
        avatarUrl: customUrlInput.trim() || avatarUrl,
        badgeColor,
        allowNsfw,
        negative_constraints: constraints,
        style_anchor: styleAnchors,
        selectedModelId: selectedModelId || undefined,
        intellect,
        thoughtfulness,
        pacingDelaySeconds,
        isRoleplayCard,
        firstMessage: firstMessage.trim() || undefined,
        scenario: scenario.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update persona');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPreviewUrl = customUrlInput.trim() || avatarUrl;
  const shardCount = memoryBank?.e?.length || 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-950">
          <div>
            <h2 className="text-sm font-semibold text-white">Edit Bot: {persona.name}</h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Change name, avatar, personality, and coherent per-bot memory bank.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded bg-neutral-950 border border-red-900/80 text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Live Avatar Preview & Name Row */}
          <div className="flex items-start gap-4 p-3 bg-neutral-950 rounded border border-neutral-800">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <PersonaAvatar
                name={name || persona.name}
                avatarUrl={currentPreviewUrl}
                avatarLetter={name.charAt(0) || persona.avatarLetter}
                badgeColor={badgeColor}
                size="lg"
                allowNsfw={allowNsfw}
              />
              <span className="text-[10px] text-neutral-500">Preview</span>
            </div>

            <div className="flex-1 space-y-2.5 min-w-0">
              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                  Bot Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rook, Mira, Apex"
                  className="w-full bg-neutral-900 border border-neutral-750 rounded px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                  required
                />
              </div>

              {/* Accent Color Picker */}
              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                  Accent Color
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBadgeColor(c)}
                      className={`w-5 h-5 rounded-full transition flex items-center justify-center ${
                        badgeColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-neutral-950' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Color ${c}`}
                    >
                      {badgeColor === c && <Check size={10} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Coherent Per-Bot Memory Bank (Minified JSON + Micro-YAML <= 150 tokens) */}
          <div className="p-3 rounded border border-emerald-900/60 bg-neutral-950 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Database size={14} className="text-emerald-400" />
                <span className="font-semibold text-xs text-white">
                  Coherent Bot Memory Bank
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono tabular-nums text-neutral-400">
                <span className="text-emerald-300">{shardCount}/40 shards</span>
                <span>·</span>
                <span
                  className="text-cyan-300"
                  title="Only Top-3 relevant shards are injected per turn as Micro-YAML (capped <= 150 tokens)"
                >
                  ~{approxPromptTokens}/150 tok prompt
                </span>
                <span>·</span>
                <span>{(byteSize / 1024).toFixed(1)}/4.0 KB</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 leading-snug">
              Stored as Minified JSON on disk and injected as compact Micro-YAML. Full memory is never pushed into chat—only User Core + Top 3 matched shards (≤ 150 tokens).
            </p>

            {/* User Core (u): Name, Rapport, and 5 Traits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[10px] font-medium text-neutral-400 mb-1">
                  User Name Known By {name || persona.name}
                </label>
                <input
                  type="text"
                  value={memUserName}
                  onChange={(e) => setMemUserName(e.target.value)}
                  onBlur={() => handleSaveCoreMemory(memUserName, memRapport, memTraits)}
                  placeholder="e.g. Subhamoy"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-neutral-400 mb-1">
                  Relationship / Rapport Stance
                </label>
                <input
                  type="text"
                  value={memRapport}
                  onChange={(e) => setMemRapport(e.target.value)}
                  onBlur={() => handleSaveCoreMemory(memUserName, memRapport, memTraits)}
                  placeholder="How this bot views its dynamic with you"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-700"
                />
              </div>
            </div>

            {/* User Core Traits (max 5) */}
            <div>
              <label className="block text-[10px] font-medium text-neutral-400 mb-1">
                Core User Traits ({memTraits.length}/5 max)
              </label>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {memTraits.length === 0 ? (
                  <span className="text-[10px] text-neutral-500 italic">
                    No core user traits pinned yet.
                  </span>
                ) : (
                  memTraits.map((t, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-200"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => handleRemoveMemoryTrait(idx)}
                        className="text-neutral-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
              {memTraits.length < 5 && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newTraitInput}
                    onChange={(e) => setNewTraitInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMemoryTrait())}
                    placeholder="Add core trait (e.g. builds AI apps, prefers direct answers)"
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-700"
                  />
                  <button
                    type="button"
                    onClick={handleAddMemoryTrait}
                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-[11px]"
                  >
                    + Trait
                  </button>
                </div>
              )}
            </div>

            {/* Episodic Memory Shards (e) */}
            <div className="pt-1 border-t border-neutral-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-neutral-300">
                  Episodic Memory Shards (Auto-captured via [MEM: ...] & keyword-scored)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowYamlPreview(!showYamlPreview)}
                    className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    <Eye size={11} />
                    {showYamlPreview ? 'Hide Prompt YAML' : 'Inspect Prompt YAML'}
                  </button>
                  {shardCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetBotMemory}
                      className="inline-flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      <Trash2 size={11} />
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {showYamlPreview && (
                <div className="mb-2 p-2 rounded bg-black/70 border border-cyan-900/60 font-mono text-[10px] text-cyan-200 whitespace-pre-wrap leading-relaxed">
                  {microYamlPreview || '[Memory]: Empty'}
                </div>
              )}

              <div className="space-y-1 max-h-32 overflow-y-auto pr-1 mb-2">
                {isMemoryLoading ? (
                  <div className="text-[11px] text-neutral-500 py-1">Loading bot memory...</div>
                ) : shardCount === 0 ? (
                  <div className="text-[11px] text-neutral-500 italic py-1">
                    No episodic memories recorded yet. Chat with {name || persona.name} or pin a memory below!
                  </div>
                ) : (
                  memoryBank?.e.map((shard) => (
                    <div
                      key={shard.id}
                      className="flex items-start justify-between gap-2 p-1.5 rounded bg-neutral-900/90 border border-neutral-800 text-[11px]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-neutral-200 break-words leading-snug">{shard.s}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                            w:{shard.w}
                          </span>
                          {shard.k?.map((tag, i) => (
                            <span
                              key={i}
                              className="text-[9px] font-mono px-1 rounded bg-neutral-950 text-neutral-400 border border-neutral-800"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMemoryShard(shard.id)}
                        className="text-neutral-500 hover:text-red-400 p-0.5 shrink-0"
                        title="Delete shard"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Manual Memory Shard */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
                <input
                  type="text"
                  value={newShardText}
                  onChange={(e) => setNewShardText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMemoryShard())}
                  placeholder="Pin a memory fact (≤ 120 chars)..."
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-700"
                />
                <div className="flex items-center gap-1.5">
                  <select
                    value={newShardWeight}
                    onChange={(e) => setNewShardWeight(Number(e.target.value))}
                    className="bg-neutral-900 border border-neutral-800 rounded px-1.5 py-1 text-[11px] text-neutral-300"
                    title="Salience Weight (1-5)"
                  >
                    <option value={5}>w:5 (Core)</option>
                    <option value={4}>w:4 (High)</option>
                    <option value={3}>w:3 (Med)</option>
                    <option value={2}>w:2 (Low)</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddMemoryShard}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-medium shrink-0 cursor-pointer"
                  >
                    <Plus size={12} />
                    Pin
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Change Profile Picture */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-300 mb-1.5">
              Change Profile Picture
            </label>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 mb-2">
              {PRESET_AVATARS.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => {
                    setAvatarUrl(preset.url);
                    setCustomUrlInput(preset.url);
                  }}
                  className={`relative rounded-full aspect-square overflow-hidden border transition ${
                    currentPreviewUrl === preset.url
                      ? 'border-white ring-1 ring-white'
                      : 'border-neutral-800 hover:border-neutral-600 opacity-70 hover:opacity-100'
                  }`}
                  title={preset.name}
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Custom URL Input */}
            <input
              type="url"
              value={customUrlInput}
              onChange={(e) => {
                setCustomUrlInput(e.target.value);
                setAvatarUrl(e.target.value);
              }}
              placeholder="Or enter image URL (https://...)"
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>

          {/* Personality / Role Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium text-neutral-300">
                Personality & Role Description
              </label>
              <span className="text-[10px] font-mono tabular-nums text-neutral-500">
                {description.length}/420 chars
              </span>
            </div>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="How does this persona interact and debate?"
              className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>

          {/* Adaptive Roleplay & 1-on-1 Greeting Settings */}
          <div className="p-3 rounded border border-neutral-800 bg-neutral-950 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-400" />
                  <span className="font-semibold text-xs text-white">
                    Adaptive Roleplay & Character Mode
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                  In 1-on-1 chats, enables expressive roleplay (*actions*, 1–2 paragraphs, and opening greeting). In multi-bot group chats, stays concise (1–3 sentences).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleplayCard(!isRoleplayCard)}
                className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                  isRoleplayCard ? 'bg-emerald-600' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    isRoleplayCard ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {(isRoleplayCard || firstMessage || scenario) && (
              <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                <div>
                  <label className="block text-[10px] font-medium text-neutral-400 mb-1">
                    Active Scenario / Setting Context (Injected in 1-on-1 RP)
                  </label>
                  <input
                    type="text"
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                    placeholder="e.g. Late night in the Neo-Veridia archive..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-neutral-400 mb-1">
                    1-on-1 Opening Greeting (first_mes — auto-sent when starting a 1-on-1 chat)
                  </label>
                  <textarea
                    rows={2}
                    value={firstMessage}
                    onChange={(e) => setFirstMessage(e.target.value)}
                    placeholder="Optional opening greeting when starting a new 1-on-1 chat with this character..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dedicated AI Model Selector */}
          <div className="p-3 rounded border border-neutral-800 bg-neutral-950 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-white">
                Dedicated AI Model
              </label>
              <span className="text-[10px] text-cyan-400 font-mono font-medium truncate max-w-[200px]">
                {selectedModelId || (persona.id === 'pixel' ? 'cohere/north-mini-code:free (Default)' : 'Room Default')}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Assign a custom model override for {name || persona.name} (Groq LPU, Cohere SDK, or OpenRouter reasoning models).
            </p>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-600 cursor-pointer"
            >
              <option value="">(Use Active Room Default Model)</option>
              {availableModels && availableModels.length > 0 ? (
                availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="auto/smart-routing">⚡ Auto-Switch / Smart Route (Best Available)</option>
                  <option value="@cf/zai-org/glm-4.7-flash">GLM: 4.7 Flash (Cloudflare Workers AI)</option>
                  <option value="@cf/qwen/qwen3-30b-a3b-fp8">Qwen: Qwen3 30B A3B FP8 (Cloudflare Workers AI)</option>
                  <option value="llama-3.3-70b-versatile">Meta: Llama 3.3 70B Versatile (Groq LPU)</option>
                  <option value="llama-3.1-8b-instant">Meta: Llama 3.1 8B Instant (Groq LPU)</option>
                  <option value="openai/gpt-oss-120b">OpenAI: GPT-OSS 120B (Groq LPU)</option>
                  <option value="openai/gpt-oss-20b">OpenAI: GPT-OSS 20B (Groq LPU)</option>
                  <option value="deepseek-r1-distill-llama-70b">DeepSeek: R1 Distill Llama 70B (Groq LPU)</option>
                  <option value="qwen-2.5-32b">Qwen: Qwen 2.5 32B (Groq LPU)</option>
                  <option value="cognitivecomputations/dolphin-mistral-24b-venice-edition">Dolphin: Mistral 24B Venice Edition (OpenRouter)</option>
                  <option value="openrouter/free">OpenRouter: Dynamic Free Auto-Route (OpenRouter)</option>
                  <option value="cohere/north-mini-code:free">Cohere: North Mini Code (OpenRouter SDK - Pixel Default)</option>
                  <option value="meta-llama/llama-3.3-70b-instruct">Meta: Llama 3.3 70B Instruct (OpenRouter)</option>
                  <option value="meta/llama-3.2-11b-vision-instruct">Meta: Llama 3.2 11B (NVIDIA NIM)</option>
                  <option value="meta/llama-3.2-90b-vision-instruct">Meta: Llama 3.2 90B (NVIDIA NIM)</option>
                </>
              )}
            </select>
          </div>

          {/* Intellect & Thoughtful Response Pacing */}
          <div className="p-3 rounded border border-neutral-800 bg-neutral-950 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Brain size={14} className="text-cyan-400" />
                <span className="font-semibold text-xs text-white">Intellect & Response Pacing</span>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono font-medium px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/80">
                +{pacingDelaySeconds}s thoughtful pause
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Bots with higher intellect or thoughtful traits contemplate for 2–3s before speaking, preventing rapid-fire scripts and creating an organic group debate.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
              {[
                { key: 'quick', label: 'Quick', delay: 0, desc: 'Instant (0s)' },
                { key: 'balanced', label: 'Balanced', delay: 1.0, desc: 'Natural (+1s)' },
                { key: 'thoughtful', label: 'Thoughtful', delay: 2.2, desc: 'Analytical (+2.2s)' },
                { key: 'scholarly', label: 'Scholarly', delay: 3.0, desc: 'Deep research (+3s)' },
              ].map((tier) => (
                <button
                  key={tier.key}
                  type="button"
                  onClick={() => {
                    setThoughtfulness(tier.key as ThoughtfulnessLevel);
                    setPacingDelaySeconds(tier.delay);
                    setIntellect(tier.key === 'scholarly' ? 9 : tier.key === 'thoughtful' ? 8 : tier.key === 'balanced' ? 6 : 4);
                  }}
                  className={`p-2 rounded-lg text-left border transition cursor-pointer ${
                    thoughtfulness === tier.key
                      ? 'bg-neutral-800 border-white text-white shadow-xs ring-1 ring-white/20'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <div className="font-bold text-xs">{tier.label}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">{tier.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 18+ NSFW Clearance */}
          <div className="p-2.5 rounded border border-neutral-800 bg-neutral-950 flex items-center justify-between gap-3">
            <div>
              <span className="font-medium text-xs text-white">18+ NSFW Clearance</span>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Allow this bot to engage in uncensored candid discourse when NSFW mode is on.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAllowNsfw(!allowNsfw)}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                allowNsfw ? 'bg-rose-600' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  allowNsfw ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Negative Constraints (Rules) */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-300 mb-1">
              Negative Constraints (What they must NOT do)
            </label>
            <div className="space-y-1 mb-2 max-h-24 overflow-y-auto pr-1">
              {constraints.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-1.5 bg-neutral-950 rounded border border-neutral-800 text-[11px] text-neutral-300"
                >
                  <span className="truncate">· {rule}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveConstraint(idx)}
                    className="text-neutral-500 hover:text-white shrink-0 text-[10px]"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newConstraint}
                onChange={(e) => setNewConstraint(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddConstraint())}
                placeholder="Add rule (e.g. Do NOT apologize)"
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
              />
              <button
                type="button"
                onClick={handleAddConstraint}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs"
              >
                Add
              </button>
            </div>
          </div>

          {/* Style Anchors */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-300 mb-1">
              Style Anchors (Sample quotes of how they talk)
            </label>
            <div className="space-y-1 mb-2 max-h-24 overflow-y-auto pr-1">
              {styleAnchors.map((anchor, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-1.5 bg-neutral-950 rounded border border-neutral-800 text-[11px] text-neutral-300 italic"
                >
                  <span className="truncate">"{anchor}"</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveStyleAnchor(idx)}
                    className="text-neutral-500 hover:text-white shrink-0 text-[10px] not-italic"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newStyleAnchor}
                onChange={(e) => setNewStyleAnchor(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStyleAnchor())}
                placeholder='e.g. "source?" or "that makes zero sense."'
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
              />
              <button
                type="button"
                onClick={handleAddStyleAnchor}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs"
              >
                Add
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-neutral-800 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium bg-white hover:bg-neutral-200 text-black rounded transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
