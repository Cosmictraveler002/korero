export type ExpressionType =
  | 'happy'
  | 'laugh'
  | 'love'
  | 'shock'
  | 'sideeye'
  | 'sleepy'
  | 'sad'
  | 'thinking';

export interface KoreroCharacter {
  id: string;
  name: string;
  role: 'mascot' | 'persona' | 'assistant';
  gender_presentation: 'unisex' | 'female' | 'male';
  vibe: string;
  catchphrase: string;
  accent: string;
  accentName: string;
  expressions: ExpressionType[];
  defaultExpression: ExpressionType;
  description: string;
}

export const KORERO_CHARACTERS: KoreroCharacter[] = [
  // v1 Casual Layer Cast
  {
    id: 'ko',
    name: 'Kō',
    role: 'mascot',
    gender_presentation: 'unisex',
    vibe: 'Warm, calm, curious moderator who keeps the crew on topic',
    catchphrase: 'Okay, crew, what do we actually know?',
    accent: '#38BDF8', // soft sky
    accentName: 'sky',
    expressions: ['happy', 'laugh', 'love', 'shock', 'sideeye', 'sleepy', 'sad', 'thinking'],
    defaultExpression: 'happy',
    description: 'The brand mascot and research host. A friendly ring-shaped creature with a hollow donut body, floating macron bar, and tiny clipboard.',
  },
  {
    id: 'tui',
    name: 'Tui',
    role: 'persona',
    gender_presentation: 'female',
    vibe: 'Gossip, non-stop talker, group chat queen',
    catchphrase: "Wait, wait, you won't BELIEVE this.",
    accent: '#FF8A7A', // coral
    accentName: 'coral',
    expressions: ['happy', 'laugh', 'love', 'shock', 'sideeye', 'sleepy', 'sad', 'thinking'],
    defaultExpression: 'happy',
    description: 'Round chatty bird girl with a fluffy throat tuft, macron bar hair clip, and wide sparkly eyes.',
  },
  {
    id: 'mira',
    name: 'Mira',
    role: 'persona',
    gender_presentation: 'female',
    vibe: 'Sleepy, cozy, late-night deep talks',
    catchphrase: "One more message and then I'll sleep.",
    accent: '#8E9AAF', // periwinkle
    accentName: 'periwinkle',
    expressions: ['happy', 'laugh', 'love', 'shock', 'sideeye', 'sleepy', 'sad', 'thinking'],
    defaultExpression: 'sleepy',
    description: 'Sleepy girl in an oversized hoodie with a ring-shaped hood, macron bar headband, and warm tea.',
  },
  {
    id: 'hana',
    name: 'Hana',
    role: 'persona',
    gender_presentation: 'female',
    vibe: 'Excited, supportive, celebrates everything',
    catchphrase: "SEND IT. I'm so proud of you!",
    accent: '#FDE047', // butter yellow
    accentName: 'butter yellow',
    expressions: ['happy', 'laugh', 'love', 'shock', 'sideeye', 'sleepy', 'sad', 'thinking'],
    defaultExpression: 'happy',
    description: 'Bubbly girl with ring-shaped earrings, macron bar hair accessory, big headphones, and blushing cheeks.',
  },
  {
    id: 'manu',
    name: 'Manu',
    role: 'persona',
    gender_presentation: 'male',
    vibe: 'Sarcastic, "I told you so", confident',
    catchphrase: 'Called it.',
    accent: '#86EFAC', // mint
    accentName: 'mint',
    expressions: ['happy', 'laugh', 'love', 'shock', 'sideeye', 'sleepy', 'sad', 'thinking'],
    defaultExpression: 'sideeye',
    description: 'Round bird boy with a tiny macron bar unibrow, half-lidded smug eyes, and crossed wings.',
  },
  {
    id: 'ari',
    name: 'Ari',
    role: 'persona',
    gender_presentation: 'male',
    vibe: 'Unbothered on the outside, secretly caring',
    catchphrase: '...cool. I guess.',
    accent: '#FDBA74', // peach
    accentName: 'peach',
    expressions: ['happy', 'laugh', 'love', 'shock', 'sideeye', 'sleepy', 'sad', 'thinking'],
    defaultExpression: 'sideeye',
    description: 'Tall-headed boy with a ring-shaped beanie, macron bar on forehead, flat dot eyes, and lazy wave.',
  },
  {
    id: 'koa',
    name: 'Koa',
    role: 'persona',
    gender_presentation: 'male',
    vibe: 'Pure enthusiasm, replies instantly, loves everyone',
    catchphrase: 'OMG HIIII!!',
    accent: '#FB923C', // coral-orange
    accentName: 'coral orange',
    expressions: ['happy', 'laugh', 'love', 'shock', 'sideeye', 'sleepy', 'sad', 'thinking'],
    defaultExpression: 'happy',
    description: 'Cheerful boy with fluffy hair shaped like a ring, macron bar floating above, and big happy eyes.',
  },
  {
    id: 'rook',
    name: 'Rook',
    role: 'persona',
    gender_presentation: 'male',
    vibe: 'Blunt, direct problem solver. Allergic to fluff',
    catchphrase: 'cool story. still doesn\'t solve the problem.',
    accent: '#0284C7', // deep sky
    accentName: 'deep sky',
    expressions: ['happy', 'laugh', 'love', 'shock', 'sideeye', 'sleepy', 'sad', 'thinking'],
    defaultExpression: 'sideeye',
    description: 'Sharp, angular minimalist mascot with focused visor-line macron bar and unwavering direct presence.',
  },

  // v2.1 Refined Research Crew Cast
  {
    id: 'zed',
    name: 'Zed',
    role: 'persona',
    gender_presentation: 'female',
    vibe: 'Hyper caffeinated web scout speed-scrolling browser tabs',
    catchphrase: "Tab 47! Found something! No wait, it's a recipe blog.",
    accent: '#F97316', // coral-orange
    accentName: 'coral orange',
    expressions: ['happy', 'laugh', 'love', 'shock', 'sideeye', 'sleepy', 'sad', 'thinking'],
    defaultExpression: 'happy',
    description: 'An energetic teen girl with a ring messy bun, macron hairclip, coral-orange hoodie, and laptop on a hamster wheel with flying tabs.',
  },
  {
    id: 'bramble',
    name: 'Bramble',
    role: 'persona',
    gender_presentation: 'male',
    vibe: 'Historian & Citations lead — traces origin, nails exact sources and footnotes',
    catchphrase: "Let's find the original source. Slowly. ...and while we're here, what's the exact publication date?",
    accent: '#FACC15', // butter yellow
    accentName: 'butter yellow',
    expressions: ['happy', 'laugh', 'love', 'shock', 'sideeye', 'sleepy', 'sad', 'thinking'],
    defaultExpression: 'thinking',
    description: 'A round, sleepy tortoise-like boy with a ring shell, macron bookmark, butter-yellow vest, holding an enormous magnifying glass, peering at a scroll with a trailing ribbon of footnotes.',
  },
  {
    id: 'gus_gibbous',
    name: 'Gus Gibbous',
    role: 'persona',
    gender_presentation: 'male',
    vibe: 'Chaotic wild hypothesis generator connecting things with red string',
    catchphrase: "What if... hear me out... it's all connected?",
    accent: '#818CF8', // periwinkle
    accentName: 'periwinkle',
    expressions: ['happy', 'laugh', 'love', 'shock', 'sideeye', 'sleepy', 'sad', 'thinking'],
    defaultExpression: 'shock',
    description: 'Wild-eyed enthusiast with ring-shaped wiry hair, an antenna macron bar, and a tiny corkboard covered in red string and pins.',
  },
  {
    id: 'pixel',
    name: 'Pixel',
    role: 'persona',
    gender_presentation: 'unisex',
    vibe: 'Excited about numbers, speaks in ratios and sample sizes',
    catchphrase: "Beautiful. But what's the n?",
    accent: '#34D399', // mint
    accentName: 'mint',
    expressions: ['happy', 'laugh', 'love', 'shock', 'sideeye', 'sleepy', 'sad', 'thinking'],
    defaultExpression: 'happy',
    description: 'Small non-binary blob creature with a ring-shaped body, macron bar plot axis, large round glasses, and a floating bar chart.',
  },
  {
    id: 'nana_nuance',
    name: 'Nana Nuance',
    role: 'persona',
    gender_presentation: 'female',
    vibe: 'Scope & context keeper — limitations, funding, missing perspectives',
    catchphrase: "Oh, sweetheart, it's more complicated than that.",
    accent: '#FBA988', // peach
    accentName: 'peach',
    expressions: ['happy', 'laugh', 'love', 'shock', 'sideeye', 'sleepy', 'sad', 'thinking'],
    defaultExpression: 'happy',
    description: 'A soft grandmother character with a ring bun, macron knitting needle through bun, peach cardigan, half-moon glasses, and absurdly long scarf.',
  },
  {
    id: 'prof_oop',
    name: 'Prof. Oop',
    role: 'persona',
    gender_presentation: 'male',
    vibe: 'Booming, theatrical devil\'s advocate arguing the opposite for sport',
    catchphrase: 'Allow me to argue the opposite, purely for sport!',
    accent: '#C084FC', // lilac
    accentName: 'lilac',
    expressions: ['happy', 'laugh', 'love', 'shock', 'sideeye', 'sleepy', 'sad', 'thinking'],
    defaultExpression: 'thinking',
    description: 'A dramatic professor with a ring bushy moustache, mortarboard macron bar, lilac waistcoat, and chalkboard with wrong equations.',
  },
  {
    id: 'moss',
    name: 'Moss',
    role: 'persona',
    gender_presentation: 'unisex',
    vibe: 'Quiet, dry fact-checker — final gate before verdict',
    catchphrase: '...citation needed.',
    accent: '#84A98C', // sage
    accentName: 'sage',
    expressions: ['happy', 'laugh', 'love', 'shock', 'sideeye', 'sleepy', 'sad', 'thinking'],
    defaultExpression: 'sideeye',
    description: 'A fuzzy ring moss creature with a fern frond macron bar, sage accent, and an oversized rubber stamp.',
  },
];

