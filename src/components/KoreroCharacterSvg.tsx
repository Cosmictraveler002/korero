import React from 'react';
import { ExpressionType, KoreroCharacter } from '../data/characters';

interface KoreroCharacterSvgProps {
  character: KoreroCharacter;
  expression?: ExpressionType;
  size?: number | string;
  className?: string;
  animate?: boolean;
  interactive?: boolean;
}

export const KoreroCharacterSvg: React.FC<KoreroCharacterSvgProps> = ({
  character,
  expression = character.defaultExpression,
  size = 64,
  className = '',
  animate = true,
  interactive = false,
}) => {
  const ink = '#171B1C';
  const paper = '#F9F8F4';
  const accent = character.accent || '#FF8A7A';

  const exp = expression || 'happy';

  // Render character specific features
  const renderMacronBar = () => {
    switch (character.id) {
      case 'tui':
        // Hairclip bar on top right
        return (
          <rect
            x="56"
            y="14"
            width="22"
            height="5.5"
            rx="2.75"
            fill={accent}
            stroke={ink}
            strokeWidth="3.5"
            strokeLinecap="round"
            className={animate ? 'transition-transform duration-300' : ''}
            transform="rotate(-12 67 17)"
          />
        );
      case 'mira':
        // Headband macron bar across forehead
        return (
          <rect
            x="36"
            y="26"
            width="28"
            height="5.5"
            rx="2.75"
            fill={accent}
            stroke={ink}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        );
      case 'hana':
        // Headband / top bar accessory
        return (
          <rect
            x="38"
            y="13"
            width="24"
            height="5.5"
            rx="2.75"
            fill={accent}
            stroke={ink}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        );
      case 'manu':
        // Smug unibrow macron bar right over eyes
        return (
          <rect
            x="38"
            y={exp === 'sad' ? '30' : '26'}
            width="24"
            height="5"
            rx="2.5"
            fill={ink}
            stroke={ink}
            strokeWidth="1"
            className={animate ? 'transition-all duration-300' : ''}
          />
        );
      case 'ari':
        // Beanie front macron tag
        return (
          <rect
            x="40"
            y="23"
            width="20"
            height="5"
            rx="2.5"
            fill={accent}
            stroke={ink}
            strokeWidth="3"
            strokeLinecap="round"
          />
        );
      case 'rook':
        // Visor line macron bar
        return (
          <rect
            x="34"
            y="20"
            width="32"
            height="5"
            rx="2.5"
            fill={accent}
            stroke={ink}
            strokeWidth="3"
          />
        );
      case 'dr_quibble':
        // Bookmark macron bar pinned in bun
        return (
          <g>
            <rect
              x="54"
              y="12"
              width="24"
              height="5"
              rx="2.5"
              fill={accent}
              stroke={ink}
              strokeWidth="3"
              transform="rotate(-18 66 14)"
            />
          </g>
        );
      case 'gus_gibbous':
        // Antenna macron bar floating high
        return (
          <g>
            <line x1="50" y1="16" x2="50" y2="7" stroke={ink} strokeWidth="3" strokeLinecap="round" />
            <rect x="36" y="5" width="28" height="5" rx="2.5" fill={accent} stroke={ink} strokeWidth="3" />
          </g>
        );
      case 'pixel':
        // Floating bar plot axis macron
        return (
          <rect
            x="35"
            y="11"
            width="30"
            height="5.5"
            rx="2.75"
            fill={accent}
            stroke={ink}
            strokeWidth="3.5"
          />
        );
      case 'nana_nuance':
        // Knitting needle macron bar through the bun
        return (
          <g>
            <line x1="30" y1="18" x2="70" y2="12" stroke={ink} strokeWidth="4" strokeLinecap="round" />
            <circle cx="28" cy="18" r="3" fill={accent} stroke={ink} strokeWidth="2" />
          </g>
        );
      case 'bramble':
        // Bookmark sticking out from head
        return (
          <rect
            x="48"
            y="10"
            width="22"
            height="5"
            rx="2.5"
            fill={accent}
            stroke={ink}
            strokeWidth="3"
            transform="rotate(-10 59 12)"
          />
        );
      case 'zed':
        // Hairclip on messy bun
        return (
          <rect
            x="52"
            y="14"
            width="24"
            height="5"
            rx="2.5"
            fill={accent}
            stroke={ink}
            strokeWidth="3"
            transform="rotate(15 64 16)"
          />
        );
      case 'prof_oop':
        // Mortarboard cap macron bar
        return (
          <g>
            <rect x="32" y="8" width="36" height="5.5" rx="2.75" fill={accent} stroke={ink} strokeWidth="3.5" />
            <line x1="62" y1="12" x2="66" y2="20" stroke={ink} strokeWidth="2.5" />
            <circle cx="66" cy="21" r="2" fill={accent} />
          </g>
        );
      case 'moss':
        // Fern frond macron bar
        return (
          <g>
            <rect x="35" y="11" width="30" height="5" rx="2.5" fill={accent} stroke={ink} strokeWidth="3" />
            <path d="M 42 11 Q 40 6 45 4 M 50 11 Q 50 5 54 4 M 58 11 Q 60 6 63 5" stroke={accent} strokeWidth="2.5" fill="none" />
          </g>
        );
      case 'dot':
        // Tiny brisk macron bar
        return (
          <rect
            x="40"
            y="18"
            width="20"
            height="4"
            rx="2"
            fill={accent}
            stroke={ink}
            strokeWidth="2.5"
          />
        );
      case 'koa':
      case 'ko':
      default:
        // Floating halo macron bar
        return (
          <rect
            x="36"
            y={exp === 'sad' ? '14' : '10'}
            width="28"
            height="6"
            rx="3"
            fill={paper}
            stroke={ink}
            strokeWidth="3.5"
            strokeLinecap="round"
            className={animate ? 'animate-pulse duration-1000' : ''}
          />
        );
    }
  };

  const renderEyesAndMouth = () => {
    switch (exp) {
      case 'laugh':
        return (
          <g>
            {/* Crying laughing squint eyes >< */}
            <path
              d="M 37 43 L 43 46 L 37 49"
              fill="none"
              stroke={ink}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 63 43 L 57 46 L 63 49"
              fill="none"
              stroke={ink}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Laughing open mouth with tongue */}
            <path
              d="M 43 53 Q 50 63 57 53 Z"
              fill={accent}
              stroke={ink}
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {/* Little joyful tears */}
            <circle cx="31" cy="46" r="3" fill="#38BDF8" />
            <circle cx="69" cy="46" r="3" fill="#38BDF8" />
          </g>
        );

      case 'love':
        return (
          <g>
            {/* Heart eyes */}
            <path
              d="M 40 42 C 40 39 36 38 35 41 C 34 38 30 39 30 42 C 30 46 35 49 35 49 C 35 49 40 46 40 42 Z"
              fill={accent}
              stroke={ink}
              strokeWidth="1.5"
              transform="scale(1.3) translate(-10, -8)"
            />
            <path
              d="M 60 42 C 60 39 56 38 55 41 C 54 38 50 39 50 42 C 50 46 55 49 55 49 C 55 49 60 46 60 42 Z"
              fill={accent}
              stroke={ink}
              strokeWidth="1.5"
              transform="scale(1.3) translate(-15, -8)"
            />
            {/* Happy curved mouth */}
            <path
              d="M 45 54 Q 50 59 55 54"
              fill="none"
              stroke={ink}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Rosy blush cheeks */}
            <circle cx="34" cy="51" r="4.5" fill={accent} opacity="0.6" />
            <circle cx="66" cy="51" r="4.5" fill={accent} opacity="0.6" />
          </g>
        );

      case 'shock':
        return (
          <g>
            {/* Wide round startled eyes */}
            <circle cx="38" cy="44" r="5" fill={paper} stroke={ink} strokeWidth="3" />
            <circle cx="38" cy="44" r="2.2" fill={ink} />
            <circle cx="62" cy="44" r="5" fill={paper} stroke={ink} strokeWidth="3" />
            <circle cx="62" cy="44" r="2.2" fill={ink} />
            {/* Small round O mouth */}
            <circle cx="50" cy="56" r="4.5" fill={ink} />
            {/* Exclamation marks */}
            <path
              d="M 50 20 L 50 24 M 50 27 L 50 28"
              stroke={accent}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        );

      case 'sideeye':
        return (
          <g>
            {/* Side-glancing pupils */}
            <circle cx="38" cy="44" r="5" fill={paper} stroke={ink} strokeWidth="3" />
            <circle cx="35" cy="44" r="2.5" fill={ink} />
            <circle cx="62" cy="44" r="5" fill={paper} stroke={ink} strokeWidth="3" />
            <circle cx="59" cy="44" r="2.5" fill={ink} />
            {/* Skeptical wavy flat mouth */}
            <path
              d="M 44 55 Q 50 53 56 56"
              fill="none"
              stroke={ink}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>
        );

      case 'sleepy':
        return (
          <g>
            {/* Half closed sleepy eyelids */}
            <path
              d="M 34 45 Q 39 42 44 45"
              fill="none"
              stroke={ink}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M 56 45 Q 61 42 66 45"
              fill="none"
              stroke={ink}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Calm tiny mouth */}
            <ellipse cx="50" cy="54" rx="2.5" ry="1.5" fill={ink} />
            {/* Floating z Z */}
            <text
              x="68"
              y="32"
              fill={accent}
              fontSize="12"
              fontWeight="bold"
              fontFamily="monospace"
              className={animate ? 'animate-bounce' : ''}
            >
              z
            </text>
            <text
              x="74"
              y="22"
              fill={accent}
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
            >
              Z
            </text>
          </g>
        );

      case 'sad':
        return (
          <g>
            {/* Droopy sad dot eyes */}
            <circle cx="38" cy="45" r="3.5" fill={ink} />
            <circle cx="62" cy="45" r="3.5" fill={ink} />
            {/* Downturned mouth */}
            <path
              d="M 44 57 Q 50 51 56 57"
              fill="none"
              stroke={ink}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Teardrop */}
            <path
              d="M 34 49 C 34 49 32 53 32 55 C 32 57 34 58 35 58 C 36 58 38 57 38 55 C 38 53 34 49 34 49 Z"
              fill="#38BDF8"
              stroke={ink}
              strokeWidth="1.5"
            />
          </g>
        );

      case 'thinking':
        return (
          <g>
            {/* Raised eyebrow on one side, looking upward */}
            <path
              d="M 33 37 Q 38 33 43 36"
              fill="none"
              stroke={ink}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="38" cy="43" r="3.5" fill={ink} />
            <circle cx="62" cy="41" r="3.5" fill={ink} />
            {/* Inquisitive pursed mouth */}
            <path
              d="M 45 54 Q 48 57 53 54"
              fill="none"
              stroke={ink}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Hand tapping chin */}
            <circle cx="60" cy="58" r="4.5" fill={paper} stroke={ink} strokeWidth="3" />
            {/* Thought bubble dots */}
            <circle cx="70" cy="30" r="2.5" fill={accent} />
            <circle cx="76" cy="22" r="4" fill={accent} />
          </g>
        );

      case 'happy':
      default:
        return (
          <g>
            {/* Sparkly dot eyes */}
            <circle cx="38" cy="44" r="3.8" fill={ink} />
            <circle cx="37" cy="42.5" r="1.2" fill={paper} />
            <circle cx="62" cy="44" r="3.8" fill={ink} />
            <circle cx="61" cy="42.5" r="1.2" fill={paper} />
            {/* Bright happy smile */}
            <path
              d="M 43 52 Q 50 60 57 52"
              fill="none"
              stroke={ink}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Soft accent blush */}
            <circle cx="32" cy="48" r="4" fill={accent} opacity="0.6" />
            <circle cx="68" cy="48" r="4" fill={accent} opacity="0.6" />
          </g>
        );
    }
  };

  const renderBody = () => {
    switch (character.id) {
      case 'tui':
        // Bird girl with fluffy white throat tuft and wings
        return (
          <g>
            {/* Head/Body */}
            <circle
              cx="50"
              cy="48"
              r="30"
              fill={paper}
              stroke={ink}
              strokeWidth="4"
            />
            {/* White fluffy tuft */}
            <path
              d="M 46 68 Q 50 74 54 68 Q 57 73 50 78 Q 43 73 46 68 Z"
              fill="#FFFFFF"
              stroke={ink}
              strokeWidth="3"
            />
            {/* Cute bird beak */}
            <path
              d="M 47 48 L 53 48 L 50 53 Z"
              fill={accent}
              stroke={ink}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </g>
        );

      case 'mira':
        // Ring-shaped hoodie around head
        return (
          <g>
            {/* Outer ring hood */}
            <circle
              cx="50"
              cy="48"
              r="33"
              fill={accent}
              stroke={ink}
              strokeWidth="4"
            />
            {/* Inner face area */}
            <circle
              cx="50"
              cy="48"
              r="24"
              fill={paper}
              stroke={ink}
              strokeWidth="3.5"
            />
            {/* Hoodie drawstrings */}
            <path
              d="M 43 70 L 43 78 M 57 70 L 57 78"
              stroke={ink}
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Mini tea cup in corner */}
            <rect
              x="62"
              y="62"
              width="14"
              height="11"
              rx="3"
              fill={paper}
              stroke={ink}
              strokeWidth="2.5"
            />
            <path
              d="M 76 65 Q 80 67 76 70"
              fill="none"
              stroke={ink}
              strokeWidth="2.5"
            />
          </g>
        );

      case 'hana':
        // Girl with ring hoop earrings and big headphones
        return (
          <g>
            {/* Head */}
            <circle
              cx="50"
              cy="48"
              r="29"
              fill={paper}
              stroke={ink}
              strokeWidth="4"
            />
            {/* Headphone band */}
            <path
              d="M 22 46 Q 50 14 78 46"
              fill="none"
              stroke={ink}
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Headphone ear pads */}
            <rect
              x="16"
              y="40"
              width="9"
              height="18"
              rx="4"
              fill={accent}
              stroke={ink}
              strokeWidth="3.5"
            />
            <rect
              x="75"
              y="40"
              width="9"
              height="18"
              rx="4"
              fill={accent}
              stroke={ink}
              strokeWidth="3.5"
            />
            {/* Ring hoop earrings (Brand DNA) */}
            <circle
              cx="26"
              cy="60"
              r="5"
              fill="none"
              stroke={accent}
              strokeWidth="3"
            />
            <circle
              cx="74"
              cy="60"
              r="5"
              fill="none"
              stroke={accent}
              strokeWidth="3"
            />
          </g>
        );

      case 'manu':
        // Smug bird boy with wings
        return (
          <g>
            {/* Round bird body */}
            <circle
              cx="50"
              cy="48"
              r="29"
              fill={paper}
              stroke={ink}
              strokeWidth="4"
            />
            {/* Folded wings on sides */}
            <path
              d="M 22 46 Q 16 58 26 68"
              fill={accent}
              stroke={ink}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M 78 46 Q 84 58 74 68"
              fill={accent}
              stroke={ink}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Tiny sharp bird beak */}
            <path
              d="M 48 47 L 53 47 L 50 51 Z"
              fill={accent}
              stroke={ink}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </g>
        );

      case 'ari':
        // Tall-headed boy with ring-shaped slouchy beanie
        return (
          <g>
            {/* Head */}
            <ellipse
              cx="50"
              cy="52"
              r="27"
              fill={paper}
              stroke={ink}
              strokeWidth="4"
            />
            {/* Ring-shaped Beanie top */}
            <path
              d="M 24 42 C 24 20 76 20 76 42 Z"
              fill={accent}
              stroke={ink}
              strokeWidth="4"
            />
            {/* Beanie fold band */}
            <rect
              x="22"
              y="38"
              width="56"
              height="8"
              rx="4"
              fill={ink}
            />
          </g>
        );

      case 'rook':
        // Sharp focused visor-style problem solver
        return (
          <g>
            <circle cx="50" cy="48" r="29" fill={paper} stroke={ink} strokeWidth="4" />
            <rect x="30" y="42" width="40" height="9" rx="4.5" fill={ink} />
            <rect x="33" y="44" width="34" height="5" rx="2.5" fill={accent} />
          </g>
        );

      case 'dr_quibble':
        // Dr. Quibble: Citations Lead with ring glasses, coral scarf, footnotes scroll & tiny pencil
        return (
          <g>
            {/* Scholar Bun */}
            <circle cx="66" cy="22" r="9" fill={accent} stroke={ink} strokeWidth="3" />
            {/* Head */}
            <circle cx="50" cy="48" r="28" fill={paper} stroke={ink} strokeWidth="4" />
            {/* Ring-shaped round scholarly glasses */}
            <circle cx="39" cy="45" r="9" fill="none" stroke={ink} strokeWidth="3" />
            <circle cx="61" cy="45" r="9" fill="none" stroke={ink} strokeWidth="3" />
            <line x1="48" y1="45" x2="52" y2="45" stroke={ink} strokeWidth="3" />
            {/* Coral Scarf */}
            <path d="M 34 68 Q 50 74 66 68 L 68 76 Q 50 82 32 76 Z" fill={accent} stroke={ink} strokeWidth="3" />
            <path d="M 58 72 L 62 88 L 69 86 L 65 72 Z" fill={accent} stroke={ink} strokeWidth="2.5" />
            {/* Footnotes scroll trailing with tiny lines */}
            <path d="M 72 60 Q 84 62 82 78 Q 80 88 88 88" fill="none" stroke={ink} strokeWidth="2.5" strokeDasharray="2 2" />
            {/* Tiny pencil in hand */}
            <line x1="22" y1="62" x2="16" y2="70" stroke={accent} strokeWidth="3" strokeLinecap="round" />
            <polygon points="16,70 14,73 17,72" fill={ink} />
          </g>
        );

      case 'gus_gibbous':
        // Gus Gibbous: Wild hypothesis generator with string-and-pin board & antenna
        return (
          <g>
            {/* Tiny corkboard in background with pins */}
            <rect x="12" y="24" width="26" height="32" rx="3" fill="#D4A373" stroke={ink} strokeWidth="2.5" />
            {/* Red string and pin connections */}
            <line x1="18" y1="30" x2="30" y2="42" stroke="#EF4444" strokeWidth="1.5" />
            <line x1="30" y1="42" x2="20" y2="50" stroke="#EF4444" strokeWidth="1.5" />
            <circle cx="18" cy="30" r="2" fill="#EF4444" />
            <circle cx="30" cy="42" r="2" fill="#EF4444" />
            <circle cx="20" cy="50" r="2" fill="#EF4444" />
            {/* Wiry hair tuft */}
            <path d="M 44 26 Q 48 18 52 24 Q 56 16 60 26" fill="none" stroke={ink} strokeWidth="3" />
            {/* Head and periwinkle sweater */}
            <circle cx="52" cy="50" r="28" fill={paper} stroke={ink} strokeWidth="4" />
            <path d="M 32 72 Q 52 82 72 72" fill={accent} stroke={ink} strokeWidth="3.5" />
          </g>
        );

      case 'pixel':
        // Pixel: Data & stats with ring body, round specs and floating mint bar chart
        return (
          <g>
            {/* Ring body */}
            <circle cx="46" cy="48" r="27" fill={paper} stroke={ink} strokeWidth="4" />
            {/* Hollow center ring accent */}
            <circle cx="46" cy="50" r="10" fill="#E6F4EA" stroke={accent} strokeWidth="2.5" />
            {/* Big round glasses */}
            <circle cx="37" cy="44" r="8" fill="none" stroke={ink} strokeWidth="3" />
            <circle cx="55" cy="44" r="8" fill="none" stroke={ink} strokeWidth="3" />
            <line x1="45" y1="44" x2="47" y2="44" stroke={ink} strokeWidth="2.5" />
            {/* Floating mint bar chart */}
            <g transform="translate(68, 48)">
              {/* Axes */}
              <line x1="0" y1="28" x2="24" y2="28" stroke={ink} strokeWidth="2" />
              <line x1="0" y1="28" x2="0" y2="4" stroke={ink} strokeWidth="2" />
              {/* Bars (one taller) */}
              <rect x="3" y="16" width="4" height="12" fill={accent} stroke={ink} strokeWidth="1.5" />
              <rect x="9" y="6" width="5" height="22" fill={accent} stroke={ink} strokeWidth="2" />
              <rect x="16" y="12" width="4" height="16" fill={accent} stroke={ink} strokeWidth="1.5" />
            </g>
          </g>
        );

      case 'nana_nuance':
        // Nana Nuance: Elder context keeper with ring bun, peach cardigan, half-moon specs & long scarf
        return (
          <g>
            {/* Ring bun on top */}
            <circle cx="50" cy="22" r="12" fill={accent} stroke={ink} strokeWidth="3.5" />
            <circle cx="50" cy="22" r="5" fill={paper} stroke={ink} strokeWidth="2.5" />
            {/* Head */}
            <circle cx="50" cy="50" r="28" fill={paper} stroke={ink} strokeWidth="4" />
            {/* Half-moon glasses */}
            <path d="M 33 46 Q 41 53 47 46 Z" fill="none" stroke={ink} strokeWidth="2.5" />
            <path d="M 53 46 Q 59 53 67 46 Z" fill="none" stroke={ink} strokeWidth="2.5" />
            <line x1="47" y1="46" x2="53" y2="46" stroke={ink} strokeWidth="2" />
            {/* Peach Cardigan & trailing knitted scarf */}
            <path d="M 28 72 Q 50 82 72 72" fill={accent} stroke={ink} strokeWidth="3" />
            <path d="M 60 74 Q 68 84 64 96 L 72 96 Q 78 84 68 74 Z" fill={accent} stroke={ink} strokeWidth="2.5" />
          </g>
        );

      case 'bramble':
        // Bramble: Sleepy tortoise historian with giant magnifying glass & scroll
        return (
          <g>
            {/* Tortoise shell behind */}
            <ellipse cx="50" cy="52" rx="32" ry="28" fill="#FEF08A" stroke={ink} strokeWidth="4" />
            {/* Head */}
            <circle cx="50" cy="48" r="24" fill={paper} stroke={ink} strokeWidth="3.5" />
            {/* Butter-yellow vest */}
            <path d="M 36 66 L 42 78 L 58 78 L 64 66 Z" fill={accent} stroke={ink} strokeWidth="2.5" />
            {/* Enormous magnifying glass in hand (absurdist scale) */}
            <g transform="translate(10, 42)">
              <circle cx="16" cy="16" r="14" fill="#E0F2FE" fillOpacity="0.6" stroke={ink} strokeWidth="3.5" />
              <line x1="6" y1="26" x2="0" y2="34" stroke={accent} strokeWidth="4.5" strokeLinecap="round" />
            </g>
          </g>
        );

      case 'zed':
        // Zed: Web scout running with hamster wheel & laptop with flying tabs
        return (
          <g>
            {/* Hamster wheel background arc */}
            <path d="M 12 78 A 42 42 0 0 1 88 78" fill="none" stroke={ink} strokeWidth="3" strokeDasharray="6 4" />
            {/* Messy bun */}
            <circle cx="62" cy="22" r="10" fill={accent} stroke={ink} strokeWidth="3" />
            {/* Head */}
            <circle cx="48" cy="46" r="27" fill={paper} stroke={ink} strokeWidth="4" />
            {/* Coral-orange hoodie */}
            <path d="M 28 68 Q 48 76 68 68" fill={accent} stroke={ink} strokeWidth="3.5" />
            {/* Laptop in hands with flying browser tabs */}
            <rect x="52" y="60" width="22" height="14" rx="2" fill="#1E293B" stroke={ink} strokeWidth="2.5" />
            <rect x="54" y="62" width="18" height="10" fill="#38BDF8" />
            {/* Flying mini tabs */}
            <rect x="74" y="48" width="10" height="7" rx="1.5" fill={paper} stroke={ink} strokeWidth="1.5" transform="rotate(-15 79 51)" />
            <rect x="80" y="58" width="9" height="6" rx="1.5" fill={accent} stroke={ink} strokeWidth="1.5" transform="rotate(12 84 61)" />
          </g>
        );

      case 'prof_oop':
        // Prof. Oop: Devil's advocate with bushy moustache & equation chalkboard
        return (
          <g>
            {/* Chalkboard on right */}
            <rect x="66" y="32" width="24" height="26" rx="2" fill="#1E293B" stroke={ink} strokeWidth="2.5" />
            <text x="70" y="48" fill="#F8FAFC" fontSize="7" fontWeight="bold" fontFamily="monospace">1+1=3</text>
            {/* Head */}
            <circle cx="46" cy="48" r="28" fill={paper} stroke={ink} strokeWidth="4" />
            {/* Bushy ring moustache (Brand DNA) */}
            <path d="M 32 58 Q 46 64 46 54 Q 46 64 60 58 Q 46 68 32 58 Z" fill={ink} />
            {/* Lilac waistcoat */}
            <path d="M 28 72 L 46 80 L 64 72" fill={accent} stroke={ink} strokeWidth="3" />
          </g>
        );

      case 'moss':
        // Moss: Fact-checker with sage moss fronds and oversized rubber stamp
        return (
          <g>
            {/* Fuzzy moss bump ring outline */}
            <circle cx="48" cy="48" r="28" fill="#DCFCE7" stroke={ink} strokeWidth="4" />
            {/* Oversized rubber stamp in hand */}
            <g transform="translate(62, 48)">
              {/* Stamp handle */}
              <path d="M 12 0 L 12 12" stroke={ink} strokeWidth="4" strokeLinecap="round" />
              <circle cx="12" cy="0" r="4" fill={accent} stroke={ink} strokeWidth="2" />
              {/* Stamp base block */}
              <rect x="0" y="12" width="24" height="14" rx="3" fill={accent} stroke={ink} strokeWidth="2.5" />
              <text x="3" y="22" fill={ink} fontSize="6" fontWeight="bold" fontFamily="sans-serif">CITE</text>
            </g>
          </g>
        );

      case 'dot':
        // Dot: TL;DR summariser atop stack of papers with megaphone
        return (
          <g>
            {/* Stack of research papers */}
            <rect x="22" y="70" width="56" height="6" rx="1.5" fill={paper} stroke={ink} strokeWidth="2.5" />
            <rect x="24" y="76" width="52" height="6" rx="1.5" fill={paper} stroke={ink} strokeWidth="2.5" />
            <rect x="20" y="82" width="60" height="6" rx="1.5" fill={paper} stroke={ink} strokeWidth="2.5" />
            {/* Tiny Dot ring mascot standing on stack */}
            <circle cx="50" cy="48" r="20" fill={paper} stroke={ink} strokeWidth="3.5" />
            <circle cx="50" cy="48" r="7" fill="#FEF3C7" stroke={accent} strokeWidth="2" />
            {/* Comically small gold megaphone */}
            <polygon points="66,44 78,38 78,54 66,48" fill={accent} stroke={ink} strokeWidth="2" />
            <circle cx="78" cy="46" r="3" fill={ink} />
          </g>
        );

      case 'koa':
        // Cheerful boy with fluffy ring-shaped cloud hair
        return (
          <g>
            {/* Ring hair puffs */}
            <circle cx="30" cy="30" r="12" fill={accent} stroke={ink} strokeWidth="3.5" />
            <circle cx="50" cy="24" r="14" fill={accent} stroke={ink} strokeWidth="3.5" />
            <circle cx="70" cy="30" r="12" fill={accent} stroke={ink} strokeWidth="3.5" />
            {/* Head */}
            <circle
              cx="50"
              cy="50"
              r="28"
              fill={paper}
              stroke={ink}
              strokeWidth="4"
            />
            {/* Tiny sparkles around */}
            <path
              d="M 18 22 L 20 18 L 22 22 L 26 24 L 22 26 L 20 30 L 18 26 L 14 24 Z"
              fill="#FDE047"
            />
            <path
              d="M 78 18 L 80 15 L 82 18 L 85 19 L 82 20 L 80 23 L 78 20 L 75 19 Z"
              fill="#FDE047"
            />
          </g>
        );

      case 'ko':
      default:
        // Kō Base Mascot / Moderator: hollow donut ring body with referee whistle & clipboard
        return (
          <g>
            {/* Outer ring */}
            <circle
              cx="50"
              cy="48"
              r="30"
              fill={paper}
              stroke={ink}
              strokeWidth="4"
            />
            {/* Hollow ring center / belly cut-out (Brand DNA) */}
            <circle
              cx="50"
              cy="50"
              r="12"
              fill="#EDECE6"
              stroke={ink}
              strokeWidth="3.5"
            />
            {/* Tiny clipboard */}
            <rect x="64" y="56" width="16" height="22" rx="2" fill="#E2E8F0" stroke={ink} strokeWidth="2" />
            <line x1="68" y1="62" x2="76" y2="62" stroke={ink} strokeWidth="1.5" />
            <line x1="68" y1="67" x2="76" y2="67" stroke={ink} strokeWidth="1.5" />
            <line x1="68" y1="72" x2="74" y2="72" stroke={ink} strokeWidth="1.5" />
            {/* Referee whistle necklace */}
            <path d="M 44 64 L 56 64" stroke={ink} strokeWidth="2" />
            <circle cx="50" cy="68" r="3" fill="#38BDF8" stroke={ink} strokeWidth="1.5" />
            {/* Stubby arms */}
            <ellipse cx="20" cy="52" rx="4.5" ry="3.5" fill={paper} stroke={ink} strokeWidth="3" />
            <ellipse cx="80" cy="52" rx="4.5" ry="3.5" fill={paper} stroke={ink} strokeWidth="3" />
          </g>
        );
    }
  };

  return (
    <div
      className={`inline-flex items-center justify-center select-none ${
        interactive ? 'cursor-pointer hover:scale-105 transition-transform' : ''
      } ${className}`}
      style={{ width: size, height: size }}
      title={`${character.name} ("${character.catchphrase}")`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible drop-shadow-xs"
      >
        {/* Soft circle background container */}
        <circle cx="50" cy="50" r="46" fill="#F4F3EE" />

        {/* Character Body & Props */}
        {renderBody()}

        {/* Eyes & Mouth (Expression System) */}
        {renderEyesAndMouth()}

        {/* Floating Macron Bar (Brand DNA) */}
        {renderMacronBar()}
      </svg>
    </div>
  );
};
