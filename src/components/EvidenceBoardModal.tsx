import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, AlertTriangle, HelpCircle, XCircle, Search, Filter, Share2, Copy } from 'lucide-react';
import { EvidenceCard, EvidenceStatus } from '../types';
import { EvidenceCardView, STATUS_CONFIG } from './EvidenceCardView';
import { KORERO_CHARACTERS } from '../data/characters';

interface EvidenceBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: EvidenceCard[];
  onStatusChange: (id: string, newStatus: EvidenceStatus) => void;
  onOpenVerdict: () => void;
}

export const EvidenceBoardModal: React.FC<EvidenceBoardModalProps> = ({
  isOpen,
  onClose,
  cards,
  onStatusChange,
  onOpenVerdict,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<EvidenceStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const filteredCards = cards.filter((c) => {
    if (selectedStatus !== 'all' && c.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchClaim = c.claim.toLowerCase().includes(q);
      const matchSources = c.sources?.some((s) => s.title.toLowerCase().includes(q) || s.url.toLowerCase().includes(q));
      return matchClaim || matchSources;
    }
    return true;
  });

  const counts: Record<EvidenceStatus, number> = {
    verified: cards.filter((c) => c.status === 'verified').length,
    disputed: cards.filter((c) => c.status === 'disputed').length,
    unverified: cards.filter((c) => c.status === 'unverified').length,
    refuted: cards.filter((c) => c.status === 'refuted').length,
  };

  const handleExportMarkdown = () => {
    let md = `# Kōrero Research Evidence Board\n\n`;
    cards.forEach((c, idx) => {
      md += `### ${idx + 1}. [${c.status.toUpperCase()}] "${c.claim}"\n`;
      md += `- **Confidence**: ${c.confidence}\n`;
      md += `- **Found By**: ${c.found_by} | **Checked By**: ${c.checked_by || 'Moss'}\n`;
      if (c.sources && c.sources.length > 0) {
        md += `- **Sources**:\n`;
        c.sources.forEach((s) => {
          md += `  - [${s.title}](${s.url}) (${s.quality} tier, ${s.publisher || 'Web'})\n`;
          if (s.paraphrase) md += `    - *Summary*: "${s.paraphrase}"\n`;
          if (s.quote) md += `    - *Quote*: "${s.quote}"\n`;
        });
      }
      if (c.caveats && c.caveats.length > 0) {
        md += `- **Caveats**:\n`;
        c.caveats.forEach((cav) => {
          md += `  - ${cav}\n`;
        });
      }
      md += `\n---\n\n`;
    });

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] z-10 overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="p-4 border-b border-neutral-850 bg-neutral-900/80 flex items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-emerald-400" size={20} />
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Research Evidence Board
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                {cards.length} Cards Total
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Every claim tested by the Kōrero Research Crew with receipts & primary sources
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportMarkdown}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white flex items-center gap-1.5 transition"
              title="Copy markdown export"
            >
              <Copy size={13} />
              <span>{copied ? 'Copied MD!' : 'Export MD'}</span>
            </button>

            <button
              onClick={onOpenVerdict}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <span>Deliver Verdict</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 border-b border-neutral-850 bg-neutral-900/40 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedStatus === 'all'
                  ? 'bg-white text-black'
                  : 'bg-neutral-850 text-neutral-300 hover:text-white'
              }`}
            >
              All ({cards.length})
            </button>

            {(['verified', 'disputed', 'unverified', 'refuted'] as EvidenceStatus[]).map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  selectedStatus === st
                    ? STATUS_CONFIG[st].badgeBg
                    : 'bg-neutral-850 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {STATUS_CONFIG[st].icon}
                <span className="capitalize">{st}</span>
                <span className="text-[10px] opacity-75">({counts[st]})</span>
              </button>
            ))}
          </div>

          {/* Search Field */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search claims or URLs..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition"
            />
          </div>
        </div>

        {/* Cards Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredCards.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 space-y-2">
              <HelpCircle size={36} className="mx-auto text-neutral-600" />
              <p className="text-sm font-medium">No evidence cards match your filter.</p>
              <p className="text-xs text-neutral-600">
                Ask Zed to speed-scroll the web or have Moss stamp a claim.
              </p>
            </div>
          ) : (
            filteredCards.map((card) => (
              <EvidenceCardView
                key={card.id}
                card={card}
                onStatusChange={onStatusChange}
                compact={false}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
