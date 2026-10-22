import React from 'react';
import { Globe, Search, BarChart3, HelpCircle, ShieldAlert, Sparkles, Megaphone, FileSpreadsheet, ShieldCheck, FileText } from 'lucide-react';
import { KORERO_CHARACTERS } from '../data/characters';
import { KoreroCharacterSvg } from './KoreroCharacterSvg';

interface ResearchCrewToolbarProps {
  onQuickAction: (actionType: string, promptText: string) => void;
  onOpenEvidenceBoard: () => void;
  onOpenVerdict: () => void;
  onOpenSharedReport: () => void;
  evidenceCount: number;
}

export const ResearchCrewToolbar: React.FC<ResearchCrewToolbarProps> = ({
  onQuickAction,
  onOpenEvidenceBoard,
  onOpenVerdict,
  onOpenSharedReport,
  evidenceCount,
}) => {
  const actions = [
    {
      id: 'zed_scroll',
      charId: 'zed',
      label: 'Web-Scroll',
      icon: <Globe size={12} className="text-amber-400" />,
      prompt: '/hearme Zed, please speed-scroll the web for primary sources and receipts on this topic!',
      desc: 'Ask Zed to search the web and collect receipts',
    },
    {
      id: 'moss_check',
      charId: 'moss',
      label: 'Fact-Check Gate',
      icon: <ShieldCheck size={12} className="text-emerald-400" />,
      prompt: '/hearme Moss, check the claims against receipts and stamp the evidence status!',
      desc: 'Enforce fact-checking & stamp verified/unverified',
    },
    {
      id: 'bramble_trace',
      charId: 'bramble',
      label: 'Trace Origin',
      icon: <Search size={12} className="text-yellow-400" />,
      prompt: '/hearme Bramble, trace where this claim originally started. Find the primary source!',
      desc: 'Trace quote or claim back to the original source',
    },
    {
      id: 'pixel_stats',
      charId: 'pixel',
      label: 'Check Stats',
      icon: <BarChart3 size={12} className="text-green-400" />,
      prompt: '/hearme Pixel, what are the actual statistics, sample sizes (n), and numbers here?',
      desc: 'Ask Pixel to evaluate statistics and sample sizes',
    },
    {
      id: 'oop_debate',
      charId: 'oop',
      label: "Devil's Advocate",
      icon: <Sparkles size={12} className="text-purple-400" />,
      prompt: "/hearme Prof. Oop, argue the opposing side purely for sport to stress-test our conclusion!",
      desc: "Stress-test the argument with Prof. Oop",
    },
    {
      id: 'gus_hypo',
      charId: 'gus',
      label: 'Wild Hypothesis',
      icon: <HelpCircle size={12} className="text-blue-400" />,
      prompt: "/hearme Gus, give us a wild unverified hypothesis to widen our investigation!",
      desc: 'Connect unexpected angles (marked unverified)',
    },
    {
      id: 'nana_nuance',
      charId: 'nana',
      label: 'Context & Caveats',
      icon: <HelpCircle size={12} className="text-orange-400" />,
      prompt: "/hearme Nana Nuance, what are the nuances, limitations, and caveats we are missing?",
      desc: 'Add context, funding disclosures & caveats',
    },
    {
      id: 'dot_verdict',
      charId: 'dot',
      label: 'TL;DR Verdict',
      icon: <Megaphone size={12} className="text-neutral-200" />,
      prompt: '/hearme Dot, give us the short version TL;DR summary and final conclusion!',
      desc: 'Deliver a concise executive verdict',
    },
  ];

  return (
    <div className="bg-neutral-950/90 border-b border-neutral-850 px-2 py-1.5 flex items-center justify-between gap-2 text-xs overflow-x-auto no-scrollbar shrink-0">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 px-1 hidden sm:inline-block">
          Crew Powers:
        </span>

        {actions.map((act) => {
          const char = KORERO_CHARACTERS.find((c) => c.id === act.charId) || KORERO_CHARACTERS[0];
          return (
            <button
              key={act.id}
              onClick={() => onQuickAction(act.id, act.prompt)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition group text-xs shrink-0"
              title={act.desc}
            >
              <KoreroCharacterSvg character={char} size={16} animate={false} />
              <span className="font-medium text-[11px]">{act.label}</span>
            </button>
          );
        })}
      </div>

      {/* Board, Report & Verdict Trigger Buttons */}
      <div className="flex items-center gap-1.5 shrink-0 border-l border-neutral-800 pl-2">
        <button
          onClick={onOpenSharedReport}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/60 hover:bg-sky-900/70 border border-sky-700/60 text-sky-300 text-xs font-semibold transition cursor-pointer"
          title="Open Common Shared Research Report (report.md) & Exporters"
        >
          <FileText size={13} />
          <span>Report (.md/.docx)</span>
        </button>

        <button
          onClick={onOpenEvidenceBoard}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 text-xs font-semibold transition cursor-pointer"
          title="Open full Evidence Board"
        >
          <FileSpreadsheet size={13} />
          <span>Evidence ({evidenceCount})</span>
        </button>

        <button
          onClick={onOpenVerdict}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-xs font-semibold transition"
          title="View final verdict"
        >
          <Megaphone size={13} />
          <span>Verdict</span>
        </button>
      </div>
    </div>
  );
};
