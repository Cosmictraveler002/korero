import React, { useState, useRef } from 'react';
import { X, Check, Brain, Upload, FileJson, Sparkles, Database, Plus } from 'lucide-react';
import { Persona, ThoughtfulnessLevel, ModelOption, CharacterImportAnalysis, ApiKeyItem } from '../types';
import { PersonaAvatar } from './PersonaAvatar';

interface CreatePersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (persona: Partial<Persona>) => Promise<void>;
  globalNsfwEnabled: boolean;
  availableModels?: ModelOption[];
}

const PRESET_AVATARS = [
  { name: 'Tactical Analyst', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=TacticalAnalyst&backgroundColor=1e293b' },
  { name: 'Researcher', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Researcher&backgroundColor=0f172a' },
  { name: 'Philosopher', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Philosopher&backgroundColor=1e1b4b' },
  { name: 'Strategist', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Strategist&backgroundColor=172554' },
  { name: 'Technologist', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Technologist' },
  { name: 'Engineer', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Engineer' },
  { name: 'Scholar', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Scholar&backgroundColor=27272a' },
  { name: 'Creative Writer', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Writer&backgroundColor=31102F' },
  { name: 'Curator', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Curator&backgroundColor=14281D' },
  { name: 'Critic', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Critic' },
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

const SAMPLE_TAVERN_V2_CARD = {
  spec: 'chara_card_v2',
  spec_version: '2.0',
  data: {
    name: 'Seraphina Vance',
    description:
      '{{char}} is a sharp-tongued cyber-archaeologist and relic broker operating out of Sector 9 in Neo-Veridia. She wears a weathered trench coat lined with optical decoders and speaks with dry, cinematic wit. In 2142, {{char}} recovered the Chronos Shard from the sunken archives of Old Kyoto, earning a permanent bounty from the Syndicate. She secretly brews real highland oolong tea in her workshop and distrusts corporate AI synthetics.',
    personality: 'Observant, sardonic, fiercely independent, protective of rare historical artifacts, secretly warm to trusted partners.',
    scenario: '{{user}} enters {{char}}\'s dimly lit relic workshop in Sector 9 during a neon rainstorm, carrying an encrypted pre-collapse data core.',
    first_mes:
      '*{{char}} lowers her brass loupe, the rain tapping a steady rhythm against the reinforced glass of her workshop. She eyes the encrypted data core in your hands before taking a slow sip from a chipped porcelain teacup.*\n\n"Door\'s locked for a reason, {{user}}. Either you\'re Syndicate—in which case you\'re terrible at ambushes—or you actually know what that pre-collapse core is worth. Let\'s see it."',
    mes_example:
      '<START>\n{{user}}: Can you crack this encryption?\n{{char}}: *She scoffs softly, tapping a fingernail against the casing.* "Please. I cracked military-grade Blackwall ciphers before breakfast. Give me three minutes and don\'t touch the Soldering array."\n<START>\n{{user}}: Why do you care so much about old history?\n{{char}}: "Because the people who rewrote the textbooks deleted the best parts. Somebody has to keep the receipts."',
    system_prompt: 'Never speak or act for {{user}}. Maintain {{char}}\'s dry, observant noir tone.',
    tags: ['sci-fi', 'roleplay', 'detective', 'cyberpunk'],
    character_book: {
      entries: [
        {
          keys: ['chronos', 'shard', 'kyoto', 'bounty'],
          content: 'Seraphina stole the Chronos Shard from the sunken Kyoto archives in 2142, placing a 500,000-credit Syndicate bounty on her head.',
          enabled: true,
        },
        {
          keys: ['tea', 'oolong', 'workshop'],
          content: 'Seraphina hoards real pre-collapse highland oolong tea in her Sector 9 workshop and only shares a cup with people she trusts.',
          enabled: true,
        },
      ],
    },
  },
};

function getClientAuthHeadersFromStorage(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const devId = localStorage.getItem('korero_device_id') || 'dev-local';
    headers['x-device-id'] = devId;
    const rawKeys = localStorage.getItem('korero_device_keys');
    if (rawKeys) {
      const parsed: ApiKeyItem[] = JSON.parse(rawKeys);
      if (Array.isArray(parsed)) {
        const cleanVal = (v?: string) => (v ? v.replace(/[^\x20-\x7E]/g, '').trim() : '');
        const groq = parsed.find((k) => k.provider === 'groq' && k.isActive && (k.rawKey || k.key));
        const cf = parsed.find((k) => k.provider === 'cloudflare' && k.isActive && (k.rawKey || k.key));
        const or = parsed.find((k) => k.provider === 'openrouter' && k.isActive && (k.rawKey || k.key));
        const nv = parsed.find((k) => k.provider === 'nvidia' && k.isActive && (k.rawKey || k.key));
        if (groq) headers['x-groq-key'] = cleanVal(groq.rawKey || groq.key);
        if (cf) headers['x-cloudflare-key'] = cleanVal(cf.rawKey || cf.key);
        if (or) headers['x-openrouter-key'] = cleanVal(or.rawKey || or.key);
        if (nv) headers['x-nvidia-key'] = cleanVal(nv.rawKey || nv.key);
      }
    }
  } catch (e) {}
  return headers;
}

export const CreatePersonaModal: React.FC<CreatePersonaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  globalNsfwEnabled,
  availableModels,
}) => {
  const [mode, setMode] = useState<'manual' | 'import'>('manual');
  const [rawJsonInput, setRawJsonInput] = useState<string>('');
  const [importedFileName, setImportedFileName] = useState<string>('');
  const [isAnalyzingJson, setIsAnalyzingJson] = useState<boolean>(false);
  const [importSummary, setImportSummary] = useState<{
    cardFormat: string;
    distilledByAi: boolean;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(PRESET_AVATARS[0].url);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [badgeColor, setBadgeColor] = useState('#3b82f6');
  const [allowNsfw, setAllowNsfw] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [intellect, setIntellect] = useState<number>(6);
  const [thoughtfulness, setThoughtfulness] = useState<ThoughtfulnessLevel>('balanced');
  const [pacingDelaySeconds, setPacingDelaySeconds] = useState<number>(1.0);

  // Adaptive Roleplay & Memory Shards state
  const [isRoleplayCard, setIsRoleplayCard] = useState<boolean>(false);
  const [firstMessage, setFirstMessage] = useState<string>('');
  const [scenario, setScenario] = useState<string>('');
  const [userRapport, setUserRapport] = useState<string>('');
  const [extractedShards, setExtractedShards] = useState<Array<{ s: string; k: string[]; w: number }>>([]);
  const [newShardDraft, setNewShardDraft] = useState<string>('');

  const [constraints, setConstraints] = useState<string[]>([
    'Do NOT apologize or give generic AI disclaimers.',
    'Never speak or write dialogue lines on behalf of the user.',
  ]);
  const [newConstraint, setNewConstraint] = useState('');

  const [styleAnchors, setStyleAnchors] = useState<string[]>([
    'let us get straight to the point.',
  ]);
  const [newStyleAnchor, setNewStyleAnchor] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const applyImportAnalysis = (analysis: CharacterImportAnalysis) => {
    setName(analysis.name || '');
    setDescription(analysis.description || '');
    if (analysis.avatarUrl) {
      setAvatarUrl(analysis.avatarUrl);
      setCustomUrlInput(analysis.avatarUrl);
    } else {
      const generatedAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(analysis.name || 'Char')}&backgroundColor=1e293b`;
      setAvatarUrl(generatedAvatar);
      setCustomUrlInput(generatedAvatar);
    }
    setAllowNsfw(Boolean(analysis.allowNsfw));
    setIsRoleplayCard(Boolean(analysis.isRoleplayCard));
    setFirstMessage(analysis.firstMessage || '');
    setScenario(analysis.scenario || '');
    setUserRapport(analysis.userRapport || '');
    if (Array.isArray(analysis.style_anchor) && analysis.style_anchor.length > 0) {
      setStyleAnchors(analysis.style_anchor);
    }
    if (Array.isArray(analysis.negative_constraints) && analysis.negative_constraints.length > 0) {
      setConstraints(analysis.negative_constraints);
    }
    setExtractedShards(Array.isArray(analysis.extractedShards) ? analysis.extractedShards : []);
    setIntellect(analysis.intellect || 7);
    setThoughtfulness(analysis.thoughtfulness || 'balanced');
    setPacingDelaySeconds(analysis.pacingDelaySeconds ?? 1.0);
    setImportSummary({
      cardFormat: analysis.cardFormat || 'Character Card JSON',
      distilledByAi: Boolean(analysis.distilledByAi),
    });
  };

  const handleAnalyzeJsonCard = async (jsonStringToAnalyze?: string) => {
    const targetJson = (jsonStringToAnalyze ?? rawJsonInput).trim();
    if (!targetJson) {
      setError('Paste a JSON character card or upload a .json file first.');
      return;
    }

    try {
      setIsAnalyzingJson(true);
      setError(null);
      const res = await fetch('/api/personas/import-analyze', {
        method: 'POST',
        headers: getClientAuthHeadersFromStorage(),
        body: JSON.stringify({ rawJson: targetJson }),
      });
      const data = await res.json();
      if (!res.ok || !data.analysis) {
        throw new Error(data.error || 'Failed to analyze character JSON');
      }
      applyImportAnalysis(data.analysis);
    } catch (err: any) {
      setError(err?.message || 'Could not parse or distill character JSON.');
    } finally {
      setIsAnalyzingJson(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportedFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = String(ev.target?.result || '');
      setRawJsonInput(content);
      await handleAnalyzeJsonCard(content);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleCard = async () => {
    const formatted = JSON.stringify(SAMPLE_TAVERN_V2_CARD, null, 2);
    setImportedFileName('seraphina_vance_v2.json');
    setRawJsonInput(formatted);
    await handleAnalyzeJsonCard(formatted);
  };

  const handleAddExtractedShard = () => {
    const clean = newShardDraft.trim().slice(0, 120);
    if (!clean) return;
    const autoTags = clean
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3)
      .slice(0, 4);
    setExtractedShards((prev) => [
      ...prev,
      { s: clean, k: autoTags.length > 0 ? autoTags : ['lore'], w: 4 },
    ]);
    setNewShardDraft('');
  };

  const handleRemoveExtractedShard = (idx: number) => {
    setExtractedShards((prev) => prev.filter((_, i) => i !== idx));
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
      setError('Please provide a name for the bot.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        name: name.trim(),
        description: description.trim() || `${name} is an active participant in Kōrero chat.`,
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
        initialMemoryShards: extractedShards.length > 0 ? extractedShards : undefined,
        userRapport: userRapport.trim() || undefined,
      });
      onClose();
      // Reset state
      setName('');
      setDescription('');
      setCustomUrlInput('');
      setRawJsonInput('');
      setImportedFileName('');
      setImportSummary(null);
      setFirstMessage('');
      setScenario('');
      setExtractedShards([]);
      setIsRoleplayCard(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to create bot persona');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPreviewUrl = customUrlInput.trim() || avatarUrl;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-950">
          <div>
            <h2 className="text-sm font-semibold text-white">Create or Import Bot Persona</h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Build a custom persona or intelligently distill a SillyTavern / V2 / V3 character JSON card.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Switcher Segmented Control */}
        <div className="px-4 pt-3 bg-neutral-900 shrink-0">
          <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`py-1.5 px-3 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                mode === 'manual'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Manual Persona Setup
            </button>
            <button
              type="button"
              onClick={() => setMode('import')}
              className={`py-1.5 px-3 rounded-md text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                mode === 'import'
                  ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-800/70 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileJson size={13} />
              Import JSON Character Card
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded bg-neutral-950 border border-red-900/80 text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Intelligent JSON Importer Panel */}
          {mode === 'import' && (
            <div className="p-3 rounded border border-neutral-800 bg-neutral-950 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    Intelligent Character Card Compiler
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Supports SillyTavern & TavernAI V1 / V2 / V3, Character.AI, and custom JSON. Distills voice and converts lorebooks into Memory Shards.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSampleCard}
                  className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[11px] text-neutral-200 transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  Load Sample Tavern V2 Card
                </button>
              </div>

              {/* Upload .json file or Paste Raw JSON */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded border border-dashed border-neutral-700 hover:border-emerald-600 bg-neutral-900/70 hover:bg-neutral-900 text-neutral-200 transition cursor-pointer"
                >
                  <Upload size={14} className="text-emerald-400 shrink-0" />
                  <span className="truncate">
                    {importedFileName ? `Loaded: ${importedFileName}` : 'Upload .json Character Card File'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isAnalyzingJson || !rawJsonInput.trim()}
                  onClick={() => handleAnalyzeJsonCard()}
                  className="py-2 px-3.5 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-medium transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Sparkles size={13} />
                  {isAnalyzingJson ? 'Distilling Card...' : 'Analyze & Distill JSON'}
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-neutral-400 mb-1">
                  Or Paste Raw Character JSON
                </label>
                <textarea
                  rows={4}
                  value={rawJsonInput}
                  onChange={(e) => setRawJsonInput(e.target.value)}
                  placeholder='{"spec": "chara_card_v2", "data": {"name": "...", "description": "...", "first_mes": "...", "mes_example": "..."}}'
                  className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 font-mono text-[11px] text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-emerald-700"
                />
              </div>

              {/* Clean Unboxed Distillation Metadata Summary */}
              {importSummary && (
                <div className="pt-2 border-t border-neutral-800/80 flex items-center gap-2 flex-wrap text-[11px] text-emerald-300 font-mono tabular-nums">
                  <span>{importSummary.cardFormat}</span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span>{extractedShards.length} Lore Shards Seeded</span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span>{isRoleplayCard ? 'Adaptive 1-on-1 RP Mode' : 'Standard Chat Mode'}</span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span className="text-neutral-400">
                    {importSummary.distilledByAi ? 'AI + NLP Distilled' : 'Deterministic NLP Distilled'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Live Avatar Preview & Name Row */}
          <div className="flex items-start gap-4 p-3 bg-neutral-950 rounded border border-neutral-800">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <PersonaAvatar
                name={name || 'New Bot'}
                avatarUrl={currentPreviewUrl}
                avatarLetter={name.charAt(0) || 'N'}
                badgeColor={badgeColor}
                size="lg"
                allowNsfw={allowNsfw}
              />
              <span className="text-[10px] text-neutral-500">Preview</span>
            </div>

            <div className="flex-1 space-y-2.5 min-w-0">
              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                  Bot / Character Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Seraphina Vance, Apex, Solon"
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

          {/* Select Profile Picture */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-300 mb-1.5">
              Select Profile Picture
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
                  <img
                    src={preset.url}
                    alt={preset.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
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
              placeholder="Or enter direct image URL (https://...)"
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>

          {/* Distilled Core Identity & Voice */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium text-neutral-300">
                Core Identity & Voice Description
              </label>
              <span className="text-[10px] text-neutral-500 font-mono tabular-nums">
                {description.length}/420 chars
              </span>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Concise 2-4 sentence summary of core personality, speaking voice, and role..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>

          {/* Adaptive Roleplay Mode & Opening Greeting (1-on-1 vs Group Chat) */}
          <div className="p-3 rounded border border-neutral-800 bg-neutral-950 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-xs text-white">
                  Adaptive Roleplay & Character Mode
                </span>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Uses expressive roleplay (*actions*, rich prose, and opening greeting) in 1-on-1 chats, while automatically adapting to concise 1–3 sentence banter in group chats.
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

            {isRoleplayCard && (
              <div className="space-y-2 pt-1 border-t border-neutral-800/80">
                <div>
                  <label className="block text-[10px] font-medium text-neutral-400 mb-1">
                    1-on-1 Opening Scene / Greeting (first_mes)
                  </label>
                  <textarea
                    rows={2}
                    value={firstMessage}
                    onChange={(e) => setFirstMessage(e.target.value)}
                    placeholder="Optional opening message automatically sent when starting a 1-on-1 chat with this character..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-neutral-400 mb-1">
                      Scenario Context
                    </label>
                    <input
                      type="text"
                      value={scenario}
                      onChange={(e) => setScenario(e.target.value)}
                      placeholder="e.g. Late night in Sector 9 relic shop"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-neutral-400 mb-1">
                      Initial User Rapport Stance
                    </label>
                    <input
                      type="text"
                      value={userRapport}
                      onChange={(e) => setUserRapport(e.target.value)}
                      placeholder="How this character initially views you"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Seeded Lore & Backstory Memory Shards (Converted from Character Card) */}
          {(mode === 'import' || extractedShards.length > 0) && (
            <div className="p-3 rounded border border-emerald-900/60 bg-neutral-950 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Database size={13} className="text-emerald-400" />
                  <span className="font-semibold text-xs text-white">
                    Distilled Lore & Backstory Memory Shards
                  </span>
                </div>
                <span className="text-[10px] font-mono tabular-nums text-emerald-300">
                  {extractedShards.length} shards → Memory Bank
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-snug">
                Instead of bloating every prompt with the full character card, these lore and backstory facts are stored in {name || 'the bot'}'s Memory Bank and recalled selectively (Top 3 ≤ 150 tokens).
              </p>

              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {extractedShards.length === 0 ? (
                  <div className="text-[11px] text-neutral-500 italic py-1">
                    No lore shards extracted yet. Analyze a JSON card or add a shard below.
                  </div>
                ) : (
                  extractedShards.map((sh, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-2 p-1.5 rounded bg-neutral-900 border border-neutral-800 text-[11px]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-neutral-200 break-words">{sh.s}</div>
                        <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                          w:{sh.w} · {sh.k.map((t) => `#${t}`).join(' ')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExtractedShard(idx)}
                        className="text-neutral-500 hover:text-red-400 p-0.5 shrink-0"
                        title="Remove shard"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={newShardDraft}
                  onChange={(e) => setNewShardDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExtractedShard())}
                  placeholder="Add custom lore/backstory shard (≤ 120 chars)..."
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-700"
                />
                <button
                  type="button"
                  onClick={handleAddExtractedShard}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs cursor-pointer shrink-0"
                >
                  <Plus size={12} />
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Dedicated AI Model Selector */}
          <div className="p-3 rounded border border-neutral-800 bg-neutral-950 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-white">
                Dedicated AI Model
              </label>
              <span className="text-[10px] text-cyan-400 font-mono font-medium truncate max-w-[200px]">
                {selectedModelId || 'Room Default'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Assign a dedicated model or leave default to inherit room settings.
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
                  <option value="openrouter/free">OpenRouter: Dynamic Free Auto-Route (OpenRouter)</option>
                  <option value="cohere/north-mini-code:free">Cohere: North Mini Code (OpenRouter SDK)</option>
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
              <span className="text-[10px] text-cyan-400 font-mono tabular-nums font-medium">
                +{pacingDelaySeconds}s thoughtful pause
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Bots with higher intellect pause 2–3s before speaking, preventing rapid-fire scripts.
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
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
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
                placeholder="Add rule (e.g. Do NOT use bullet points)"
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
              Style Anchors (Sample quotes & dialogue from mes_example)
            </label>
            <div className="space-y-1 mb-2 max-h-28 overflow-y-auto pr-1">
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
                placeholder='e.g. "let us be honest here."'
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
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium bg-white hover:bg-neutral-200 text-black rounded transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting
                ? 'Creating...'
                : mode === 'import'
                ? 'Create Imported Persona'
                : 'Create Persona'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
