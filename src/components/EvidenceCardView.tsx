import React, { useState } from 'react';
import { EvidenceCard, EvidenceStatus } from '../types';
import { ExternalLink, CheckCircle2, AlertTriangle, HelpCircle, XCircle, ShieldCheck, ChevronDown, ChevronUp, Stamp } from 'lucide-react';
import { getCharacterByPersonaName } from '../data/characters';
import { KoreroCharacterSvg } from './KoreroCharacterSvg';

interface EvidenceCardViewProps {
  card: EvidenceCard;
  onStatusChange?: (id: string, newStatus: EvidenceStatus) => void;
  compact?: boolean;
}

export const STATUS_CONFIG: Record<
  EvidenceStatus,
  { label: string; bg: string; border: string; text: string; badgeBg: string; icon: React.ReactNode }
> = {
  verified: {
    label: 'VERIFIED',
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-700/60',
    text: 'text-emerald-300',
    badgeBg: 'bg-[#3FA37A]/20 text-[#3FA37A] border border-[#3FA37A]/50',
    icon: <CheckCircle2 size={13} className="text-[#3FA37A]" />,
  },
  disputed: {
    label: 'DISPUTED',
    bg: 'bg-amber-950/40',
    border: 'border-amber-700/60',
    text: 'text-amber-300',
    badgeBg: 'bg-[#E0A030]/20 text-[#E0A030] border border-[#E0A030]/50',
    icon: <AlertTriangle size={13} className="text-[#E0A030]" />,
  },
  unverified: {
    label: 'UNVERIFIED',
    bg: 'bg-neutral-900/60',
    border: 'border-neutral-700/60',
    text: 'text-neutral-300',
    badgeBg: 'bg-[#8A8F94]/20 text-[#8A8F94] border border-[#8A8F94]/50',
    icon: <HelpCircle size={13} className="text-[#8A8F94]" />,
  },
  refuted: {
    label: 'REFUTED',
    bg: 'bg-rose-950/40',
    border: 'border-rose-700/60',
    text: 'text-rose-300',
    badgeBg: 'bg-[#D9534F]/20 text-[#D9534F] border border-[#D9534F]/50',
    icon: <XCircle size={13} className="text-[#D9534F]" />,
  },
};

export const EvidenceCardView: React.FC<EvidenceCardViewProps> = ({
  card,
  onStatusChange,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(!compact);
  const statusCfg = STATUS_CONFIG[card.status] || STATUS_CONFIG.unverified;
  const finderChar = getCharacterByPersonaName(card.found_by);

  return (
    <div
      className={`rounded-xl border ${statusCfg.border} ${statusCfg.bg} p-3.5 my-2 text-xs shadow-md transition-all duration-200 animate-in fade-in`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shrink-0 ${statusCfg.badgeBg}`}>
            {statusCfg.icon}
            <span>{statusCfg.label}</span>
          </span>

          <span className="text-[10px] text-neutral-400 font-mono shrink-0">
            {card.id}
          </span>

          <span className="text-[10px] text-neutral-400 truncate">
            Confidence: <strong className="text-white">{card.confidence}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Scout avatar tag */}
          <div className="flex items-center gap-1 bg-neutral-900/80 px-2 py-0.5 rounded-md border border-neutral-800 text-[10px] text-neutral-300">
            <KoreroCharacterSvg character={finderChar} size={16} animate={false} />
            <span className="font-medium">{finderChar.name}</span>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition"
            title={expanded ? 'Collapse receipts' : 'Expand receipts'}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Core Claim Statement */}
      <div className="text-sm font-semibold text-white leading-snug mb-2">
        "{card.claim}"
      </div>

      {/* Expandable Evidence Receipts */}
      {expanded && (
        <div className="space-y-2 mt-2 pt-2 border-t border-neutral-800/80">
          {/* Sources List */}
          {card.sources && card.sources.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                Verified Receipts & Sources ({card.sources.length})
              </span>
              {card.sources.map((src, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-950/80 rounded-lg p-2.5 border border-neutral-850 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 hover:underline flex items-center gap-1 truncate"
                    >
                      <span>{src.title || src.url}</span>
                      <ExternalLink size={11} className="shrink-0" />
                    </a>

                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 uppercase font-mono shrink-0">
                      {src.quality} tier
                    </span>
                  </div>

                  {src.publisher && (
                    <div className="text-[10px] text-neutral-400 flex items-center gap-2">
                      <span>Publisher: <strong className="text-neutral-300">{src.publisher}</strong></span>
                      {src.published && <span>· Published: {src.published}</span>}
                    </div>
                  )}

                  {src.paraphrase && (
                    <p className="text-[11px] text-neutral-200 leading-relaxed italic">
                      "{src.paraphrase}"
                    </p>
                  )}

                  {src.quote && (
                    <div className="text-[10px] text-amber-200/90 bg-amber-950/20 border-l-2 border-amber-500 pl-2 py-0.5 font-mono">
                      Exact quote: "{src.quote}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Caveats & Nuance from Nana & Pixel */}
          {card.caveats && card.caveats.length > 0 && (
            <div className="bg-neutral-950/60 rounded-lg p-2 border border-neutral-850">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block mb-1">
                Context & Caveats
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-neutral-300">
                {card.caveats.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Moss Fact-Check Stamp & Interactive Status Override */}
          <div className="flex items-center justify-between pt-1 text-[10px] text-neutral-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>Gatekeeper: <strong className="text-neutral-200">{card.checked_by || 'Moss (Fact-Checker)'}</strong></span>
            </div>

            {onStatusChange && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-neutral-400 mr-1 flex items-center gap-0.5">
                  <Stamp size={10} /> Stamp:
                </span>
                {(['verified', 'disputed', 'unverified', 'refuted'] as EvidenceStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => onStatusChange(card.id, st)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase transition ${
                      card.status === st
                        ? STATUS_CONFIG[st].badgeBg
                        : 'text-neutral-400 hover:text-white bg-neutral-800'
                    }`}
                  >
                    {st[0].toUpperCase() + st.slice(1, 4)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
