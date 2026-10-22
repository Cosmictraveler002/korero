import React, { useState } from 'react';
import { getCharacterByPersonaName, ExpressionType } from '../data/characters';
import { KoreroCharacterSvg } from './KoreroCharacterSvg';

interface PersonaAvatarProps {
  name: string;
  avatarUrl?: string;
  avatarLetter?: string;
  badgeColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  expression?: ExpressionType;
  showBadge?: boolean;
  allowNsfw?: boolean;
  className?: string;
  onClick?: () => void;
}

export const PersonaAvatar: React.FC<PersonaAvatarProps> = ({
  name,
  avatarUrl,
  avatarLetter,
  badgeColor,
  size = 'md',
  expression,
  showBadge = false,
  allowNsfw = false,
  className = '',
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  const character = getCharacterByPersonaName(name);

  const sizePixelMap = {
    xs: 24,
    sm: 32,
    md: 38,
    lg: 46,
    xl: 64,
    '2xl': 96,
  };

  const px = sizePixelMap[size] || 38;

  // If a non-dicebear custom external photo URL was provided, render photo with error fallback
  const isCustomUploadedPhoto =
    avatarUrl &&
    !avatarUrl.includes('dicebear.com') &&
    !imageError;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full select-none ${
        onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''
      } ${className}`}
      title={`${name} · "${character.catchphrase}"`}
      style={{ width: px, height: px }}
    >
      {isCustomUploadedPhoto ? (
        <div
          className="w-full h-full rounded-full overflow-hidden flex items-center justify-center font-bold text-white border border-neutral-800"
          style={{ backgroundColor: badgeColor || '#18181b' }}
        >
          <img
            src={avatarUrl}
            alt={name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover rounded-full"
            loading="lazy"
          />
        </div>
      ) : (
        <KoreroCharacterSvg
          character={character}
          expression={expression || character.defaultExpression}
          size={px}
          className="rounded-full"
          animate={true}
        />
      )}

      {showBadge && allowNsfw && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-600 border border-neutral-900 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
          title="Mature / Unfiltered Clearance"
        >
          !
        </span>
      )}
    </div>
  );
};
