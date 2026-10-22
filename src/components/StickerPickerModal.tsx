import React, { useState } from 'react';
import { X, Sparkles, Smile } from 'lucide-react';
import {
  KORERO_CHARACTERS,
  EXPRESSION_LABELS,
  ExpressionType,
  KoreroCharacter,
} from '../data/characters';
import { KoreroCharacterSvg } from './KoreroCharacterSvg';

interface StickerPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (character: KoreroCharacter, expression: ExpressionType) => void;
}

export const StickerPickerModal: React.FC<StickerPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectSticker,
}) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('all');
  const [activeExpression, setActiveExpression] = useState<ExpressionType | 'all'>('all');

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

  const filteredCharacters =
    selectedCharacterId === 'all'
      ? KORERO_CHARACTERS
      : KORERO_CHARACTERS.filter((c) => c.id === selectedCharacterId);

  const displayedExpressions =
    activeExpression === 'all' ? expressionsList : [activeExpression];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-neutral-900 border border-neutral-800 rounded-xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-coral-950/60 border border-coral-800/40 text-coral-400">
              <Smile size={16} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                Kōrero Sticker Pack
                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  {KORERO_CHARACTERS.length * 8} stickers
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Pick a reaction sticker to send directly into the chat room
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

        {/* Character Tabs Filter */}
        <div className="px-3 py-2 border-b border-neutral-850 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-neutral-950/40">
          <button
            onClick={() => setSelectedCharacterId('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition ${
              selectedCharacterId === 'all'
                ? 'bg-white text-black'
                : 'bg-neutral-800/60 text-neutral-400 hover:text-white'
            }`}
          >
            All Mascots
          </button>
          {KORERO_CHARACTERS.map((char) => (
            <button
              key={char.id}
              onClick={() => setSelectedCharacterId(char.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 transition ${
                selectedCharacterId === char.id
                  ? 'bg-neutral-800 text-white border border-neutral-700'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border border-transparent'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: char.accent }}
              />
              {char.name}
            </button>
          ))}
        </div>

        {/* Expression Filter Pills */}
        <div className="px-3 py-1.5 border-b border-neutral-850 flex items-center gap-1 overflow-x-auto no-scrollbar bg-neutral-950/20 text-[11px]">
          <button
            onClick={() => setActiveExpression('all')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              activeExpression === 'all'
                ? 'text-white bg-neutral-800'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            All Reactions
          </button>
          {expressionsList.map((expr) => (
            <button
              key={expr}
              onClick={() => setActiveExpression(expr)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition ${
                activeExpression === expr
                  ? 'text-white bg-neutral-800'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <span>{EXPRESSION_LABELS[expr].emoji}</span>
              <span>{EXPRESSION_LABELS[expr].label}</span>
            </button>
          ))}
        </div>

        {/* Sticker Grid */}
        <div className="flex-1 overflow-y-auto p-3.5 grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {filteredCharacters.flatMap((char) =>
            displayedExpressions.map((expr) => (
              <button
                key={`${char.id}-${expr}`}
                onClick={() => {
                  onSelectSticker(char, expr);
                  onClose();
                }}
                className="group p-2.5 bg-neutral-950/60 hover:bg-neutral-800/80 border border-neutral-850 hover:border-neutral-700 rounded-xl flex flex-col items-center justify-center gap-1.5 transition text-center hover:scale-105 active:scale-95"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                  <KoreroCharacterSvg
                    character={char}
                    expression={expr}
                    size={72}
                    className="group-hover:rotate-3 transition-transform"
                    animate={false}
                  />
                </div>
                <div className="w-full">
                  <span className="text-[11px] font-semibold text-white block truncate">
                    {char.name}
                  </span>
                  <span className="text-[9px] text-neutral-400 capitalize flex items-center justify-center gap-1">
                    <span>{EXPRESSION_LABELS[expr].emoji}</span>
                    <span>{expr}</span>
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-[11px] text-neutral-400">
          <span className="flex items-center gap-1">
            <Sparkles size={13} className="text-yellow-400" />
            Official Kōrero Brand Mascots
          </span>
          <span>Click any sticker to send</span>
        </div>
      </div>
    </div>
  );
};
