import React, { useState } from 'react';
import { X, Trophy, CheckCircle2, AlertTriangle, ExternalLink, Copy, Share2, Sparkles } from 'lucide-react';
import { EvidenceCard, ResearchVerdict, EvidenceStatus } from '../types';
import { getCharacterByPersonaName } from '../data/characters';
import { KoreroCharacterSvg } from './KoreroCharacterSvg';
import { STATUS_CONFIG } from './EvidenceCardView';

interface VerdictModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: EvidenceCard[];
  topic: string;
  onGenerateNewVerdict?: () => Promise<void>;
  isGenerating?: boolean;
}

export const VerdictModal: React.FC<VerdictModalProps> = ({
  isOpen,
  onClose,
  cards,
  topic,
  onGenerateNewVerdict,
  isGenerating = false,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const mossChar = getCharacterByPersonaName('moss');
  const koChar = getCharacterByPersonaName('ko');

  const verifiedCount = cards.filter((c) => c.status === 'verified').length;
  const disputedCount = cards.filter((c) => c.status === 'disputed').length;
  const unverifiedCount = cards.filter((c) => c.status === 'unverified').length;
  const refutedCount = cards.filter((c) => c.status === 'refuted').length;

  const overallStatus: EvidenceStatus =
    refutedCount > verifiedCount
      ? 'refuted'
      : disputedCount > verifiedCount
      ? 'disputed'
      : verifiedCount > 0
      ? 'verified'
      : 'unverified';

  const overallCfg = STATUS_CONFIG[overallStatus];

  const allSources = cards.flatMap((c) => c.sources || []);
  const highTierSources = allSources.filter((s) => s.quality === 'high');

  const handleCopyVerdict = () => {
    let text = `🏁 KŌRERO RESEARCH CREW VERDICT\n`;
    text += `Topic: "${topic}"\n`;
    text += `Verdict: [${overallStatus.toUpperCase()}] (Confidence: ${verifiedCount >= 2 ? 'HIGH' : 'MEDIUM'})\n\n`;
    text += `Evidence Breakdown:\n`;
    text += `✓ Verified Claims: ${verifiedCount}\n`;
    text += `⚠ Disputed Claims: ${disputedCount}\n`;
    text += `❓ Unverified Hypotheses: ${unverifiedCount}\n`;
    text += `✗ Refuted Claims: ${refutedCount}\n\n`;
    text += `Key Sources & Receipts:\n`;
    allSources.slice(0, 5).forEach((s, i) => {
      text += `${i + 1}. ${s.title} (${s.url}) - ${s.publisher || 'Web'}\n`;
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] z-10 overflow-hidden text-neutral-200">
        {/* Top Header */}
        <div className="p-4 border-b border-neutral-850 bg-neutral-900/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <KoreroCharacterSvg character={koChar} expression="happy" size={32} />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>The Research Verdict</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${overallCfg.badgeBg}`}>
                  {overallStatus}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">Delivered with receipts by Kō & Moss</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyVerdict}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white flex items-center gap-1.5 transition"
            >
              <Copy size={13} />
              <span>{copied ? 'Copied Verdict!' : 'Copy Summary'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Verdict Core Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Topic Title */}
          <div className="bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-850">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">
              Current Research Inquiry
            </span>
            <p className="text-sm sm:text-base font-bold text-white">"{topic}"</p>
          </div>

          {/* Stat Tally Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3 text-center">
              <span className="text-xl font-bold text-emerald-300 block">{verifiedCount}</span>
              <span className="text-[10px] uppercase font-bold text-emerald-400">Verified Claims</span>
            </div>
            <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 text-center">
              <span className="text-xl font-bold text-amber-300 block">{disputedCount}</span>
              <span className="text-[10px] uppercase font-bold text-amber-400">Disputed</span>
            </div>
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 text-center">
              <span className="text-xl font-bold text-neutral-300 block">{unverifiedCount}</span>
              <span className="text-[10px] uppercase font-bold text-neutral-400">Unverified (Gus)</span>
            </div>
            <div className="bg-rose-950/30 border border-rose-800/40 rounded-xl p-3 text-center">
              <span className="text-xl font-bold text-rose-300 block">{refutedCount}</span>
              <span className="text-[10px] uppercase font-bold text-rose-400">Refuted</span>
            </div>
          </div>

          {/* TL;DR Summary Box */}
          <div className="bg-neutral-900/80 rounded-xl p-4 border border-neutral-850 space-y-2">
            <div className="flex items-center gap-2">
              <KoreroCharacterSvg character={koChar} expression="happy" size={24} animate={false} />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Crew Conclusion & Summary
              </span>
            </div>

            <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed">
              {cards.length === 0
                ? 'The research crew has not yet recorded evidence cards for this session. Use the quick actions or chat to ask Zed to speed-scroll the web and Moss to stamp verified findings!'
                : `Based on ${cards.length} tested claims and ${allSources.length} primary web sources scanned, the research indicates that the findings lean towards "${overallStatus.toUpperCase()}". High-fidelity primary documentation confirms key facts while noting important nuances.`}
            </p>
          </div>

          {/* Key Primary Sources */}
          {allSources.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                Primary Sources Scanned ({allSources.length})
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {allSources.slice(0, 6).map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-neutral-950 border border-neutral-850 hover:border-neutral-700 transition text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-cyan-300 truncate block">{src.title}</span>
                      <span className="text-[10px] text-neutral-400">{src.publisher || 'Web'} · {src.quality} tier</span>
                    </div>
                    <ExternalLink size={12} className="text-neutral-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
