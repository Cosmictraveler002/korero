import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Persona } from '../types';
import { PersonaAvatar } from './PersonaAvatar';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Persona[];
  onStartChat: (topicLabel: string, allowedPersonaIds: string[]) => Promise<void>;
  nsfwMode: boolean;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  personas,
  onStartChat,
  nsfwMode,
}) => {
  const [topicLabel, setTopicLabel] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(personas.map((p) => p.id));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const togglePersona = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // Keep at least one bot
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectAll = () => {
    setSelectedIds(personas.map((p) => p.id));
  };

  const clearAll = () => {
    if (personas.length > 0) {
      setSelectedIds([personas[0].id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setError('Please select at least one bot to participate in this conversation.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onStartChat(topicLabel.trim() || 'New Discussion', selectedIds);
      onClose();
      setTopicLabel('');
      setSelectedIds(personas.map((p) => p.id));
    } catch (err: any) {
      setError(err?.message || 'Failed to start chat');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-950">
          <div>
            <h2 className="text-sm font-semibold text-white">Start New Conversation</h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Choose which bots are allowed in this conversation.
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

          {/* Topic Label */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-300 mb-1">
              Conversation Topic / Title
            </label>
            <input
              type="text"
              value={topicLabel}
              onChange={(e) => setTopicLabel(e.target.value)}
              placeholder="e.g. Artificial General Intelligence, Philosophy of Mind..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
              autoFocus
            />
          </div>

          {/* Bot Selection Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-neutral-300">
                Allowed Bots ({selectedIds.length} of {personas.length} selected)
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-neutral-400 hover:text-white transition"
                >
                  Select All
                </button>
                <span className="text-neutral-600">·</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-neutral-400 hover:text-white transition"
                >
                  Clear Others
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {personas.map((persona) => {
                const isSelected = selectedIds.includes(persona.id);
                return (
                  <div
                    key={persona.id}
                    onClick={() => togglePersona(persona.id)}
                    className={`p-2.5 rounded border transition cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-neutral-800/60 border-neutral-700 text-white'
                        : 'bg-neutral-950/40 border-neutral-850 text-neutral-400 opacity-60 hover:opacity-85'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PersonaAvatar
                        name={persona.name}
                        avatarUrl={persona.avatarUrl}
                        avatarLetter={persona.avatarLetter}
                        badgeColor={persona.badgeColor}
                        size="md"
                        allowNsfw={persona.allowNsfw}
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-xs truncate">
                            {persona.name}
                          </span>
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: persona.badgeColor }}
                          />
                          {persona.allowNsfw && (
                            <span className="text-[10px] text-rose-400">
                              · NSFW
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                          {persona.description}
                        </p>
                      </div>
                    </div>

                    {/* Checkbox indicator */}
                    <div
                      className={`w-4.5 h-4.5 rounded flex items-center justify-center shrink-0 border transition ${
                        isSelected
                          ? 'bg-white border-white text-black'
                          : 'border-neutral-700 bg-neutral-900'
                      }`}
                    >
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-neutral-500 mt-2">
              Only the checked bots will participate in turns and respond in this conversation.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedIds.length === 0}
              className="px-4 py-1.5 text-xs font-medium bg-white hover:bg-neutral-200 text-black rounded transition disabled:opacity-50"
            >
              {isSubmitting ? 'Starting...' : 'Start Conversation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
