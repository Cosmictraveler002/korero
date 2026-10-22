import React, { useState } from 'react';
import { X, Sparkles, Check, Shuffle } from 'lucide-react';
import {
  KORERO_CHARACTERS,
  EXPRESSION_LABELS,
  ExpressionType,
  KoreroCharacter,
} from '../data/characters';
import { KoreroCharacterSvg } from './KoreroCharacterSvg';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarName: string;
  onSelectAvatar: (character: KoreroCharacter, defaultExpr: ExpressionType) => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  currentAvatarName,
  onSelectAvatar,
}) => {
  const [selectedCharacter, setSelectedCharacter] = useState<KoreroCharacter>(() => {
    const found = KORERO_CHARACTERS.find(
      (c) => c.name.toLowerCase() === currentAvatarName.toLowerCase()
    );
    return found || KORERO_CHARACTERS[6]; // Koa default
  });

  const [previewExpression, setPreviewExpression] = useState<ExpressionType>(
    selectedCharacter.defaultExpression || 'happy'
  );

  if (!isOpen) return null;

  const expressionsList: ExpressionType[] = [
    'happy',
    'laugh',
    'love',
    'shock',
    'sideeye',
    'sleepy',
    'sad',
    'thinking',
  ];

  const handleSurpriseMe = () => {
    const randomChar =
      KORERO_CHARACTERS[Math.floor(Math.random() * KORERO_CHARACTERS.length)];
    const randomExpr =
      expressionsList[Math.floor(Math.random() * expressionsList.length)];
    setSelectedCharacter(randomChar);
    setPreviewExpression(randomExpr);
  };

  const handleSave = () => {
    onSelectAvatar(selectedCharacter, previewExpression);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
              <Sparkles size={16} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Choose Your Kōrero Avatar
              </h2>
              <p className="text-[11px] text-neutral-400">
                Select your mascot identity and favorite expression
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Preview Card */}
        <div className="p-5 bg-gradient-to-b from-neutral-950 to-neutral-900 flex flex-col items-center justify-center border-b border-neutral-800 text-center relative">
          <button
            onClick={handleSurpriseMe}
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium flex items-center gap-1.5 transition"
            title="Surprise me!"
          >
            <Shuffle size={12} />
            <span>Surprise Me</span>
          </button>

          <div className="w-28 h-28 flex items-center justify-center mb-2">
            <KoreroCharacterSvg
              character={selectedCharacter}
              expression={previewExpression}
              size={110}
              animate={true}
            />
          </div>

          <h3 className="text-base font-bold text-white flex items-center gap-1.5">
            {selectedCharacter.name}
            <span
              className="text-[10px] px-2 py-0.5 rounded-full text-black font-semibold uppercase tracking-wider"
              style={{ backgroundColor: selectedCharacter.accent }}
            >
              {selectedCharacter.accentName}
            </span>
          </h3>

          <p className="text-xs text-neutral-400 max-w-sm mt-1">
            "{selectedCharacter.catchphrase}"
          </p>
          <span className="text-[11px] text-neutral-500 mt-0.5">
            {selectedCharacter.vibe}
          </span>
        </div>

        {/* Expression Selector */}
        <div className="p-3 border-b border-neutral-800 bg-neutral-950/40">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-2 px-1">
            Default Expression
          </span>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
            {expressionsList.map((expr) => (
              <button
                key={expr}
                onClick={() => setPreviewExpression(expr)}
                className={`py-1.5 px-1 rounded-lg text-center flex flex-col items-center gap-0.5 transition ${
                  previewExpression === expr
                    ? 'bg-neutral-800 border border-neutral-700 text-white shadow-xs'
                    : 'bg-neutral-900/60 hover:bg-neutral-850 text-neutral-400 hover:text-white border border-transparent'
                }`}
              >
                <span className="text-sm">{EXPRESSION_LABELS[expr].emoji}</span>
                <span className="text-[9px] capitalize">{expr}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Character Roster Grid */}
        <div className="p-4 flex-1 overflow-y-auto max-h-56">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-2">
            Select Character
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {KORERO_CHARACTERS.map((char) => {
              const isSelected = selectedCharacter.id === char.id;
              return (
                <button
                  key={char.id}
                  onClick={() => {
                    setSelectedCharacter(char);
                    setPreviewExpression(char.defaultExpression);
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition text-left ${
                    isSelected
                      ? 'bg-neutral-800/90 border-neutral-600 shadow-sm'
                      : 'bg-neutral-950/60 border-neutral-850 hover:border-neutral-750 hover:bg-neutral-900'
                  }`}
                >
                  <KoreroCharacterSvg
                    character={char}
                    expression={char.defaultExpression}
                    size={38}
                    animate={false}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-xs text-white block truncate">
                      {char.name}
                    </span>
                    <span className="text-[10px] text-neutral-400 block truncate">
                      {char.role === 'mascot' ? 'Mascot' : char.accentName}
                    </span>
                  </div>
                  {isSelected && <Check size={14} className="text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-neutral-800 bg-neutral-950 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition"
          >
            Set as My Avatar
          </button>
        </div>
      </div>
    </div>
  );
};