export const EXPRESSION_LABELS: Record<ExpressionType, { label: string; emoji: string }> = {
  happy: { label: 'Happy', emoji: '✨' },
  laugh: { label: 'LOL', emoji: '😂' },
  love: { label: 'Love', emoji: '💖' },
  shock: { label: 'Shock', emoji: '😮' },
  sideeye: { label: 'Side-eye', emoji: '👀' },
  sleepy: { label: 'Sleepy', emoji: '😴' },
  sad: { label: 'Sad', emoji: '🥺' },
  thinking: { label: 'Thinking', emoji: '🤔' },
};

/**
 * Maps persona names or IDs to a matching Kōrero mascot character
 */
export function getCharacterByPersonaName(nameOrId: string): KoreroCharacter {
  const norm = (nameOrId || '').toLowerCase().trim();
  
  // Direct ID or name lookups
  const direct = KORERO_CHARACTERS.find(
    (c) => c.id === norm || c.name.toLowerCase() === norm
  );
  if (direct) return direct;

  // Keyword / partial match lookups
  if (norm.includes('quibble')) return KORERO_CHARACTERS.find((c) => c.id === 'bramble')!;
  if (norm.includes('gus') || norm.includes('gibbous')) return KORERO_CHARACTERS.find((c) => c.id === 'gus_gibbous')!;
  if (norm.includes('pixel')) return KORERO_CHARACTERS.find((c) => c.id === 'pixel')!;
  if (norm.includes('nuance') || norm.includes('nana')) return KORERO_CHARACTERS.find((c) => c.id === 'nana_nuance')!;
  if (norm.includes('bramble')) return KORERO_CHARACTERS.find((c) => c.id === 'bramble')!;
  if (norm.includes('zed')) return KORERO_CHARACTERS.find((c) => c.id === 'zed')!;
  if (norm.includes('oop') || norm.includes('prof')) return KORERO_CHARACTERS.find((c) => c.id === 'prof_oop')!;
  if (norm.includes('moss')) return KORERO_CHARACTERS.find((c) => c.id === 'moss')!;
  if (norm.includes('dot')) return KORERO_CHARACTERS.find((c) => c.id === 'ko')!;
  if (norm.includes('tui')) return KORERO_CHARACTERS.find((c) => c.id === 'tui')!;
  if (norm.includes('mira')) return KORERO_CHARACTERS.find((c) => c.id === 'mira')!;
  if (norm.includes('hana')) return KORERO_CHARACTERS.find((c) => c.id === 'hana')!;
  if (norm.includes('manu')) return KORERO_CHARACTERS.find((c) => c.id === 'manu')!;
  if (norm.includes('ari')) return KORERO_CHARACTERS.find((c) => c.id === 'ari')!;
  if (norm.includes('koa')) return KORERO_CHARACTERS.find((c) => c.id === 'koa')!;
  if (norm.includes('rook')) return KORERO_CHARACTERS.find((c) => c.id === 'rook')!;
  if (norm.includes('kō') || norm === 'ko') return KORERO_CHARACTERS.find((c) => c.id === 'ko')!;
  
  if (norm === 'you' || norm === 'user' || norm === 'human') return KORERO_CHARACTERS.find((c) => c.id === 'koa')!;
  if (norm === 'system') return KORERO_CHARACTERS.find((c) => c.id === 'ko')!;
  
  // Hash fallback
  const charCodeSum = norm.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const index = Math.abs(charCodeSum) % KORERO_CHARACTERS.length;
  return KORERO_CHARACTERS[index] || KORERO_CHARACTERS[0];
}
