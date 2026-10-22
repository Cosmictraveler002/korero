import React from 'react';
import { Globe, Compass, Sparkles, Zap } from 'lucide-react';
import { getCharacterByPersonaName } from '../data/characters';
import { KoreroCharacterSvg } from './KoreroCharacterSvg';

interface WebScrollTickerProps {
  isScrolling: boolean;
  currentQuery?: string;
  activeDomain?: string;
  pageCount?: number;
  scoutName?: string;
}

export const WebScrollTicker: React.FC<WebScrollTickerProps> = ({
  isScrolling,
  currentQuery,
  activeDomain,
  pageCount = 0,
  scoutName = 'Zed',
}) => {
  if (!isScrolling && !currentQuery) return null;

  const zedChar = getCharacterByPersonaName(scoutName);

  return (
    <div className="bg-gradient-to-r from-amber-950/70 via-neutral-900 to-cyan-950/70 border-y border-amber-500/40 px-3 py-1.5 text-xs text-amber-200 flex items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
      <div className="flex items-center gap-2 min-w-0">
        <KoreroCharacterSvg character={zedChar} expression="thinking" size={24} animate={true} />
        
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-white flex items-center gap-1 shrink-0">
            <Globe size={13} className="text-amber-400 animate-spin" />
            <span>{zedChar.name} Speed-Scrolling:</span>
          </span>

          <span className="text-amber-100 font-mono text-[11px] truncate bg-black/40 px-2 py-0.5 rounded border border-amber-600/30">
            {currentQuery ? `"${currentQuery}"` : 'Gathering web sources & verifying receipts...'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {activeDomain && (
          <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60 hidden sm:inline-block">
            {activeDomain}
          </span>
        )}

        <div className="flex items-center gap-1 text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-300 font-bold">
          <Zap size={10} className="text-amber-400 animate-pulse" />
          <span>{pageCount} sources scanned</span>
        </div>
      </div>
    </div>
  );
};
