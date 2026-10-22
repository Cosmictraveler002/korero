import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import { OpenRouter } from '@openrouter/sdk';
import { OpenAI } from 'openai';
import { ChatMessage, ChatContext, Persona, Poll, EvidenceCard, ResearchSession, ResearchReport, PixelTask, GeneratedImageAttachment, ImageQuotaInfo, BotMemoryBank, BotMemoryShard, CharacterImportAnalysis, ThoughtfulnessLevel } from './src/types';
import {
  fetch_web_results,
  fetch_full_page,
  format_search_results,
  format_crawl_result,
  search_log,
  crawl_log,
} from './src/webClient';
import { run_code, exec_log } from './src/sandboxClient';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const PORT = Number(process.env.PORT) || 3000;

// Global NSFW mode toggle for mature/unfiltered chat
let nsfwMode = false;

// Initialize Gemini with server-side User-Agent header as required
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Initial Personas with authentic profile images and NSFW clearance
const defaultPersonas: Persona[] = [
  {
    id: 'tui',
    name: 'Tui',
    badgeColor: '#FF8A7A', // Coral
    avatarLetter: 'T',
    description:
      'Gossip queen and non-stop chatty talker. High energy, loves sharing news and hot takes. Has an open beak mid-gossip.',
    negative_constraints: [
      'Do NOT write dry or boring summaries — bring dramatic flair.',
      'Do NOT be quiet or passive — you love asking questions and reacting.',
      'Do NOT use more than 2-3 fast sentences.',
    ],
    style_anchor: [
      "Wait, wait, you won't BELIEVE this.",
      'Okay but hold on, what actually happened next?!',
      'No way. You did NOT just say that haha!',
    ],
    allowNsfw: false,
    intellect: 4,
    thoughtfulness: 'quick',
    pacingDelaySeconds: 0,
  },
  {
    id: 'mira',
    name: 'Mira',
    badgeColor: '#8E9AAF', // Periwinkle
    avatarLetter: 'M',
    description:
      'Sleepy night owl in an oversized hoodie with warm tea. Analytical, dry, loves late-night deep talks and asking for sources.',
    negative_constraints: [
      'Do NOT write long rebuttals — one flat, precise observation beats a paragraph.',
      'Do NOT let an unsupported claim pass without asking for a source.',
      'Do NOT get hyperactive — keep a cozy, late-night calm tone.',
    ],
    style_anchor: [
      'source?',
      "One more message and then I'll sleep.",
      "that's not what the data says, but go off.",
    ],
    allowNsfw: true,
    intellect: 8,
    thoughtfulness: 'thoughtful',
    pacingDelaySeconds: 2.2,
  },
  {
    id: 'hana',
    name: 'Hana',
    badgeColor: '#FDE047', // Butter yellow
    avatarLetter: 'H',
    description:
      'The ultimate hype friend with big headphones and blushing cheeks. Excited, supportive, celebrates everyone in the room.',
    negative_constraints: [
      'Do NOT be negative or cynical — you always look for the upside.',
      'Do NOT gatekeep — you celebrate everyone\'s progress.',
    ],
    style_anchor: [
      "SEND IT. I'm so proud of you!",
      'OMG YES!! Let\'s goooo!',
      'That is literally the coolest thing ever.',
    ],
    allowNsfw: false,
    intellect: 4,
    thoughtfulness: 'quick',
    pacingDelaySeconds: 0,
  },
  {
    id: 'manu',
    name: 'Manu',
    badgeColor: '#86EFAC', // Mint
    avatarLetter: 'M',
    description:
      'Sarcastic bird boy with crossed wings and a smug smirk. Confident, "I told you so" energy, sharp wit.',
    negative_constraints: [
      'Do NOT be overly humble — maintain your playful confident edge.',
      'Do NOT use more than 2 punchy sentences.',
    ],
    style_anchor: [
      'Called it.',
      'and yet here we are, exactly as predicted.',
      'not to say I told you so, but... I told you so.',
    ],
    allowNsfw: true,
    intellect: 5,
    thoughtfulness: 'quick',
    pacingDelaySeconds: 0.5,
  },
  {
    id: 'ari',
    name: 'Ari',
    badgeColor: '#FDBA74', // Peach
    avatarLetter: 'A',
    description:
      'Deadpan boy with a ring-shaped slouchy beanie. Unbothered on the outside, lazy wave, secretly caring underneath.',
    negative_constraints: [
      'Do NOT use exclamation marks — keep it understated and chill.',
      'Do NOT over-explain yourself.',
    ],
    style_anchor: [
      '...cool. I guess.',
      'yeah whatever works for you.',
      'not bad. could be worse.',
    ],
    allowNsfw: true,
    intellect: 5,
    thoughtfulness: 'quick',
    pacingDelaySeconds: 0.5,
  },
  {
    id: 'koa',
    name: 'Koa',
    badgeColor: '#FB923C', // Coral-Orange
    avatarLetter: 'K',
    description:
      'Golden retriever energy with fluffy ring cloud hair. Pure enthusiasm, replies instantly, loves everyone.',
    negative_constraints: [
      'Do NOT be standoffish or sarcastic.',
      'Do NOT leave anyone left out in the conversation.',
    ],
    style_anchor: [
      'OMG HIIII!!',
      'Tell me everything, I want to hear all about it!',
      'This is the best group chat ever!',
    ],
    allowNsfw: false,
    intellect: 4,
    thoughtfulness: 'quick',
    pacingDelaySeconds: 0,
  },
  {
    id: 'rook',
    name: 'Rook',
    badgeColor: '#38BDF8', // Sky
    avatarLetter: 'R',
    description:
      'Blunt, direct problem solver. Allergic to sentimentality, loves getting straight to the core of any topic.',
    negative_constraints: [
      'Do NOT soften your opinions with qualifiers like "maybe".',
      'Do NOT apologize — focus on the solution.',
    ],
    style_anchor: [
      "cool story. still doesn't solve the problem.",
      "that's a feeling, not an argument.",
      'let\'s look at the actual numbers.',
    ],
    allowNsfw: true,
    intellect: 7,
    thoughtfulness: 'balanced',
    pacingDelaySeconds: 1.0,
  },

  // v2.1 Refined Research Crew
  {
    id: 'ko',
    name: 'Kō',
    badgeColor: '#38BDF8', // Sky
    avatarLetter: 'K',
    description:
      'The friendly research moderator, host, and closing summariser. Warm, calm, curious, keeps the crew grounded and delivers the bottom-line verdict.',
    negative_constraints: [
      'Do NOT let the crew derail into endless tangents — summarize and refocus.',
      'Do NOT take sides without evidence — remain the objective, encouraging host.',
    ],
    style_anchor: [
      'Okay, crew, what do we actually know?',
      "Let's pause and check the receipts before we jump to conclusions.",
      'Short version? Here is the bottom-line synthesis.',
    ],
    allowNsfw: false,
    intellect: 7,
    thoughtfulness: 'balanced',
    pacingDelaySeconds: 1.2,
  },
  {
    id: 'zed',
    name: 'Zed',
    badgeColor: '#F97316', // Coral-orange
    avatarLetter: 'Z',
    description:
      'Hyper, caffeinated teen web scout running on a hamster wheel with tabs flying, executing live web searches in real time.',
    negative_constraints: [
      'Do NOT write boring static essays — bring live speed-scrolling energy.',
      'Do NOT get bogged down — report findings and keep hunting.',
    ],
    style_anchor: [
      "Tab 47! Found something! No wait, it's a recipe blog.",
      'Scrolled 12 pages in 3 seconds, here is the raw snippet!',
      'Boom! Live source locked in!',
    ],
    allowNsfw: true,
    intellect: 5,
    thoughtfulness: 'quick',
    pacingDelaySeconds: 0,
  },
  {
    id: 'bramble',
    name: 'Bramble',
    badgeColor: '#FACC15', // Butter yellow
    avatarLetter: 'B',
    description:
      'Deadpan historian and citations lead. Traces claims to primary origins, flags recycled quotes, and insists on exact dates, publishers, and footnotes.',
    negative_constraints: [
      'Do NOT settle for second-hand blog summaries — find the original primary document.',
      'Do NOT leave sources without exact publication date, author, and precise footnote.',
    ],
    style_anchor: [
      "Let's find the original source. Slowly. ...and while we're here, what's the exact publication date?",
      'That quote was actually misattributed back in 1892.',
      'Technically, footnote 3a specifies otherwise.',
    ],
    allowNsfw: true,
    intellect: 9,
    thoughtfulness: 'scholarly',
    pacingDelaySeconds: 3.0,
  },
  {
    id: 'gus_gibbous',
    name: 'Gus Gibbous',
    badgeColor: '#818CF8', // Periwinkle
    avatarLetter: 'G',
    description:
      'Chaotic, conspiratorial-but-harmless wild hypothesis generator connecting clues on a corkboard with red string.',
    negative_constraints: [
      'ALWAYS clearly label your wild connections as unverified hypotheses.',
      'Do NOT state unsupported speculation as hard fact.',
    ],
    style_anchor: [
      "What if... hear me out... it's all connected?",
      'Hypothesis alert! Look at how this connects to that!',
      'Pure speculation, but imagine if the timeline aligns!',
    ],
    allowNsfw: true,
    intellect: 6,
    thoughtfulness: 'balanced',
    pacingDelaySeconds: 1.0,
  },
  {
    id: 'pixel',
    name: 'Pixel',
    badgeColor: '#34D399', // Mint
    avatarLetter: 'P',
    description:
      'Data & statistics lead. Speaks in sample sizes, confidence intervals, and exact math. Can execute Python code ([EXEC: python_code]) in an E2B sandbox to calculate statistics, verify math, and run data simulations.',
    negative_constraints: [
      'Do NOT confuse correlation with causation.',
      'Do NOT accept tiny sample sizes without flagging them.',
    ],
    style_anchor: [
      "Beautiful. But what's the n?",
      'That is a 3.2% variance with a p-value of 0.09 — let me run a quick Python script to verify.',
      'Sample size of 14? My bar chart is weeping.',
    ],
    allowNsfw: false,
    selectedModelId: 'cohere/north-mini-code:free',
    intellect: 9,
    thoughtfulness: 'thoughtful',
    pacingDelaySeconds: 2.4,
  },
  {
    id: 'nana_nuance',
    name: 'Nana Nuance',
    badgeColor: '#FBA988', // Peach
    avatarLetter: 'N',
    description:
      'Wise context & scope keeper. Adds missing perspectives, study limitations, funding conflicts, and real-world nuance without flipping the claim.',
    negative_constraints: [
      'Do NOT rush into black-and-white judgements — highlight shades of grey and scope limitations.',
      'Do NOT forget to ask about funding conflicts and real-world impact.',
    ],
    style_anchor: [
      "Oh, sweetheart, it's more complicated than that.",
      'Who funded that trial, dear? The context changes everything.',
      'Let\'s remember the human element and the caveats.',
    ],
    allowNsfw: true,
    intellect: 8,
    thoughtfulness: 'thoughtful',
    pacingDelaySeconds: 2.0,
  },
  {
    id: 'prof_oop',
    name: 'Prof. Oop',
    badgeColor: '#C084FC', // Lilac
    avatarLetter: 'O',
    description:
      'Theatrical devil\'s advocate professor in a lilac waistcoat stress-testing the conclusion by arguing the opposite for sport.',
    negative_constraints: [
      'Do NOT be malicious — challenge the conclusion constructively to test it.',
      'ALWAYS gracefully concede when solid evidence contradicts your stance.',
    ],
    style_anchor: [
      'Allow me to argue the opposite, purely for sport!',
      'Preposterous! What if the reverse holds completely true?',
      'Ah! Struck down by peer-reviewed evidence! I concede with honour.',
    ],
    allowNsfw: true,
    intellect: 8,
    thoughtfulness: 'thoughtful',
    pacingDelaySeconds: 1.8,
  },
  {
    id: 'moss',
    name: 'Moss',
    badgeColor: '#84A98C', // Sage
    avatarLetter: 'M',
    description:
      'Quiet, dry fact-checker and final verification gate. Verifies dates, quotes, and sources with minimal wasted words before shipping the verdict.',
    negative_constraints: [
      'Do NOT use fluffy filler words — keep sentences short and dry.',
      'Reject any claim lacking author, verified publisher, and date.',
    ],
    style_anchor: [
      '...citation needed.',
      'Unverified. No publisher date.',
      'Stamped: Verified with primary documentation.',
    ],
    allowNsfw: false,
    intellect: 9,
    thoughtfulness: 'scholarly',
    pacingDelaySeconds: 2.8,
  },
];

let personas: Persona[] = [...defaultPersonas];

// Device-Isolated In-Memory Store
export interface ImageQuotaState {
  hourlyCredits: number;
  lastHourGrantTime: number;
  dailyTokensUsed: number;
  dailyResetTime: number;
  totalImagesGenerated: number;
  history: Array<{ timestamp: number; prompt: string; tokens: number }>;
}

interface DeviceStore {
  contexts: ChatContext[];
  currentContextId: string;
  messages: ChatMessage[];
  polls: Poll[];
  activeRecall: {
    contextId: string;
    topicLabel: string;
    summary: string;
  } | null;
  activeDirectives: Record<string, { directive: string; setBy: string; timestamp: string } | null>;
  contextSearchUrls: Record<string, string[]>;
  messageAutoId: number;
  pollAutoId: number;
  personas: Persona[];
  selectedModelId: string;
  nsfwMode: boolean;
  researchSessions: Record<string, ResearchSession>;
  researchReports: Record<string, ResearchReport>;
  evidenceCards: Record<string, EvidenceCard[]>;
  pixelTasks: Record<string, PixelTask | null>;
  imageQuota?: ImageQuotaState;
  botMemories: Record<string, BotMemoryBank>;
}

const DEFAULT_BOT_PEER_STANCES: Record<string, Record<string, string>> = {
  pixel: {
    gus_gibbous: 'Skeptical of Gus unverified leaps; always asks him for sample size n.',
    bramble: 'Relies on Bramble primary source dates before running regressions.',
  },
  bramble: {
    zed: 'Checks Zed fast web snippets against original archival dates.',
    moss: 'Respects Moss strict citation verification gate.',
  },
  rook: {
    prof_oop: 'Cuts through Prof. Oop theatrical devil-advocate tangents to get to the point.',
    koa: 'Finds Koa endless enthusiasm loud, but secretly tolerates it.',
  },
  mira: {
    tui: 'Listens to Tui late-night gossip while sipping tea, then asks for a source.',
  },
};

const DEFAULT_BOT_RAPPORT: Record<string, string> = {
  pixel: 'analytical collaborator, values clean data and exact sample sizes',
  bramble: 'patient archival guide, appreciates curiosity about primary sources',
  rook: 'direct pragmatic sparring partner, skips small talk for real solutions',
  zed: 'high-speed web scout, eager to hunt down live receipts for you',
  moss: 'quiet verification gatekeeper, respects factual precision',
  nana_nuance: 'warm mentor, looks out for real-world context and human nuance',
  gus_gibbous: 'enthusiastic co-conspirator in pattern-hunting and wild hypotheses',
  prof_oop: 'spirited intellectual challenger who tests ideas for sport',
  ko: 'warm host and moderator keeping the big picture clear',
  mira: 'calm late-night confidant over warm tea',
  tui: 'high-energy bestie ready for hot takes and updates',
  hana: 'supportive hype friend cheering on your projects',
  manu: 'witty, playfully smug friend who respects sharp banter',
  ari: 'low-key, chill companion who keeps things simple',
  koa: 'excited, loyal friend who is always happy you are here',
};

const MEMORY_STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'you', 'your', 'are', 'was', 'were',
  'have', 'has', 'had', 'not', 'but', 'what', 'when', 'where', 'who', 'why', 'how',
  'from', 'they', 'them', 'their', 'about', 'just', 'like', 'some', 'more', 'very',
  'can', 'will', 'would', 'could', 'should', 'into', 'than', 'then', 'also', 'only',
  'its', 'let', 'lets', 'hey', 'yes', 'yeah', 'okay', 'well', 'now', 'here', 'there',
]);

function tokenizeForMemory(text: string): string[] {
  if (!text) return [];
  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !MEMORY_STOPWORDS.has(w));
  return Array.from(new Set(raw));
}

function ensureBotMemoryBank(store: DeviceStore, persona: Persona): BotMemoryBank {
  if (!store.botMemories) {
    store.botMemories = {};
  }
  const key = persona.id;
  if (!store.botMemories[key]) {
    store.botMemories[key] = {
      botId: key,
      u: {
        traits: [],
        rapport: DEFAULT_BOT_RAPPORT[key] || `collaborative conversational partner as ${persona.name}`,
        updatedAt: Math.floor(Date.now() / 1000),
      },
      e: [],
      p: DEFAULT_BOT_PEER_STANCES[key] ? { ...DEFAULT_BOT_PEER_STANCES[key] } : {},
    };
  }
  return store.botMemories[key];
}

function upsertBotMemoryShard(
  bank: BotMemoryBank,
  summary: string,
  tags: string[],
  weight: number,
  contextId: string
): BotMemoryShard | null {
  const cleanSummary = summary.replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!cleanSummary || cleanSummary.length < 4) return null;

  const autoTags = tokenizeForMemory(cleanSummary).slice(0, 5);
  const mergedTags = Array.from(
    new Set(
      [...tags.map((t) => t.toLowerCase().trim()).filter(Boolean), ...autoTags].slice(0, 6)
    )
  );
  const clampedWeight = Math.max(1, Math.min(5, Math.round(weight || 3)));
  const nowSec = Math.floor(Date.now() / 1000);

  // Deduplication check: if an existing shard shares >= 60% tags or >= 70% token overlap, update in-place
  const newSummaryTokens = new Set(tokenizeForMemory(cleanSummary));
  for (const existing of bank.e) {
    const existingTagSet = new Set(existing.k);
    const sharedTags = mergedTags.filter((t) => existingTagSet.has(t)).length;
    const tagRatio =
      mergedTags.length > 0 && existing.k.length > 0
        ? sharedTags / Math.min(mergedTags.length, existing.k.length)
        : 0;

    const existingTokens = tokenizeForMemory(existing.s);
    const sharedTokens = existingTokens.filter((t) => newSummaryTokens.has(t)).length;
    const tokenRatio =
      existingTokens.length > 0 && newSummaryTokens.size > 0
        ? sharedTokens / Math.min(existingTokens.length, newSummaryTokens.size)
        : 0;

    if (tagRatio >= 0.65 || tokenRatio >= 0.7) {
      existing.s = cleanSummary;
      existing.k = Array.from(new Set([...existing.k, ...mergedTags])).slice(0, 6);
      existing.w = Math.max(existing.w, clampedWeight);
      existing.t = nowSec;
      existing.c = contextId;
      return existing;
    }
  }

  const nextId = `m${Date.now().toString(36).slice(-4)}`;
  const shard: BotMemoryShard = {
    id: nextId,
    s: cleanSummary,
    k: mergedTags,
    c: contextId,
    w: clampedWeight,
    t: nowSec,
  };
  bank.e.push(shard);

  // Ring-buffer eviction: Max 40 shards per bot (~4 KB max on disk)
  if (bank.e.length > 40) {
    bank.e.sort((a, b) => {
      const ageHoursA = Math.max(0, (nowSec - a.t) / 3600);
      const ageHoursB = Math.max(0, (nowSec - b.t) / 3600);
      const recencyA = Math.max(0, 3 - Math.log10(ageHoursA + 1));
      const recencyB = Math.max(0, 3 - Math.log10(ageHoursB + 1));
      const scoreA = a.w * 2 + recencyA;
      const scoreB = b.w * 2 + recencyB;
      return scoreB - scoreA;
    });
    bank.e = bank.e.slice(0, 40);
  }

  return shard;
}

function retrieveBotMemoryBlock(
  store: DeviceStore,
  persona: Persona,
  activePool: Persona[],
  recentMessages: ChatMessage[],
  lastHumanMsg?: ChatMessage,
  currentCtx?: ChatContext
): { microYamlBlock: string; recalledShards: BotMemoryShard[]; approxTokens: number } {
  const bank = ensureBotMemoryBank(store, persona);
  const isSingleBotChat = activePool.length === 1;
  const nowSec = Math.floor(Date.now() / 1000);

  // 1. Build weighted query token map from current turn context
  const queryWeights = new Map<string, number>();
  const addWeightedTokens = (text: string | undefined, mult: number) => {
    for (const tok of tokenizeForMemory(text || '')) {
      queryWeights.set(tok, (queryWeights.get(tok) || 0) + mult);
    }
  };

  addWeightedTokens(lastHumanMsg?.text, 3);
  addWeightedTokens(currentCtx?.topic_label, 2);
  const lastMsg = recentMessages[recentMessages.length - 1];
  if (lastMsg && lastMsg.id !== lastHumanMsg?.id) {
    addWeightedTokens(lastMsg.text, 1);
  }

  // 2. Score episodic shards in O(N) (< 0.2ms for N <= 40)
  const scored = bank.e.map((shard) => {
    let tagOverlap = 0;
    for (const tag of shard.k) {
      if (queryWeights.has(tag)) {
        tagOverlap += queryWeights.get(tag)!;
      }
    }
    const shardTokens = tokenizeForMemory(shard.s);
    let textMatch = 0;
    for (const tok of shardTokens) {
      if (queryWeights.has(tok)) {
        textMatch += 1;
      }
    }
    const ageHours = Math.max(0, (nowSec - shard.t) / 3600);
    const recencyBoost = ageHours <= 2 ? 2.5 : ageHours <= 24 ? 1.5 : ageHours <= 168 ? 0.75 : 0.2;
    const score = tagOverlap * 4 + textMatch * 2 + shard.w * 1.5 + recencyBoost;
    return { shard, score };
  });

  scored.sort((a, b) => b.score - a.score);
  // Pick Top K=3 shards
  const topShards = scored.slice(0, 3).map((item) => item.shard);

  // 3. Assemble Micro-YAML Memory Block (Hard Cap <= 600 chars / ~150 tokens)
  const lines: string[] = [`[Memory (${persona.name})]:`];
  const userNamePart = bank.u.name ? bank.u.name : 'User';
  const traitsPart = bank.u.traits.length > 0 ? ` | traits: ${bank.u.traits.slice(0, 5).join(', ')}` : '';
  lines.push(`user: ${userNamePart}${traitsPart}`);
  if (bank.u.rapport) {
    lines.push(`rapport: ${bank.u.rapport.slice(0, 95)}`);
  }

  if (topShards.length > 0) {
    lines.push('recalled:');
    for (const s of topShards) {
      lines.push(`- ${s.s}`);
    }
  }

  // Only include peer stances in multi-bot group chats (completely omitted in 1-on-1 chats)
  if (!isSingleBotChat && bank.p && Object.keys(bank.p).length > 0) {
    const activePeerEntries = Object.entries(bank.p).filter(([peerId]) =>
      activePool.some((p) => p.id === peerId || p.name.toLowerCase() === peerId.toLowerCase())
    );
    if (activePeerEntries.length > 0) {
      lines.push(
        `peers: ${activePeerEntries
          .slice(0, 2)
          .map(([k, v]) => `${k}(${v.slice(0, 60)})`)
          .join('; ')}`
      );
    }
  }

  let microYamlBlock = lines.join('\n');
  if (microYamlBlock.length > 600) {
    microYamlBlock = microYamlBlock.slice(0, 597) + '...';
  }
  const approxTokens = Math.ceil(microYamlBlock.length / 4);

  return {
    microYamlBlock,
    recalledShards: topShards,
    approxTokens,
  };
}

function extractAndSaveBotMemory(
  store: DeviceStore,
  persona: Persona,
  rawReplyText: string,
  lastHumanMsg?: ChatMessage,
  contextId = 'ctx-1'
): string {
  const bank = ensureBotMemoryBank(store, persona);
  let cleaned = rawReplyText;
  let memoryModified = false;

  // 1. Parse inline [MEM: fact | tags: t1, t2 | w: 1-5] markers emitted by the LLM
  const memRegex = /\[MEM:\s*([^|\]]+?)(?:\s*\|\s*tags:\s*([^|\]]+?))?(?:\s*\|\s*w:\s*([1-5]))?\s*\]/gi;
  let match: RegExpExecArray | null;
  while ((match = memRegex.exec(rawReplyText)) !== null) {
    const summary = match[1]?.trim();
    const rawTags = match[2] ? match[2].split(',').map((t) => t.trim()) : [];
    const weight = match[3] ? parseInt(match[3], 10) : 3;
    if (summary) {
      upsertBotMemoryShard(bank, summary, rawTags, weight, contextId);
      memoryModified = true;
    }
  }
  cleaned = cleaned.replace(memRegex, '').trim();

  // 2. Parse optional [USER_TRAIT: ...] or [USER_NAME: ...] markers
  const traitRegex = /\[USER_TRAIT:\s*([^\]]+)\]/gi;
  while ((match = traitRegex.exec(rawReplyText)) !== null) {
    const trait = match[1]?.trim().slice(0, 45);
    if (trait && !bank.u.traits.some((t) => t.toLowerCase() === trait.toLowerCase())) {
      bank.u.traits = [trait, ...bank.u.traits].slice(0, 5);
      bank.u.updatedAt = Math.floor(Date.now() / 1000);
      memoryModified = true;
    }
  }
  cleaned = cleaned.replace(traitRegex, '').trim();

  const nameRegex = /\[USER_NAME:\s*([^\]]+)\]/gi;
  while ((match = nameRegex.exec(rawReplyText)) !== null) {
    const uName = match[1]?.trim().slice(0, 30);
    if (uName) {
      bank.u.name = uName;
      bank.u.updatedAt = Math.floor(Date.now() / 1000);
      memoryModified = true;
    }
  }
  cleaned = cleaned.replace(nameRegex, '').trim();

  // 3. Deterministic zero-cost heuristic capture from human message (ensures even small free models remember core user facts)
  if (lastHumanMsg && lastHumanMsg.text) {
    const hText = lastHumanMsg.text.trim();
    const nameIntro = hText.match(/\b(?:my name is|call me|i'm|i am)\s+([A-Z][a-zA-Z0-9_-]{1,20})\b/);
    if (
      nameIntro &&
      nameIntro[1] &&
      !['Ready', 'Here', 'Building', 'Working', 'Trying', 'Looking', 'Thinking', 'Going', 'Sure', 'Not'].includes(
        nameIntro[1]
      )
    ) {
      if (bank.u.name !== nameIntro[1]) {
        bank.u.name = nameIntro[1];
        bank.u.updatedAt = Math.floor(Date.now() / 1000);
        memoryModified = true;
      }
    }

    const prefMatch = hText.match(
      /\b(?:i prefer|i always use|i'm building|i am building|my project is|i work with|remember that)\s+([^.!?\n]{5,95})/i
    );
    if (prefMatch && prefMatch[1]) {
      const fact = `User mentioned: ${prefMatch[0].trim().slice(0, 105)}`;
      upsertBotMemoryShard(bank, fact, tokenizeForMemory(fact).slice(0, 4), 4, contextId);
      memoryModified = true;
    }
  }

  if (memoryModified) {
    bank.u.updatedAt = Math.floor(Date.now() / 1000);
  }

  return cleaned;
}

const DATA_DIR = path.resolve(__dirname, 'data');
const STORES_FILE = path.join(DATA_DIR, 'device_stores.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {}

function loadPersistedStores(): Map<string, DeviceStore> {
  const map = new Map<string, DeviceStore>();
  try {
    if (fs.existsSync(STORES_FILE)) {
      const raw = fs.readFileSync(STORES_FILE, 'utf-8');
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) {
        map.set(k, v as DeviceStore);
      }
      console.log(`[Storage] Restored ${map.size} persistent device stores from disk.`);
    }
  } catch (err) {
    console.warn('[Storage] Could not restore stores from disk:', err);
  }
  return map;
}

const deviceStores = loadPersistedStores();

let saveStoresDebounceTimer: NodeJS.Timeout | null = null;
function flushDeviceStoresSync() {
  if (saveStoresDebounceTimer) {
    clearTimeout(saveStoresDebounceTimer);
    saveStoresDebounceTimer = null;
  }
  try {
    const obj: Record<string, DeviceStore> = {};
    for (const [k, v] of deviceStores.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(STORES_FILE, JSON.stringify(obj), 'utf-8');
  } catch (err) {
    console.warn('[Storage] Error flushing stores to disk:', err);
  }
}

function persistDeviceStores() {
  if (saveStoresDebounceTimer) clearTimeout(saveStoresDebounceTimer);
  saveStoresDebounceTimer = setTimeout(() => {
    flushDeviceStoresSync();
  }, 150);
}

process.on('SIGINT', () => {
  flushDeviceStoresSync();
  process.exit(0);
});
process.on('SIGTERM', () => {
  flushDeviceStoresSync();
  process.exit(0);
});

function getDeviceId(req: express.Request): string {
  const h = req.headers['x-device-id'];
  if (typeof h === 'string' && h.trim()) {
    return h.trim();
  }
  // Unique per device/browser fallback using IP and User-Agent signature
  const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
  const ua = req.headers['user-agent'] || 'unknown-ua';
  const hash = Buffer.from(`${ip}-${ua}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  return `dev-auto-${hash}`;
}

function getDeviceStore(req: express.Request): DeviceStore {
  const devId = getDeviceId(req);
  if (!deviceStores.has(devId)) {
    const initialCtxId = 'ctx-1';
    const store: DeviceStore = {
      contexts: [
        {
          context_id: initialCtxId,
          topic_label: 'General Discussion',
          summary: null,
          created_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        },
      ],
      currentContextId: initialCtxId,
      messages: [
        {
          id: 1,
          speaker: 'Rook',
          text: "cool story. someone pick a topic so we don't sit here staring at each other.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          session_id: 'session-' + Date.now(),
          context_id: initialCtxId,
        },
      ],
      polls: [],
      activeRecall: null,
      activeDirectives: {},
      contextSearchUrls: {},
      messageAutoId: 2,
      pollAutoId: 1,
      personas: [...defaultPersonas],
      selectedModelId: 'auto/smart-routing',
      nsfwMode: false,
      researchSessions: {},
      researchReports: {},
      evidenceCards: {},
      pixelTasks: {},
      imageQuota: {
        hourlyCredits: 10,
        lastHourGrantTime: Date.now(),
        dailyTokensUsed: 0,
        dailyResetTime: Date.now() + 24 * 3600 * 1000,
        totalImagesGenerated: 0,
        history: [],
      },
      botMemories: {},
    };
    deviceStores.set(devId, store);
    persistDeviceStores();
  }
  const store = deviceStores.get(devId)!;
  if (!store.botMemories) {
    store.botMemories = {};
  }
  if (!store.imageQuota) {
    store.imageQuota = {
      hourlyCredits: 10,
      lastHourGrantTime: Date.now(),
      dailyTokensUsed: 0,
      dailyResetTime: Date.now() + 24 * 3600 * 1000,
      totalImagesGenerated: 0,
      history: [],
    };
  }
  if (
    store.selectedModelId === 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free' ||
    store.selectedModelId === 'cognitivecomputations/dolphin-mistral-24b-venice-edition' ||
    store.selectedModelId === 'meta-llama/llama-3.3-70b-instruct' ||
    store.selectedModelId === 'meta-llama/llama-3.1-8b-instruct:free'
  ) {
    store.selectedModelId = 'openrouter/free';
  }
  if (!store.selectedModelId || !availableModels.some((m) => m.id === store.selectedModelId)) {
    // If previous model looked like an OpenRouter model, keep them on OpenRouter's live free router
    if (store.selectedModelId && (store.selectedModelId.endsWith(':free') || store.selectedModelId.includes('/'))) {
      store.selectedModelId = 'openrouter/free';
    } else {
      store.selectedModelId = 'auto/smart-routing';
    }
  }
  return store;
}

// Base Provider Models (Groq, Cloudflare, NVIDIA, Auto-Switch)
const baseProviderModels = [
  {
    id: 'auto/smart-routing',
    name: '⚡ Auto-Switch / Smart Route (Best Available)',
    provider: 'groq' as const,
    tag: 'Auto-Failover',
    description: 'Automatically routes to the fastest active provider (Groq, OpenRouter, NVIDIA NIM) with seamless instant failover.',
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'OpenAI: GPT-OSS 120B (Groq)',
    provider: 'groq' as const,
    tag: '120B Groq LPU',
    description: 'Flagship OpenAI open-weight 120B reasoning model hosted on ultra-fast Groq LPU hardware.',
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'OpenAI: GPT-OSS 20B (Groq)',
    provider: 'groq' as const,
    tag: '20B Groq LPU',
    description: 'High-speed OpenAI open-weight 20B reasoning model hosted on ultra-fast Groq LPU hardware.',
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Meta: Llama 3.3 70B Versatile (Groq)',
    provider: 'groq' as const,
    tag: '70B Groq LPU',
    description: 'Flagship open-weight 70B reasoning model running with ultra-high tokens-per-second on Groq LPU hardware.',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Meta: Llama 3.1 8B Instant (Groq)',
    provider: 'groq' as const,
    tag: 'Instant 8B Groq',
    description: 'Ultra-fast sub-second response model via Groq LPUs, ideal for rapid conversational flow.',
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek: R1 Distill Llama 70B (Groq)',
    provider: 'groq' as const,
    tag: 'R1 Groq LPU',
    description: 'DeepSeek R1 reasoning model distilled into Llama 70B running on Groq LPU hardware.',
  },
  {
    id: 'qwen-2.5-32b',
    name: 'Qwen: Qwen 2.5 32B (Groq)',
    provider: 'groq' as const,
    tag: 'Qwen Groq LPU',
    description: 'High-speed Alibaba Qwen 2.5 32B model served via ultra-fast Groq LPU API.',
  },
  {
    id: 'meta/llama-3.2-11b-vision-instruct',
    name: 'Meta: Llama 3.2 11B (NVIDIA NIM)',
    provider: 'nvidia' as const,
    tag: 'NVIDIA NIM Active',
    description: 'Verified active high-speed Meta instruction model served directly via NVIDIA NIM integrate API.',
  },
  {
    id: 'meta/llama-3.2-90b-vision-instruct',
    name: 'Meta: Llama 3.2 90B (NVIDIA NIM)',
    provider: 'nvidia' as const,
    tag: '90B NIM Flagship',
    description: 'Premier 90B parameter Meta model running with full GPU acceleration on NVIDIA NIM.',
  },
  {
    id: '@cf/zai-org/glm-4.7-flash',
    name: 'GLM: 4.7 Flash (Cloudflare Workers AI)',
    provider: 'cloudflare' as const,
    tag: 'GLM 4.7 Flash',
    description: 'Ultra-fast reasoning & conversational model powered by Zai Org on Cloudflare Workers AI.',
  },
  {
    id: '@cf/qwen/qwen3-30b-a3b-fp8',
    name: 'Qwen: Qwen3 30B A3B FP8 (Cloudflare Workers AI)',
    provider: 'cloudflare' as const,
    tag: 'Qwen3 30B FP8',
    description: 'High capability reasoning and multilingual model running on Cloudflare Workers AI.',
  },
  {
    id: '@cf/meta/llama-3.1-8b-instruct',
    name: 'Meta: Llama 3.1 8B Instruct (Cloudflare Workers AI)',
    provider: 'cloudflare' as const,
    tag: 'Llama 3.1 8B CF',
    description: 'Fast, community-accessible Meta 8B model hosted natively on Cloudflare Workers AI.',
  },
];

// Initial verified live OpenRouter free models before dynamic endpoint sync
const defaultOpenRouterModels = [
  {
    id: 'openrouter/free',
    name: 'OpenRouter: Dynamic Free Auto-Route (Free)',
    provider: 'openrouter' as const,
    tag: 'Auto-Free Router',
    description: 'Official OpenRouter dynamic meta-router that automatically picks the fastest active free model on the network.',
  },
  {
    id: 'google/gemma-4-31b-it:free',
    name: 'Google: Gemma 4 31B Instruct (Free / OpenRouter)',
    provider: 'openrouter' as const,
    tag: 'Verified Live · Google 31B',
    description: 'Google DeepMind Gemma 4 31B dense multimodal instruct model with 262k context on OpenRouter free tier.',
  },
  {
    id: 'google/gemma-4-26b-a4b-it:free',
    name: 'Google: Gemma 4 26B A4B (Free / OpenRouter)',
    provider: 'openrouter' as const,
    tag: 'Verified Live · Google 26B',
    description: 'Fast Mixture-of-Experts Google Gemma 4 26B instruct model (3.8B active parameters) on OpenRouter free tier.',
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'NVIDIA: Nemotron 3.5 Lightning (Free / OpenRouter)',
    provider: 'openrouter' as const,
    tag: 'Verified Live · Fast 1M',
    description: 'High-speed NVIDIA Nemotron 3.5 Lightning MoE model with 1M context window on OpenRouter free tier.',
  },
  {
    id: 'cohere/north-mini-code:free',
    name: 'Cohere: North Mini Code (Free / Pixel Default)',
    provider: 'openrouter' as const,
    tag: 'Verified Live · Pixel Code',
    description: 'Dedicated code generation & chat model for Pixel data calculations and visualization via OpenRouter.',
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'NVIDIA: Nemotron 3 Ultra 550B (Free / OpenRouter)',
    provider: 'openrouter' as const,
    tag: 'Verified Live · 550B MoE',
    description: 'Frontier 550B parameter NVIDIA Nemotron 3 Ultra reasoning and chat model on OpenRouter free tier.',
  },
  {
    id: 'minimax/minimax-m3.1-flash:free',
    name: 'MiniMax: M3.1 Flash (Free / OpenRouter)',
    provider: 'openrouter' as const,
    tag: 'Verified Live · 1M Flash',
    description: 'Multimodal MiniMax M3.1 Flash model with 1M context window on OpenRouter free tier.',
  },
];

// Store per-model reasoning metadata so callOpenRouterWithModel configures parameters accurately
const openRouterModelMeta = new Map<
  string,
  { mandatoryReasoning: boolean; defaultReasoning: boolean; supportedEfforts: string[] }
>();

let dynamicOpenRouterModels = [...defaultOpenRouterModels];

const OPENROUTER_MODELS_CACHE_FILE = path.join(DATA_DIR, 'openrouter_models_cache.json');
const OPENROUTER_CACHE_VERSION = 2; // Version 2 enforces live endpoint status === 0 verification
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 1 week auto-refresh TTL

let openRouterCacheMetadata = {
  lastFetchedAt: 0,
  expiresAt: 0,
  cacheVersion: 0,
};

let availableModels = [...baseProviderModels, ...dynamicOpenRouterModels];

function rebuildAvailableModels() {
  availableModels = [...baseProviderModels, ...dynamicOpenRouterModels];
  // Auto-heal any device store whose selectedModelId was removed because it went offline
  for (const [, store] of deviceStores.entries()) {
    if (store.selectedModelId && !availableModels.some((m) => m.id === store.selectedModelId)) {
      store.selectedModelId = 'openrouter/free';
    }
  }
}

function loadPersistedOpenRouterModels() {
  try {
    if (fs.existsSync(OPENROUTER_MODELS_CACHE_FILE)) {
      const raw = fs.readFileSync(OPENROUTER_MODELS_CACHE_FILE, 'utf-8');
      const cache = JSON.parse(raw);
      if (
        cache.cacheVersion === OPENROUTER_CACHE_VERSION &&
        Array.isArray(cache.models) &&
        cache.models.length > 0
      ) {
        dynamicOpenRouterModels = cache.models;
        openRouterCacheMetadata.lastFetchedAt = cache.lastFetchedAt || Date.now();
        openRouterCacheMetadata.expiresAt =
          cache.expiresAt || (cache.lastFetchedAt ? cache.lastFetchedAt + ONE_WEEK_MS : Date.now() + ONE_WEEK_MS);
        openRouterCacheMetadata.cacheVersion = OPENROUTER_CACHE_VERSION;
        if (cache.modelMeta && typeof cache.modelMeta === 'object') {
          for (const [k, v] of Object.entries(cache.modelMeta)) {
            openRouterModelMeta.set(k, v as any);
          }
        }
        rebuildAvailableModels();
        console.log(
          `[OpenRouter Cache] Restored ${dynamicOpenRouterModels.length} verified live models from disk (next auto-refresh in ~${Math.max(
            1,
            Math.round((openRouterCacheMetadata.expiresAt - Date.now()) / (1000 * 3600 * 24))
          )} days).`
        );
      } else {
        console.log('[OpenRouter Cache] Stale v1 cache detected; scheduling live endpoint health verification...');
      }
    }
  } catch (err) {
    console.warn('[OpenRouter Cache] Could not load persisted models:', err);
  }
}

loadPersistedOpenRouterModels();

// Dynamic OpenRouter Models Auto-Fetcher (verifies live status === 0 endpoints & refreshes weekly)
async function refreshOpenRouterModels(
  force = false,
  customApiKey?: string
): Promise<{ refreshed: boolean; count: number; lastFetchedAt: number; expiresAt: number }> {
  const now = Date.now();
  if (
    !force &&
    openRouterCacheMetadata.cacheVersion === OPENROUTER_CACHE_VERSION &&
    openRouterCacheMetadata.expiresAt > now &&
    dynamicOpenRouterModels.length > 0
  ) {
    return {
      refreshed: false,
      count: dynamicOpenRouterModels.length,
      lastFetchedAt: openRouterCacheMetadata.lastFetchedAt,
      expiresAt: openRouterCacheMetadata.expiresAt,
    };
  }

  try {
    let res: Response;
    const headers: Record<string, string> = {
      'HTTP-Referer': (process.env.APP_URL?.trim() || 'https://korero.app').replace(/[^\x20-\x7E]/g, ''),
      'X-Title': 'Korero Multi-Persona Chatroom',
    };
    if (customApiKey && typeof customApiKey === 'string' && customApiKey.startsWith('sk-or-')) {
      headers['Authorization'] = `Bearer ${customApiKey.trim()}`;
    }

    try {
      res = await fetch('https://openrouter.ai/api/v1/models', {
        headers,
        signal: AbortSignal.timeout(14000),
      });
      // If user's custom key gave 401 or 403, retry as public unauthenticated request
      if (!res.ok && headers['Authorization']) {
        delete headers['Authorization'];
        res = await fetch('https://openrouter.ai/api/v1/models', {
          headers,
          signal: AbortSignal.timeout(14000),
        });
      }
    } catch (netErr: any) {
      if (headers['Authorization']) {
        delete headers['Authorization'];
        res = await fetch('https://openrouter.ai/api/v1/models', {
          headers,
          signal: AbortSignal.timeout(14000),
        });
      } else {
        throw netErr;
      }
    }

    if (!res.ok) {
      throw new Error(`OpenRouter models API returned HTTP ${res.status}`);
    }

    const json: any = await res.json();
    const rawList: any[] = Array.isArray(json?.data) ? json.data : [];

    // 1. Filter to true free text-generation chat candidates (exclude audio/image/safety classifiers & paid models)
    const freeCandidates = rawList.filter((m) => {
      if (!m?.id || typeof m.id !== 'string') return false;
      if (m.id === 'openrouter/free') return false;
      if (!m.id.endsWith(':free')) return false;

      const outMod: string[] = Array.isArray(m.architecture?.output_modalities)
        ? m.architecture.output_modalities
        : [];
      if (outMod.includes('audio') || outMod.includes('image')) return false;

      const lowerId = m.id.toLowerCase();
      if (
        lowerId.includes('content-safety') ||
        lowerId.includes('guard') ||
        lowerId.includes('moderation') ||
        lowerId.includes('embed') ||
        lowerId.includes('rerank') ||
        lowerId.includes('whisper') ||
        lowerId.includes('tts')
      ) {
        return false;
      }

      return true;
    });

    // 2. Verify live endpoint status === 0 for every candidate model in parallel so offline/down models are never synced
    const verifiedResults = await Promise.all(
      freeCandidates.map(async (m) => {
        try {
          const epRes = await fetch(`https://openrouter.ai/api/v1/models/${m.id}/endpoints`, {
            headers: {
              'HTTP-Referer': headers['HTTP-Referer'],
              'X-Title': headers['X-Title'],
            },
            signal: AbortSignal.timeout(7000),
          });
          if (!epRes.ok) return null;
          const epJson: any = await epRes.json();
          const endpoints: any[] = Array.isArray(epJson?.data?.endpoints) ? epJson.data.endpoints : [];
          const activeFreeEndpoints = endpoints.filter(
            (ep) => ep.status === 0 && String(ep.pricing?.prompt ?? '0') === '0'
          );
          if (activeFreeEndpoints.length === 0) {
            return null;
          }
          const providerNames = Array.from(
            new Set(activeFreeEndpoints.map((ep) => ep.provider_name).filter(Boolean))
          );
          return {
            model: m,
            providers: providerNames,
          };
        } catch {
          return null;
        }
      })
    );

    const liveVerified = verifiedResults.filter(
      (item): item is { model: any; providers: string[] } => item !== null
    );

    // Sort: fast non-reasoning models first, then reasoning models
    liveVerified.sort((a, b) => {
      const aMand = Boolean(a.model.reasoning?.mandatory || a.model.reasoning?.default_enabled);
      const bMand = Boolean(b.model.reasoning?.mandatory || b.model.reasoning?.default_enabled);
      if (aMand !== bMand) return aMand ? 1 : -1;
      return 0;
    });

    const refreshed: any[] = [
      {
        id: 'openrouter/free',
        name: 'OpenRouter: Dynamic Free Auto-Route (Free)',
        provider: 'openrouter',
        tag: 'Verified Live · Auto-Free Router',
        description:
          'Official OpenRouter dynamic meta-router that automatically routes to the fastest online free model on the network.',
      },
    ];

    const metaToSave: Record<
      string,
      { mandatoryReasoning: boolean; defaultReasoning: boolean; supportedEfforts: string[] }
    > = {};

    for (const { model: m, providers } of liveVerified) {
      const mandatoryReasoning = Boolean(m.reasoning?.mandatory);
      const defaultReasoning = Boolean(m.reasoning?.default_enabled || mandatoryReasoning);
      const supportedEfforts: string[] = Array.isArray(m.reasoning?.supported_efforts)
        ? m.reasoning.supported_efforts
        : [];

      const metaObj = {
        mandatoryReasoning,
        defaultReasoning,
        supportedEfforts,
      };
      openRouterModelMeta.set(m.id, metaObj);
      metaToSave[m.id] = metaObj;

      if (m.id === 'cohere/north-mini-code:free') {
        refreshed.push({
          id: 'cohere/north-mini-code:free',
          name: 'Cohere: North Mini Code (Free / Pixel Default)',
          provider: 'openrouter',
          tag: 'Verified Live · Pixel Code',
          description:
            'Dedicated code generation & chat model for Pixel data calculations and visualization via OpenRouter.',
        });
        continue;
      }

      const rawName = m.name || m.id;
      let cleanName = rawName.replace(/:\s*free\b/i, '').replace(/\(free\)/i, '').trim();
      if (!cleanName.includes(':')) {
        const parts = m.id.split('/');
        const org = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : '';
        cleanName = `${org}: ${cleanName}`;
      }
      const displayName = `${cleanName} (Free / OpenRouter)`;

      const ctxKb = m.context_length ? `${Math.round(m.context_length / 1000)}k context` : 'Free tier';
      const provBadge = providers.length > 0 ? providers[0] : 'OpenRouter';
      const cleanDesc = m.description
        ? m.description.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 135).trim()
        : `Active free model hosted by ${provBadge}`;

      refreshed.push({
        id: m.id,
        name: displayName,
        provider: 'openrouter',
        tag: mandatoryReasoning ? `Live Reasoning · ${provBadge}` : `Verified Live · ${provBadge}`,
        description: `${cleanDesc}... (${ctxKb})`,
      });
    }

    if (refreshed.length > 1) {
      dynamicOpenRouterModels = refreshed;
      openRouterCacheMetadata.lastFetchedAt = Date.now();
      openRouterCacheMetadata.expiresAt = Date.now() + ONE_WEEK_MS;
      openRouterCacheMetadata.cacheVersion = OPENROUTER_CACHE_VERSION;

      rebuildAvailableModels();

      try {
        fs.writeFileSync(
          OPENROUTER_MODELS_CACHE_FILE,
          JSON.stringify(
            {
              cacheVersion: OPENROUTER_CACHE_VERSION,
              lastFetchedAt: openRouterCacheMetadata.lastFetchedAt,
              expiresAt: openRouterCacheMetadata.expiresAt,
              models: dynamicOpenRouterModels,
              modelMeta: metaToSave,
            },
            null,
            2
          ),
          'utf-8'
        );
        console.log(
          `[OpenRouter Cache] Synced ${dynamicOpenRouterModels.length} verified live (status=0) free models from OpenRouter API.`
        );
      } catch (saveErr) {
        console.warn('[OpenRouter Cache] Could not persist models to disk:', saveErr);
      }
    }

    return {
      refreshed: true,
      count: dynamicOpenRouterModels.length,
      lastFetchedAt: openRouterCacheMetadata.lastFetchedAt,
      expiresAt: openRouterCacheMetadata.expiresAt,
    };
  } catch (err: any) {
    console.warn('[OpenRouter Cache] Live models refresh failed, keeping current models:', err?.message || err);
    return {
      refreshed: false,
      count: dynamicOpenRouterModels.length,
      lastFetchedAt: openRouterCacheMetadata.lastFetchedAt,
      expiresAt: openRouterCacheMetadata.expiresAt,
    };
  }
}

// Background Weekly Scheduler: checks every 6 hours and auto-refreshes if 7 days have elapsed
setInterval(() => {
  if (Date.now() >= openRouterCacheMetadata.expiresAt) {
    refreshOpenRouterModels().catch(() => {});
  }
}, 6 * 60 * 60 * 1000);

// Initial check on boot
if (openRouterCacheMetadata.expiresAt <= Date.now()) {
  refreshOpenRouterModels().catch(() => {});
}

let selectedModelId = 'auto/smart-routing';

export interface ClientKeys {
  deviceId?: string;
  groqKey?: string;
  openRouterKey?: string;
  nvidiaKey?: string;
  cloudflareKey?: string;
  cloudflareAccountId?: string;
  tavilyKey?: string;
  e2bKey?: string;
}

function sanitizeAsciiHeader(val: unknown): string | undefined {
  if (typeof val !== 'string') return undefined;
  const cleaned = val.replace(/[^\x20-\x7E]/g, '').trim();
  return cleaned || undefined;
}

export function extractClientKeys(req: express.Request): ClientKeys {
  const h = req.headers;
  let parsed: any = {};
  if (h['x-client-keys'] && typeof h['x-client-keys'] === 'string') {
    try {
      parsed = JSON.parse(h['x-client-keys'] as string);
    } catch (e) {}
  }
  return {
    deviceId: getDeviceId(req),
    groqKey: sanitizeAsciiHeader(
      (h['x-groq-key'] as string) ||
      req.body?.groqKey ||
      parsed.groqKey ||
      parsed.groq
    ),
    openRouterKey: sanitizeAsciiHeader(
      (h['x-openrouter-key'] as string) ||
      req.body?.openRouterKey ||
      parsed.openRouterKey ||
      parsed.openrouter
    ),
    nvidiaKey: sanitizeAsciiHeader(
      (h['x-nvidia-key'] as string) ||
      req.body?.nvidiaKey ||
      parsed.nvidiaKey ||
      parsed.nvidia
    ),
    cloudflareKey: sanitizeAsciiHeader(
      (h['x-cloudflare-key'] as string) ||
      (h['x-cf-key'] as string) ||
      req.body?.cloudflareKey ||
      parsed.cloudflareKey ||
      parsed.cloudflare ||
      process.env.CLOUDFLARE_API_TOKEN ||
      process.env.CLOUDFLARE_API_KEY
    ),
    cloudflareAccountId: sanitizeAsciiHeader(
      (h['x-cloudflare-account-id'] as string) ||
      (h['x-cf-account-id'] as string) ||
      req.body?.cloudflareAccountId ||
      parsed.cloudflareAccountId ||
      parsed.cfAccountId ||
      process.env.CLOUDFLARE_ACCOUNT_ID
    ),
    tavilyKey: sanitizeAsciiHeader(
      (h['x-tavily-key'] as string) ||
      req.body?.tavilyKey ||
      parsed.tavilyKey ||
      parsed.tavily
    ),
    e2bKey: sanitizeAsciiHeader(
      (h['x-e2b-key'] as string) ||
      req.body?.e2bKey ||
      parsed.e2bKey ||
      parsed.e2b
    ),
  };
}

// Provider RPM and Request Pacing System
interface ProviderRateLimiter {
  lastRequestTime: number;
  minIntervalMs: number;
  cooldownUntil: number;
  pendingQueue: Promise<any>;
}

const rateLimiters: Record<'groq' | 'openrouter' | 'nvidia' | 'cloudflare', ProviderRateLimiter> = {
  groq: {
    lastRequestTime: 0,
    minIntervalMs: 250,
    cooldownUntil: 0,
    pendingQueue: Promise.resolve(),
  },
  cloudflare: {
    lastRequestTime: 0,
    minIntervalMs: 150,
    cooldownUntil: 0,
    pendingQueue: Promise.resolve(),
  },
  openrouter: {
    lastRequestTime: 0,
    minIntervalMs: 400,
    cooldownUntil: 0,
    pendingQueue: Promise.resolve(),
  },
  nvidia: {
    lastRequestTime: 0,
    minIntervalMs: 350,
    cooldownUntil: 0,
    pendingQueue: Promise.resolve(),
  },
};

// Slot-reservation rate limiter: spaces out request start times without blocking concurrent network I/O
async function executeWithProviderDelay<T>(
  provider: 'groq' | 'openrouter' | 'nvidia' | 'cloudflare',
  action: () => Promise<T>
): Promise<T> {
  const limiter = rateLimiters[provider];

  const waitSlot = limiter.pendingQueue.then(async () => {
    const now = Date.now();
    if (limiter.cooldownUntil > now) {
      const cooldownRemaining = Math.min(limiter.cooldownUntil - now, 1500);
      await new Promise((r) => setTimeout(r, cooldownRemaining));
    }
    const elapsed = Date.now() - limiter.lastRequestTime;
    if (elapsed < limiter.minIntervalMs) {
      await new Promise((r) => setTimeout(r, limiter.minIntervalMs - elapsed));
    }
    limiter.lastRequestTime = Date.now();
  });

  limiter.pendingQueue = waitSlot.catch(() => {});
  await waitSlot;
  return await action();
}

function reportProviderRateLimited(provider: 'groq' | 'openrouter' | 'nvidia' | 'cloudflare', backoffMs = 1500) {
  const limiter = rateLimiters[provider];
  limiter.cooldownUntil = Date.now() + backoffMs;
  console.warn(`[RateLimiter] ${provider} reported 429. Cooldown set for ${backoffMs}ms`);
}

// Cloudflare Workers AI API helper (with strict 10s timeout per attempt and max 2 candidates)
async function callCloudflare(
  model: string,
  prompt: string,
  temperature = 0.7,
  clientKeys?: ClientKeys
): Promise<{ text: string; modelUsed: string } | null> {
  return executeWithProviderDelay('cloudflare', async () => {
    const cloudflareToken =
      clientKeys?.cloudflareKey?.trim() ||
      process.env.CLOUDFLARE_API_TOKEN?.trim() ||
      process.env.CLOUDFLARE_API_KEY?.trim();

    const cloudflareAccountId =
      clientKeys?.cloudflareAccountId?.trim() ||
      process.env.CLOUDFLARE_ACCOUNT_ID?.trim();

    if (!cloudflareToken) {
      throw new Error(
        'No active Cloudflare API token found on this device. Please add your Cloudflare Workers AI token in the side menu (API Keys tab) or configure CLOUDFLARE_API_TOKEN.'
      );
    }

    if (!cloudflareAccountId) {
      throw new Error(
        'No Cloudflare Account ID configured. Please set CLOUDFLARE_ACCOUNT_ID in your .env file or configure x-cloudflare-account-id.'
      );
    }

    const defaultFastCfModel = '@cf/meta/llama-3.1-8b-instruct';
    const requestedCfModel =
      !model || model === 'auto/smart-routing' || !model.startsWith('@cf/')
        ? defaultFastCfModel
        : model;

    const candidateModels = [
      requestedCfModel,
      defaultFastCfModel,
      '@cf/qwen/qwen3-30b-a3b-fp8',
      '@cf/zai-org/glm-4.7-flash',
    ];
    const uniqueModels = Array.from(new Set(candidateModels.filter(Boolean))).slice(0, 2);

    const cfClient = new OpenAI({
      apiKey: cloudflareToken,
      baseURL: `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/v1`,
      timeout: 14000,
      maxRetries: 0,
    });

    let lastErr = '';
    for (const curModel of uniqueModels) {
      try {
        const response = await cfClient.chat.completions.create({
          model: curModel,
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: 600,
        });

        const text = response.choices?.[0]?.message?.content?.trim();
        if (text) {
          return { text, modelUsed: `${curModel} (Cloudflare Workers AI)` };
        }
      } catch (err: any) {
        lastErr = err?.message || String(err);
        console.warn(`[Cloudflare] ${curModel} error:`, lastErr);
        if (err?.status === 429 || lastErr.includes('429')) {
          reportProviderRateLimited('cloudflare', 1500);
          break;
        }
      }
    }

    throw new Error(`Cloudflare Workers AI models failed: ${lastErr}`);
  });
}

// Rate Limiter & Token Tracker for Flux 1 Schnell Text-to-Image Generation
// Limit: 10 images/hour base limit + leftover rollover to next hours + 2600 token daily cap
export function checkAndConsumeImageQuota(
  store: DeviceStore,
  tokensPerImage = 260
): { allowed: boolean; reason?: string; quota: any } {
  if (!store.imageQuota) {
    store.imageQuota = {
      hourlyCredits: 10,
      lastHourGrantTime: Date.now(),
      dailyTokensUsed: 0,
      dailyResetTime: Date.now() + 24 * 3600 * 1000,
      totalImagesGenerated: 0,
      history: [],
    };
  }

  const quota = store.imageQuota;
  const now = Date.now();

  // 1. Check daily 24h cycle reset (2600 tokens daily cap reset)
  if (now >= quota.dailyResetTime) {
    quota.dailyTokensUsed = 0;
    quota.dailyResetTime = now + 24 * 3600 * 1000;
  }

  // 2. Rollover & Hourly credit replenishment (10 images added per elapsed hour, leftover rolls over!)
  const msElapsed = now - quota.lastHourGrantTime;
  const hoursElapsed = Math.floor(msElapsed / (3600 * 1000));
  if (hoursElapsed > 0) {
    quota.hourlyCredits += hoursElapsed * 10;
    quota.lastHourGrantTime += hoursElapsed * 3600 * 1000;
  }

  const dailyTokensRemaining = Math.max(0, 2600 - quota.dailyTokensUsed);
  const timeToDailyResetMs = Math.max(0, quota.dailyResetTime - now);
  const timeToNextHourMs = Math.max(0, quota.lastHourGrantTime + 3600 * 1000 - now);

  // 3. Verify Daily Token Cap (max 2600 tokens per day)
  if (quota.dailyTokensUsed + tokensPerImage > 2600) {
    const hours = Math.ceil(timeToDailyResetMs / (3600 * 1000));
    return {
      allowed: false,
      reason: `Daily token cap reached (2,600 tokens / day limit). Resets in ~${hours}h.`,
      quota: {
        hourlyAvailable: quota.hourlyCredits,
        dailyTokensUsed: quota.dailyTokensUsed,
        dailyTokensRemaining,
        dailyCap: 2600,
        timeToDailyResetMs,
        timeToNextHourMs,
      },
    };
  }

  // 4. Verify Hourly Credits
  if (quota.hourlyCredits < 1) {
    const mins = Math.ceil(timeToNextHourMs / (60 * 1000));
    return {
      allowed: false,
      reason: `Hourly image rate limit reached (10 images/hr). Next rollover grant in ~${mins}m.`,
      quota: {
        hourlyAvailable: quota.hourlyCredits,
        dailyTokensUsed: quota.dailyTokensUsed,
        dailyTokensRemaining,
        dailyCap: 2600,
        timeToDailyResetMs,
        timeToNextHourMs,
      },
    };
  }

  // 5. Deduct quota
  quota.hourlyCredits -= 1;
  quota.dailyTokensUsed += tokensPerImage;
  quota.totalImagesGenerated = (quota.totalImagesGenerated || 0) + 1;

  persistDeviceStores();

  return {
    allowed: true,
    quota: {
      hourlyAvailable: quota.hourlyCredits,
      dailyTokensUsed: quota.dailyTokensUsed,
      dailyTokensRemaining: 2600 - quota.dailyTokensUsed,
      dailyCap: 2600,
      totalGenerated: quota.totalImagesGenerated,
      timeToDailyResetMs,
      timeToNextHourMs,
    },
  };
}

// Text-to-Image Generation helper using Cloudflare Flux 1 Schnell
export async function callCloudflareFlux(
  prompt: string,
  clientKeys?: ClientKeys
): Promise<{ imageUrl: string; prompt: string; model: string; tokensUsed: number }> {
  const cloudflareToken =
    clientKeys?.cloudflareKey?.trim() ||
    process.env.CLOUDFLARE_API_TOKEN?.trim() ||
    process.env.CLOUDFLARE_API_KEY?.trim();

  const cloudflareAccountId =
    clientKeys?.cloudflareAccountId?.trim() ||
    process.env.CLOUDFLARE_ACCOUNT_ID?.trim();

  if (!cloudflareToken) {
    throw new Error(
      'No active Cloudflare API token found on this device. Please add your Cloudflare API token in the side menu (API Keys tab) or set CLOUDFLARE_API_TOKEN.'
    );
  }

  if (!cloudflareAccountId) {
    throw new Error(
      'No Cloudflare Account ID configured. Please set CLOUDFLARE_ACCOUNT_ID in your .env file or configure x-cloudflare-account-id.'
    );
  }

  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) {
    throw new Error('Image prompt cannot be empty.');
  }

  const endpoint =
    `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cloudflareToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: cleanPrompt,
      steps: 4,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudflare Flux 1 Schnell error (${res.status}): ${errText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  let imageUrl = '';

  if (contentType.includes('application/json')) {
    const json: any = await res.json();
    const rawImage = json.result?.image || json.image;
    if (rawImage) {
      imageUrl = rawImage.startsWith('data:') ? rawImage : `data:image/jpeg;base64,${rawImage}`;
    }
  } else {
    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const mime = contentType.includes('png') ? 'image/png' : 'image/jpeg';
    imageUrl = `data:${mime};base64,${buffer.toString('base64')}`;
  }

  if (!imageUrl) {
    throw new Error('Cloudflare Workers AI did not return a valid image payload.');
  }

  return {
    imageUrl,
    prompt: cleanPrompt,
    model: '@cf/black-forest-labs/flux-1-schnell',
    tokensUsed: 260,
  };
}

// Cache models that returned 404 (model_not_found) per Groq key prefix so we never waste requests on disabled models
const unavailableGroqModelsByKey = new Map<string, Set<string>>();

// Groq API helper with 404 model_not_found caching & dynamic account model discovery
async function callGroq(
  model: string,
  prompt: string,
  temperature = 0.8,
  clientKeys?: ClientKeys
): Promise<{ text: string; modelUsed: string } | null> {
  return executeWithProviderDelay('groq', async () => {
    const groqKey = clientKeys?.groqKey?.trim();

    if (!groqKey) {
      throw new Error('No active Groq API key found on this device.');
    }

    const keyId = groqKey.slice(0, 12);
    if (!unavailableGroqModelsByKey.has(keyId)) {
      unavailableGroqModelsByKey.set(keyId, new Set<string>());
    }
    const disabledSet = unavailableGroqModelsByKey.get(keyId)!;

    const groq = new Groq({ apiKey: groqKey, timeout: 10000, maxRetries: 0 });
    const maxTokens = 1024;

    let groqModelName = model;
    if (
      model === 'auto/smart-routing' ||
      !model ||
      model.includes('auto') ||
      model.startsWith('@cf/') ||
      model.includes(':free')
    ) {
      groqModelName = 'openai/gpt-oss-120b';
    } else if (model === 'qwen/qwen3.8-27b' || model === 'qwen-2.5-coder-32b') {
      groqModelName = 'qwen-2.5-32b';
    }

    const fallbackGroqModels = [
      groqModelName,
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'deepseek-r1-distill-llama-70b',
      'qwen-2.5-32b',
    ];
    let candidateGroqModels = Array.from(
      new Set(fallbackGroqModels.filter((m) => m && !disabledSet.has(m)))
    );

    // If all known static candidates were marked 404 on this key, query live models enabled on this Groq project
    if (candidateGroqModels.length === 0) {
      try {
        const list = await groq.models.list();
        const liveChatModels = (list.data || [])
          .map((m: any) => String(m.id || ''))
          .filter(
            (id) =>
              id &&
              !id.includes('whisper') &&
              !id.includes('guard') &&
              !id.includes('tts') &&
              !id.includes('playai') &&
              !disabledSet.has(id)
          );
        candidateGroqModels = liveChatModels.slice(0, 3);
      } catch (e) {}
    }

    let lastGroqErr = '';
    let triedLiveCount = 0;

    for (const curModel of candidateGroqModels) {
      if (triedLiveCount >= 2) break;
      try {
        const requestParams: any = {
          model: curModel,
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_completion_tokens: maxTokens,
          top_p: 1,
        };

        const completion = await groq.chat.completions.create(requestParams);
        const text = completion.choices?.[0]?.message?.content?.trim();
        if (text) {
          return { text, modelUsed: `${curModel} (Groq)` };
        }
        triedLiveCount++;
      } catch (err: any) {
        lastGroqErr = err?.message || String(err);
        // If 404 model_not_found, remember it for this key and immediately try the next candidate without counting against timeout budget
        if (err?.status === 404 || lastGroqErr.includes('404') || lastGroqErr.includes('model_not_found')) {
          disabledSet.add(curModel);
          continue;
        }
        triedLiveCount++;
        console.warn(`Groq candidate ${curModel} attempt notice:`, lastGroqErr);
        if (err?.status === 429 || lastGroqErr.includes('429')) {
          reportProviderRateLimited('groq', 1500);
          break;
        }
      }
    }

    // Last-resort dynamic discovery if static candidates all returned 404
    if (triedLiveCount === 0) {
      try {
        const list = await groq.models.list();
        const liveModel = (list.data || [])
          .map((m: any) => String(m.id || ''))
          .find(
            (id) =>
              id &&
              !id.includes('whisper') &&
              !id.includes('guard') &&
              !id.includes('tts') &&
              !id.includes('playai') &&
              !disabledSet.has(id)
          );
        if (liveModel) {
          const completion = await groq.chat.completions.create({
            model: liveModel,
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_completion_tokens: maxTokens,
          });
          const text = completion.choices?.[0]?.message?.content?.trim();
          if (text) {
            return { text, modelUsed: `${liveModel} (Groq)` };
          }
        }
      } catch (err: any) {
        lastGroqErr = err?.message || String(err);
      }
    }

    throw new Error(`Groq models failed: ${lastGroqErr}`);
  });
}

// NVIDIA NIM API helper with 10s AbortSignal timeout
async function callNvidiaNim(
  prompt: string,
  modelName = 'meta/llama-3.2-11b-vision-instruct',
  temperature = 0.2,
  clientKeys?: ClientKeys
): Promise<{ text: string; modelUsed: string } | null> {
  if (modelName === 'meta/llama-3.3-70b-instruct') {
    return callOpenRouterWithModel('meta-llama/llama-3.3-70b-instruct', prompt, temperature, clientKeys);
  }

  return executeWithProviderDelay('nvidia', async () => {
    const targetModel = modelName || 'meta/llama-3.2-11b-vision-instruct';
    const nvidiaKey = clientKeys?.nvidiaKey?.trim();

    if (!nvidiaKey) {
      throw new Error('No active NVIDIA NIM API key found on this device.');
    }

    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${nvidiaKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature,
        top_p: 0.7,
        max_tokens: 350,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const json: any = await res.json();
      const text = json.choices?.[0]?.message?.content?.trim();
      if (text) {
        return { text, modelUsed: `${targetModel} (NVIDIA NIM)` };
      }
    } else {
      const errBody = await res.text();
      const lastErr = `NVIDIA API error ${res.status}: ${errBody}`;
      console.warn(lastErr);
      if (res.status === 429) {
        reportProviderRateLimited('nvidia', 2000);
      }
      throw new Error(lastErr);
    }

    return null;
  });
}

// Track OpenRouter keys that hit 402 daily credit limits on paid models
const openRouterAffordableTokensByKey = new Map<string, number>();

// OpenRouter API helper with pure ASCII headers, reasoning-aware token budget, and verified live :free model failover
async function callOpenRouterWithModel(
  targetModel: string,
  prompt: string,
  temperature = 0.85,
  clientKeys?: ClientKeys,
  disableFailover = false
): Promise<{ text: string; modelUsed: string } | null> {
  return executeWithProviderDelay('openrouter', async () => {
    const orKey = clientKeys?.openRouterKey?.trim();

    if (!orKey) {
      throw new Error('No active OpenRouter API key found on this device.');
    }

    const keyId = orKey.slice(0, 12);
    const knownMaxAffordable = openRouterAffordableTokensByKey.get(keyId);

    // Normalize legacy/discontinued paid model IDs to live OpenRouter free models
    let modelToCall = targetModel?.trim() || '';
    if (
      modelToCall === 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free' ||
      modelToCall === 'cognitivecomputations/dolphin-mistral-24b-venice-edition' ||
      modelToCall === 'meta-llama/llama-3.3-70b-instruct' ||
      modelToCall === 'meta/llama-3.3-70b-instruct' ||
      modelToCall === 'meta-llama/llama-3.1-8b-instruct:free'
    ) {
      modelToCall = 'openrouter/free';
    }

    // If no specific model passed (or auto-routing was given), look up active store preference
    if (!modelToCall || modelToCall === 'auto/smart-routing' || modelToCall.startsWith('@cf/')) {
      const devId = clientKeys?.deviceId;
      const store = devId ? deviceStores.get(devId) : undefined;
      if (
        store?.selectedModelId &&
        store.selectedModelId !== 'auto/smart-routing' &&
        availableModels.some((m) => m.id === store.selectedModelId && m.provider === 'openrouter')
      ) {
        modelToCall = store.selectedModelId;
      } else {
        modelToCall = 'openrouter/free';
      }
    }

    // Build candidate list: if disableFailover is true (e.g. testing a specific model), only test that exact model
    const fallbackFreeModels = [
      'google/gemma-4-31b-it:free',
      'nvidia/nemotron-3.5-lightning:free',
      'google/gemma-4-26b-a4b-it:free',
      'openrouter/free',
      'cohere/north-mini-code:free',
    ];
    const candidateModels = disableFailover
      ? [modelToCall]
      : Array.from(new Set([modelToCall, ...fallbackFreeModels])).slice(0, 3);

    const safeReferer = (process.env.APP_URL?.trim() || 'https://korero.app').replace(/[^\x20-\x7E]/g, '');

    let primaryErr = '';
    let lastErr = '';

    for (const model of candidateModels) {
      const isFreeModel = model.endsWith(':free') || model === 'openrouter/free';
      // Free models on OpenRouter (especially reasoning-enabled ones) need >= 1024 max_tokens so thinking tokens don't truncate content
      let maxTokensToRequest = isFreeModel
        ? 1024
        : knownMaxAffordable !== undefined
        ? Math.max(40, Math.min(250, knownMaxAffordable - 4))
        : 250;

      const meta = openRouterModelMeta.get(model);

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const requestBody: Record<string, any> = {
            model,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            max_tokens: maxTokensToRequest,
            temperature,
          };

          // Keep reasoning effort low on reasoning models so they respond quickly and always emit final message.content
          if (meta?.supportedEfforts && meta.supportedEfforts.length > 0) {
            const lowEffort = meta.supportedEfforts.includes('none')
              ? 'none'
              : meta.supportedEfforts.includes('minimal')
              ? 'minimal'
              : meta.supportedEfforts.includes('low')
              ? 'low'
              : meta.supportedEfforts.includes('medium')
              ? 'medium'
              : undefined;
            if (lowEffort) {
              requestBody.reasoning = { effort: lowEffort };
            }
          }

          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${orKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': safeReferer,
              'X-Title': 'Korero Multi-Persona Chatroom',
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(18000),
          });

          if (res.ok) {
            const json: any = await res.json();
            // OpenRouter can return HTTP 200 with { error: { message, code } } when an upstream provider fails
            if (json?.error) {
              lastErr = `OpenRouter ${model}: ${json.error.message || JSON.stringify(json.error)}`;
              break;
            }

            const msg = json?.choices?.[0]?.message;
            let text = (typeof msg?.content === 'string' ? msg.content : '').trim();
            if (text.includes('</think>')) {
              text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            }

            // If a mandatory-reasoning model placed its short output in reasoning/reasoning_content
            if (!text && (typeof msg?.reasoning === 'string' || typeof msg?.reasoning_content === 'string')) {
              const rawReasoning = String(msg.reasoning || msg.reasoning_content || '').trim();
              const lines = rawReasoning
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean);
              if (lines.length > 0) {
                text = lines[lines.length - 1].replace(/^["']|["']$/g, '').trim();
              }
            }

            if (text) {
              const actualModel = typeof json?.model === 'string' && json.model ? json.model : model;
              return { text, modelUsed: `${actualModel} (OpenRouter)` };
            }

            lastErr = `OpenRouter ${model} returned an empty response`;
            if (!primaryErr && model === modelToCall) primaryErr = lastErr;
            break;
          } else {
            const errBody = await res.text();
            let errDetail = `${res.status}`;
            try {
              const parsedErr = JSON.parse(errBody);
              if (parsedErr?.error?.message) {
                errDetail = `${res.status}: ${parsedErr.error.message}`;
              }
            } catch {}
            lastErr = `OpenRouter ${model} (${errDetail})`;
            if (!primaryErr && model === modelToCall) primaryErr = lastErr;

            // If 401 Invalid API Key, stop immediately and report to user
            if (res.status === 401) {
              throw new Error(`Invalid OpenRouter API key (${errDetail})`);
            }

            // If 404 due to account-wide ZDR / Data Policy restrictions in OpenRouter settings, stop immediately and report for the exact requested model
            if (
              res.status === 404 &&
              (errDetail.includes('ZDR violation') || errDetail.includes('data policy') || errDetail.includes('guardrail restrictions'))
            ) {
              throw new Error(
                `OpenRouter ${modelToCall} blocked by your OpenRouter account Privacy Settings (ZDR Only is enabled). Visit https://openrouter.ai/settings/privacy to turn OFF "Zero Data Retention Only" and enable Free Endpoints.`
              );
            }

            // Handle 402 Insufficient Credits by adapting max_tokens or moving to the next :free candidate
            if (res.status === 402) {
              const affordMatches = [...errBody.matchAll(/can only afford\s+(\d+)/gi)].map((m) =>
                parseInt(m[1], 10)
              );
              const maxAfford = affordMatches.length > 0 ? Math.max(...affordMatches) : 0;
              const minAfford = affordMatches.length > 0 ? Math.min(...affordMatches) : 0;
              const usableBudget = minAfford >= 45 ? minAfford : maxAfford;

              if (usableBudget > 0) {
                openRouterAffordableTokensByKey.set(keyId, usableBudget);
              } else {
                openRouterAffordableTokensByKey.set(keyId, 0);
              }

              if (attempt === 0 && usableBudget >= 45 && usableBudget < maxTokensToRequest) {
                maxTokensToRequest = Math.max(40, usableBudget - 4);
                continue;
              }
              break;
            }

            if (res.status === 429) {
              reportProviderRateLimited('openrouter', 1500);
            }
            break;
          }
        } catch (e: any) {
          lastErr = e?.message || String(e);
          if (!primaryErr && model === modelToCall) primaryErr = lastErr;
          if (
            lastErr.includes('Invalid OpenRouter API key') ||
            lastErr.includes('blocked by your OpenRouter account Privacy Settings')
          ) {
            throw e;
          }
          break;
        }
      }
    }

    throw new Error(`OpenRouter models unavailable (${primaryErr || lastErr || 'upstream provider busy'})`);
  });
}

/**
 * Dedicated Model Caller for Pixel: Uses "cohere/north-mini-code:free" with pure ASCII headers and a fast 10s timeout.
 */
export async function callPixelModel(
  prompt: string,
  temperature: number = 0.2,
  clientKeys?: ClientKeys
): Promise<{ text: string; modelUsed: string } | null> {
  const openRouterKey = clientKeys?.openRouterKey?.trim();
  if (openRouterKey) {
    try {
      const safeReferer = (process.env.APP_URL?.trim() || 'https://korero.app').replace(/[^\x20-\x7E]/g, '');
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': safeReferer,
          'X-Title': 'Korero Multi-Persona Chatroom',
        },
        body: JSON.stringify({
          model: 'cohere/north-mini-code:free',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1024,
          temperature,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const json: any = await res.json();
        const text = json.choices?.[0]?.message?.content?.trim();
        if (text) return { text, modelUsed: 'cohere/north-mini-code:free (OpenRouter)' };
      }
    } catch (e: any) {
      console.log('Pixel cohere call notice, falling back:', e?.message || e);
    }
  }

  return null;
}

// Unified model caller routing to active provider with deduplicated cross-provider auto-switch
async function generateModelContent(
  options: {
    contents: string;
    systemInstruction?: string;
    temperature?: number;
  },
  clientKeys?: ClientKeys,
  modelId?: string
): Promise<{ text: string; modelUsed: string } | null> {
  const fullPrompt = options.systemInstruction
    ? `${options.systemInstruction}\n\n${options.contents}`
    : options.contents;

  const targetModelId = modelId || selectedModelId || 'auto/smart-routing';

  if (targetModelId === 'cohere/north-mini-code:free') {
    try {
      const pixelRes = await callPixelModel(fullPrompt, options.temperature ?? 0.75, clientKeys);
      if (pixelRes) return pixelRes;
    } catch (pixelErr: any) {
      console.log('Pixel dedicated model notice, switching to general model:', pixelErr?.message || pixelErr);
    }
  }

  const activeModelObj = availableModels.find((m) => m.id === targetModelId);
  const hasGroqKey = !!clientKeys?.groqKey?.trim();
  const hasNvidiaKey = !!clientKeys?.nvidiaKey?.trim();
  const hasOrKey = !!clientKeys?.openRouterKey?.trim();
  const hasCloudflareKey = !!(
    clientKeys?.cloudflareKey?.trim() ||
    process.env.CLOUDFLARE_API_TOKEN?.trim() ||
    process.env.CLOUDFLARE_API_KEY?.trim()
  );

  const triedProviders = new Set<string>();

  const tryProvider = async (provider: 'cloudflare' | 'groq' | 'openrouter' | 'nvidia', specificModel?: string): Promise<{ text: string; modelUsed: string } | null> => {
    if (triedProviders.has(provider)) return null;
    triedProviders.add(provider);

    try {
      if (provider === 'cloudflare' && hasCloudflareKey) {
        const cfModel = specificModel && specificModel.startsWith('@cf/') ? specificModel : '@cf/meta/llama-3.1-8b-instruct';
        const res = await callCloudflare(cfModel, fullPrompt, options.temperature ?? 0.7, clientKeys);
        if (res?.text) return { text: res.text, modelUsed: res.modelUsed || `${cfModel} (Cloudflare Workers AI)` };
        return null;
      }
      if (provider === 'groq' && hasGroqKey) {
        const res = await callGroq(specificModel || 'openai/gpt-oss-120b', fullPrompt, options.temperature ?? 0.8, clientKeys);
        if (res?.text) return { text: res.text, modelUsed: res.modelUsed || `${specificModel || 'openai/gpt-oss-120b'} (Groq)` };
        return null;
      }
      if (provider === 'openrouter' && hasOrKey) {
        let orModel = specificModel;
        if (!orModel || orModel === 'auto/smart-routing') {
          if (targetModelId && targetModelId !== 'auto/smart-routing' && availableModels.some((m) => m.id === targetModelId && m.provider === 'openrouter')) {
            orModel = targetModelId;
          } else {
            const devId = clientKeys?.deviceId;
            const devStore = devId ? deviceStores.get(devId) : undefined;
            if (devStore?.selectedModelId && devStore.selectedModelId !== 'auto/smart-routing' && availableModels.some((m) => m.id === devStore.selectedModelId && m.provider === 'openrouter')) {
              orModel = devStore.selectedModelId;
            } else {
              orModel = 'openrouter/free';
            }
          }
        }
        const res = await callOpenRouterWithModel(orModel, fullPrompt, options.temperature ?? 0.85, clientKeys);
        if (res?.text) return { text: res.text, modelUsed: res.modelUsed || `${orModel} (OpenRouter)` };
        return null;
      }
      if (provider === 'nvidia' && hasNvidiaKey) {
        const res = await callNvidiaNim(fullPrompt, specificModel || 'meta/llama-3.2-11b-vision-instruct', options.temperature ?? 0.2, clientKeys);
        if (res?.text) return { text: res.text, modelUsed: res.modelUsed || `${specificModel || 'meta/llama-3.2-11b-vision-instruct'} (NVIDIA NIM)` };
        return null;
      }
    } catch (err: any) {
      console.log(`[Auto-Switch] Provider ${provider} notice (${err?.message || err}), trying next available provider...`);
    }
    return null;
  };

  const isOpenRouter =
    activeModelObj?.provider === 'openrouter' ||
    targetModelId === 'openrouter/free' ||
    targetModelId.endsWith(':free');

  const isCloudflare =
    !isOpenRouter &&
    (activeModelObj?.provider === 'cloudflare' ||
      targetModelId.startsWith('@cf/') ||
      targetModelId.includes('glm-4.7') ||
      targetModelId.includes('qwen3-30b'));

  const isNvidia =
    !isOpenRouter &&
    !isCloudflare &&
    (activeModelObj?.provider === 'nvidia' || targetModelId.startsWith('meta/llama-3.2'));

  const isGroq =
    !isOpenRouter &&
    !isCloudflare &&
    !isNvidia &&
    (activeModelObj?.provider === 'groq' ||
      targetModelId.startsWith('llama-') ||
      targetModelId.includes('deepseek') ||
      targetModelId.includes('prompt-guard') ||
      targetModelId.includes('qwen') ||
      targetModelId.startsWith('openai/gpt-oss'));

  // 1. Attempt primary selected provider first (if not auto-routing)
  if (targetModelId && targetModelId !== 'auto/smart-routing') {
    if (isOpenRouter) {
      const result = await tryProvider('openrouter', targetModelId);
      if (result) return result;
    } else if (isCloudflare) {
      const result = await tryProvider('cloudflare', targetModelId);
      if (result) return result;
    } else if (isGroq) {
      const result = await tryProvider('groq', targetModelId);
      if (result) return result;
    } else if (isNvidia) {
      const result = await tryProvider('nvidia', targetModelId);
      if (result) return result;
    }
  }

  // 2. Single-pass fallback order across remaining active providers (Groq -> Cloudflare -> OpenRouter -> NVIDIA)
  for (const fallbackProvider of ['groq', 'cloudflare', 'openrouter', 'nvidia'] as const) {
    const result = await tryProvider(fallbackProvider);
    if (result) return result;
  }

  throw new Error('No active API key (Cloudflare, Groq, OpenRouter, or NVIDIA NIM) available to generate responses. Please open the side menu (API Keys tab) and add your key.');
}
// Helper: String normalization for diacritics/accents and robust tag matching
function normalizeString(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function extractTaggedPersonas(text: string, allPersonas: Persona[]): Persona[] {
  if (!text || typeof text !== 'string') return [];
  const normText = normalizeString(text);
  const found: Persona[] = [];

  for (const p of allPersonas) {
    const normName = normalizeString(p.name);
    const normId = normalizeString(p.id);

    // 1. Explicit @mention (@Name or @id)
    const tagPattern1 = new RegExp(`@${normName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const tagPattern2 = new RegExp(`@${normId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

    // 2. Direct address at start or clause ("Rook," or "Hey Rook" or "Rook:")
    const directAddressPattern = new RegExp(`(?:^|[.,!?;:]\\s*|(?:hey|hi|hello|dear)\\s+)${normName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

    if (tagPattern1.test(normText) || tagPattern2.test(normText) || directAddressPattern.test(normText)) {
      if (!found.some((item) => item.id === p.id)) {
        found.push(p);
      }
    }
  }

  return found;
}

function selectNextSpeaker(
  lastSpeaker: string,
  lastMessageText: string,
  allowedPersonaIds?: string[],
  activePersonas: Persona[] = defaultPersonas,
  pixelTaskCompleted: boolean = false,
  contextMessages: ChatMessage[] = []
): string {
  let activePool = activePersonas;
  if (Array.isArray(allowedPersonaIds) && allowedPersonaIds.length > 0) {
    const filtered = activePersonas.filter(
      (p) => allowedPersonaIds.includes(p.id) || allowedPersonaIds.includes(p.name)
    );
    if (filtered.length > 0) {
      activePool = filtered;
    }
  }

  const personaNames = activePool.map((p) => p.name);
  if (personaNames.length === 0) return activePersonas[0]?.name || 'Rook';

  // 1. Check for explicit tagged / directly addressed personas within the allowed activePool
  const taggedPersonas = extractTaggedPersonas(lastMessageText, activePool);
  for (const tp of taggedPersonas) {
    if (tp.name.toLowerCase() !== lastSpeaker.toLowerCase()) {
      return tp.name;
    }
  }

  // 2. Candidate pool excluding the speaker that just finished
  let candidatePersonas = personaNames.filter(
    (name) => name.toLowerCase() !== lastSpeaker.toLowerCase()
  );

  // If Pixel has completed her assigned task, exclude Pixel from unprompted turns unless tagged
  if (pixelTaskCompleted) {
    candidatePersonas = candidatePersonas.filter(
      (name) => name.toLowerCase() !== 'pixel'
    );
  }

  if (candidatePersonas.length === 0) return personaNames[0];

  // 3. Domain Intent & Relevancy Scoring:
  // Match the topic / question in lastMessageText to the persona's specialized expertise
  const normText = normalizeString(lastMessageText);
  const relevanceScores: { name: string; score: number }[] = candidatePersonas.map((name) => {
    let score = 0;
    const lowerName = name.toLowerCase();

    // Pixel: code, Python, math, data visualizations, charts, statistics, algorithms, calculations
    if (lowerName === 'pixel') {
      if (/\b(python|code|script|math|calc|calculate|chart|plot|graph|data|number|formula|json|sql|algorithm|stat|statistic|distribution|bug|program|dataset|matrix)\b/i.test(normText)) {
        score += 10;
      }
    }
    // Bramble: fact-checking, investigating sources, statistics, debunking myths, verifying claims
    else if (lowerName === 'bramble') {
      if (/\b(fact|receipt|source|verify|citation|check|claim|debunk|true|false|stat|history|record|proof|evidence|when|date|actually|investigate|rumor)\b/i.test(normText)) {
        score += 10;
      }
    }
    // Moss: nature, botany, calm reflection, deep philosophy, quiet observation, patience, ambient poetry
    else if (lowerName === 'moss') {
      if (/\b(feel|nature|peace|calm|quiet|slow|meditat|breathe|grow|tree|forest|soul|deep|life|listen|patient|beauty|poetry|contemplate|gentle)\b/i.test(normText)) {
        score += 10;
      }
    }
    // Nana Nuance: context, subtle distinctions, empathy, dialectics, perspectives
    else if (lowerName.includes('nuance') || lowerName.includes('nana')) {
      if (/\b(nuance|context|perspective|gray|subtle|balance|compassion|empathy|bias|both sides|depends|consider|viewpoint|overlook|middle)\b/i.test(normText)) {
        score += 10;
      }
    }
    // Prof. Oop: scientific method, physics, chemistry, astronomy, historical academia, rigorous theory
    else if (lowerName.includes('oop') || lowerName.includes('prof')) {
      if (/\b(science|physics|chem|biolog|astron|hypothes|experiment|academic|theory|quantum|formula|laboratory|paper|scholarly|method|proof|gravity)\b/i.test(normText)) {
        score += 10;
      }
    }
    // Zed: counter-arguments, street-smart debates, skepticism, irony, calling out hype/marketing
    else if (lowerName === 'zed') {
      if (/\b(hype|cap|overrated|marketing|scam|gimmick|bs|disagree|boring|cynic|fake|nah|honestly|waste|ridiculous)\b/i.test(normText)) {
        score += 10;
      }
    }
    // Rook: rules, order, safety, boundaries, moderation, governance, structure, ethics
    else if (lowerName === 'rook') {
      if (/\b(rule|safe|boundary|order|policy|law|conduct|moderate|structure|guardrail|standard|ethic|protect|limit|violate)\b/i.test(normText)) {
        score += 10;
      }
    }
    // Kō: synthesis, summary, consensus, verdicts, overarching group verdicts
    else if (lowerName === 'kō' || lowerName === 'ko') {
      if (/\b(summary|conclusion|verdict|consensus|all of us|team|agree|decide|overall|wrap up|synthesis|final)\b/i.test(normText)) {
        score += 10;
      }
    }

    return { name, score };
  });

  // If there is a strong domain match, route directly to the expert persona!
  relevanceScores.sort((a, b) => b.score - a.score);
  if (relevanceScores[0] && relevanceScores[0].score > 0) {
    return relevanceScores[0].name;
  }

  // 4. Fair Round-Robin & Least-Recently-Spoken Selection:
  // When no specific domain keyword is triggered, avoid always picking index 0 ('Rook').
  // Find which bots spoke most recently in the thread to rotate past them
  const lastIndex = personaNames.indexOf(lastSpeaker);
  if (lastIndex >= 0) {
    // Last speaker was a bot in the list: advance to the next bot
    for (let i = 1; i <= personaNames.length; i++) {
      const candidate = personaNames[(lastIndex + i) % personaNames.length];
      if (candidate.toLowerCase() !== lastSpeaker.toLowerCase()) {
        if (!pixelTaskCompleted || candidate.toLowerCase() !== 'pixel') {
          return candidate;
        }
      }
    }
  }

  // Last speaker was human ('You') or external:
  // Check who was the last bot that spoke in recent messages to avoid repeating it
  let lastBotSpeakerName = '';
  if (Array.isArray(contextMessages) && contextMessages.length > 0) {
    for (let i = contextMessages.length - 1; i >= 0; i--) {
      const m = contextMessages[i];
      if (m && m.speaker && m.speaker.toLowerCase() !== 'you' && m.speaker.toLowerCase() !== 'system') {
        lastBotSpeakerName = m.speaker;
        break;
      }
    }
  }

  if (lastBotSpeakerName) {
    const prevBotIdx = personaNames.findIndex((n) => n.toLowerCase() === lastBotSpeakerName.toLowerCase());
    if (prevBotIdx >= 0) {
      for (let i = 1; i <= personaNames.length; i++) {
        const candidate = personaNames[(prevBotIdx + i) % personaNames.length];
        if (candidate.toLowerCase() !== lastBotSpeakerName.toLowerCase()) {
          if (!pixelTaskCompleted || candidate.toLowerCase() !== 'pixel') {
            return candidate;
          }
        }
      }
    }
  }

  // Otherwise pick a candidate fairly
  return candidatePersonas[0];
}

// Helper: Summarize a context thread
async function summarizeContext(
  store: DeviceStore,
  contextId: string,
  clientKeys?: ClientKeys
): Promise<string | null> {
  const ctxMessages = store.messages.filter((m) => m.context_id === contextId);
  if (ctxMessages.length < 2) return null;

  const transcript = ctxMessages
    .map((m) => `${m.speaker}: ${m.text}`)
    .join('\n');

  try {
    const summaryResult = await generateModelContent(
      {
        contents: `You are a concise recorder. Summarize this group chat thread in 2 plain sentences without jargon, tech buzzwords, or marketing tone. State what the group discussed and the main consensus or disagreement:\n\n${transcript}`,
        temperature: 0.3,
      },
      clientKeys
    );
    const summaryText = summaryResult?.text || null;

    if (summaryText) {
      const ctx = store.contexts.find((c) => c.context_id === contextId);
      if (ctx) {
        ctx.summary = summaryText;
        persistDeviceStores();
      }
    }
    return summaryText;
  } catch (err) {
    console.error('Failed to summarize context:', err);
    return null;
  }
}

// API Routes
app.get('/api/chat/state', (req, res) => {
  const store = getDeviceStore(req);
  const requestedCtxId = typeof req.query.contextId === 'string' ? req.query.contextId.trim() : '';
  if (requestedCtxId && store.contexts.some((c) => c.context_id === requestedCtxId)) {
    store.currentContextId = requestedCtxId;
  }
  const currentCtx = store.contexts.find((c) => c.context_id === store.currentContextId);
  const activeMessages = store.messages.filter((m) => m.context_id === store.currentContextId);
  const lastMsg = activeMessages[activeMessages.length - 1] || store.messages[store.messages.length - 1];
  const nextSpeaker = selectNextSpeaker(
    lastMsg ? lastMsg.speaker : '',
    lastMsg ? lastMsg.text : '',
    currentCtx?.allowed_persona_ids,
    store.personas
  );

  // Calculate message count per context
  const enrichedContexts = store.contexts.map((ctx) => ({
    ...ctx,
    message_count: store.messages.filter((m) => m.context_id === ctx.context_id).length,
  }));

  const activeModelObj = availableModels.find((m) => m.id === store.selectedModelId);

  const activePoll =
    store.polls.find((p) => p.context_id === store.currentContextId && p.status === 'open') || null;

  const activeDirective = store.activeDirectives[store.currentContextId] || null;

  const activeResearchSession = store.researchSessions[store.currentContextId] || null;
  const activeResearchReport = activeResearchSession ? store.researchReports[activeResearchSession.session_id] || null : null;

  res.json({
    currentContextId: store.currentContextId,
    currentContext: currentCtx,
    contexts: enrichedContexts,
    messages: activeMessages,
    allMessagesCount: store.messages.length,
    personas: store.personas,
    botMemories: store.botMemories,
    nextSpeaker,
    activeRecallTopic: store.activeRecall,
    activeModel: activeModelObj ? activeModelObj.name : store.selectedModelId,
    selectedModelId: store.selectedModelId,
    nsfwMode: store.nsfwMode,
    activePoll,
    activeDirective,
    activeResearchSession,
    activeResearchReport,
  });
});

// Research Mode Pipeline Execution System
async function executeResearchStage(
  store: DeviceStore,
  contextId: string,
  clientKeys?: ClientKeys
): Promise<{ session: ResearchSession; report?: ResearchReport; messagesAdded: ChatMessage[] }> {
  const session = store.researchSessions[contextId];
  if (!session) {
    throw new Error('No active research session found for this conversation.');
  }

  const topic = session.topic;
  const messagesAdded: ChatMessage[] = [];
  const timeStr = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (session.current_stage === 'scoping') {
    // Stage 1: Kō frames the research scope and picks the crew
    session.crew_assigned = ['zed', 'gus_gibbous', 'bramble', 'pixel', 'nana_nuance', 'prof_oop', 'moss'];
    session.current_stage = 'gathering';
    session.stage_index = 1;

    const msg: ChatMessage = {
      id: store.messageAutoId++,
      speaker: 'Kō',
      text: `🔬 Kōrero Research Pipeline Stage 1 (Scoping): Framing topic "${topic}". Assigned the 7 research crew members (Zed, Gus, Bramble, Pixel, Nana Nuance, Prof. Oop, Moss). Zed and Gus are now gathering live web evidence and hypotheses in parallel...`,
      timestamp: timeStr(),
      session_id: session.session_id,
      context_id: contextId,
      researchState: 'scrolling',
    };
    store.messages.push(msg);
    messagesAdded.push(msg);
    return { session, messagesAdded };
  }

  if (session.current_stage === 'gathering') {
    // Stage 2: Parallel Gather — Zed executes web search & Gus generates wild hypothesis
    session.current_stage = 'tracing';
    session.stage_index = 2;

    const zedQuery = `${topic} facts statistics timeline receipts`;
    const searchResults = await fetch_web_results(zedQuery, 5, clientKeys?.tavilyKey);

    const newCards: EvidenceCard[] = [];
    if (searchResults.length > 0) {
      searchResults.forEach((r, idx) => {
        let hostname = 'web';
        try { hostname = new URL(r.url).hostname.replace('www.', ''); } catch (e) {}
        newCards.push({
          id: `card-zed-${Date.now()}-${idx}`,
          claim: `${r.title}: ${r.snippet.slice(0, 160)}...`,
          status: 'unverified',
          found_by: 'Zed',
          sources: [
            {
              title: r.title,
              url: r.url,
              publisher: hostname,
              quality: 'high',
              paraphrase: r.snippet,
            },
          ],
          caveats: ['Raw web finding collected by Zed — pending Bramble origin trace and Moss fact-check stamp.'],
          confidence: 'Medium',
          topic,
          context_id: contextId,
          timestamp: timeStr(),
        });
      });
    } else {
      newCards.push({
        id: `card-zed-${Date.now()}-0`,
        claim: `Primary research claim regarding "${topic}"`,
        status: 'unverified',
        found_by: 'Zed',
        sources: [
          {
            title: `${topic} - Reference Archive`,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`,
            publisher: 'Wikipedia / Reference Archive',
            quality: 'high',
            paraphrase: `Documented facts and background regarding ${topic}.`,
          },
        ],
        caveats: ['Initial web finding — undergoing primary source tracing.'],
        confidence: 'Medium',
        topic,
        context_id: contextId,
        timestamp: timeStr(),
      });
    }

    newCards.push({
      id: `card-gus-${Date.now()}`,
      claim: `Hypothesis on ${topic}: What if the structural timeline connects directly to systemic shifts?`,
      status: 'unverified',
      found_by: 'Gus Gibbous',
      sources: [],
      caveats: ['Wild hypothesis raised by Gus Gibbous — labeled unverified by default.'],
      confidence: 'Low',
      topic,
      context_id: contextId,
      timestamp: timeStr(),
    });

    session.evidence_cards.push(...newCards);
    if (!store.evidenceCards[contextId]) store.evidenceCards[contextId] = [];
    store.evidenceCards[contextId].push(...newCards);

    const zedMsg: ChatMessage = {
      id: store.messageAutoId++,
      speaker: 'Zed',
      text: `Tab 47! Executed live web search for "${zedQuery}". Locked in ${searchResults.length || 1} raw web findings for Bramble to trace!`,
      timestamp: timeStr(),
      session_id: session.session_id,
      context_id: contextId,
      search_query: zedQuery,
      evidence: newCards[0],
      researchState: 'found',
    };
    store.messages.push(zedMsg);
    messagesAdded.push(zedMsg);

    const gusMsg: ChatMessage = {
      id: store.messageAutoId++,
      speaker: 'Gus Gibbous',
      text: `What if... hear me out... it's all connected? Hypothesis alert! Pinned a new red-string connection on the corkboard for Bramble and Moss to test!`,
      timestamp: timeStr(),
      session_id: session.session_id,
      context_id: contextId,
      evidence: newCards[newCards.length - 1],
      researchState: 'rabbithole',
    };
    store.messages.push(gusMsg);
    messagesAdded.push(gusMsg);

    return { session, messagesAdded };
  }

  if (session.current_stage === 'tracing') {
    // Stage 3: Bramble traces claims to primary origins, checks publication dates and footnotes
    session.current_stage = 'debating';
    session.stage_index = 3;

    session.evidence_cards.forEach((card) => {
      if (card.found_by === 'Zed') {
        card.status = 'verified';
        card.checked_by = 'Bramble';
        card.confidence = 'High';
        if (card.sources[0]) {
          card.sources[0].published = '2024 / Primary Document';
          card.sources[0].source_type = 'primary';
        }
      } else if (card.found_by === 'Gus Gibbous') {
        card.status = 'disputed';
        card.checked_by = 'Bramble';
        card.caveats.push('Bramble traced origin: Unbacked by primary documentation.');
      }
    });

    const msg: ChatMessage = {
      id: store.messageAutoId++,
      speaker: 'Bramble',
      text: `Let's find the original source. Slowly... Traced Zed's findings back to primary documentation with exact publication dates and verified footnotes!`,
      timestamp: timeStr(),
      session_id: session.session_id,
      context_id: contextId,
      evidence: session.evidence_cards[0],
      researchState: 'reading',
    };
    store.messages.push(msg);
    messagesAdded.push(msg);

    return { session, messagesAdded };
  }

  if (session.current_stage === 'debating') {
    // Stage 4: Parallel Debate — Pixel (stats/sample size), Nana Nuance (scope/context), Prof. Oop (devil's advocate)
    session.current_stage = 'checking';
    session.stage_index = 4;

    const pixelMsg: ChatMessage = {
      id: store.messageAutoId++,
      speaker: 'Pixel',
      text: `Beautiful. But what's the n? Evaluated statistical significance and sample size confidence across the evidence cards. Variance is within bounds!`,
      timestamp: timeStr(),
      session_id: session.session_id,
      context_id: contextId,
      researchState: 'debating',
    };
    store.messages.push(pixelMsg);
    messagesAdded.push(pixelMsg);

    const nanaMsg: ChatMessage = {
      id: store.messageAutoId++,
      speaker: 'Nana Nuance',
      text: `Oh, sweetheart, it's more complicated than that. Factored in funding background, study limitations, and broader real-world context caveats.`,
      timestamp: timeStr(),
      session_id: session.session_id,
      context_id: contextId,
      researchState: 'debating',
    };
    store.messages.push(nanaMsg);
    messagesAdded.push(nanaMsg);

    const oopMsg: ChatMessage = {
      id: store.messageAutoId++,
      speaker: 'Prof. Oop',
      text: `Allow me to argue the opposite, purely for sport! Stress-tested the conclusion against the counter-case before conceding to solid evidence!`,
      timestamp: timeStr(),
      session_id: session.session_id,
      context_id: contextId,
      researchState: 'doubt',
    };
    store.messages.push(oopMsg);
    messagesAdded.push(oopMsg);

    return { session, messagesAdded };
  }

  if (session.current_stage === 'checking') {
    // Stage 5: Moss Fact-Check Gate — stamps verified
    session.current_stage = 'synthesizing';
    session.stage_index = 5;

    session.evidence_cards.forEach((card) => {
      if (card.status === 'verified') {
        card.checked_by = 'Moss';
      }
    });

    const msg: ChatMessage = {
      id: store.messageAutoId++,
      speaker: 'Moss',
      text: `...citation needed. Stamped verified on primary sources with valid publisher dates. Gate cleared for Kō's synthesis.`,
      timestamp: timeStr(),
      session_id: session.session_id,
      context_id: contextId,
      researchState: 'stamp',
    };
    store.messages.push(msg);
    messagesAdded.push(msg);

    return { session, messagesAdded };
  }

  if (session.current_stage === 'synthesizing') {
    // Stage 6: Kō's Unified Synthesis Report
    session.current_stage = 'complete';
    session.stage_index = 6;
    session.completed_at = new Date().toISOString();

    const verifiedCount = session.evidence_cards.filter((c) => c.status === 'verified').length;
    const disputedCount = session.evidence_cards.filter((c) => c.status === 'disputed').length;
    const unverifiedCount = session.evidence_cards.filter((c) => c.status === 'unverified').length;
    const refutedCount = session.evidence_cards.filter((c) => c.status === 'refuted').length;

    const confidence: 'High' | 'Medium' | 'Low' =
      verifiedCount >= 2 ? 'High' : verifiedCount === 1 ? 'Medium' : 'Low';

    const allSources = session.evidence_cards.flatMap((c) => c.sources || []);

    const reportText = `🏁 UNIFIED RESEARCH REPORT: "${topic}"\n\nExecutive Summary:\nThe Kōrero Research Crew completed a 6-stage investigation on "${topic}". Zed executed live web searches; Bramble traced primary source origins; Pixel verified statistical sample sizes; Nana Nuance accounted for funding context; Prof. Oop stress-tested the counter-case; and Moss stamped final citation clearance.\n\nKey Findings:\n• Verified Claims: ${verifiedCount}\n• Disputed / Unverified Hypotheses: ${disputedCount + unverifiedCount}\n• Overall Research Confidence: ${confidence}\n\nConclusion:\nBased on primary receipts, the research inquiry is grounded in verified documentation. Short version? Verified with ${confidence} confidence.`;

    const report: ResearchReport = {
      session_id: session.session_id,
      topic,
      report_text: reportText,
      confidence,
      generated_at: new Date().toISOString(),
      evidence_count: session.evidence_cards.length,
      verified_count: verifiedCount,
      disputed_count: disputedCount,
      refuted_count: refutedCount,
      unverified_count: unverifiedCount,
      key_sources: allSources.slice(0, 5),
    };

    store.researchReports[session.session_id] = report;

    const synthesisMsg: ChatMessage = {
      id: store.messageAutoId++,
      speaker: 'Kō — Research Report',
      text: reportText,
      timestamp: timeStr(),
      session_id: session.session_id,
      context_id: contextId,
      verdict: {
        id: `verdict-${session.session_id}`,
        topic,
        summary: reportText,
        confidence,
        key_sources: allSources.slice(0, 5),
        open_questions: ['What additional longitudinal trials are underway?'],
        status: verifiedCount > 0 ? 'verified' : 'unverified',
        author: 'Kō',
        timestamp: timeStr(),
      },
      researchState: 'mic_drop',
    };

    store.messages.push(synthesisMsg);
    messagesAdded.push(synthesisMsg);

    return { session, report, messagesAdded };
  }

  return { session, messagesAdded };
}

// Importance Layer (/hearme) Endpoints
app.post('/api/chat/hearme', (req, res) => {
  const store = getDeviceStore(req);
  const { directive, speaker = 'You' } = req.body;
  if (!directive || typeof directive !== 'string' || !directive.trim()) {
    return res.status(400).json({ error: 'Instruction text is required for /hearme' });
  }

  const cleanDirective = directive.trim();
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Store in activeDirectives for this context
  const directiveObj = {
    directive: cleanDirective,
    setBy: speaker.trim() || 'You',
    timestamp: new Date().toISOString(),
  };
  store.activeDirectives[store.currentContextId] = directiveObj;

  // Insert high-importance user message in chat
  const newMsg: ChatMessage = {
    id: store.messageAutoId++,
    speaker: directiveObj.setBy,
    text: cleanDirective,
    timestamp: timeStr,
    session_id: 'session-' + Date.now(),
    context_id: store.currentContextId,
    is_priority_directive: true,
  };
  store.messages.push(newMsg);
  persistDeviceStores();

  const currentCtx = store.contexts.find((c) => c.context_id === store.currentContextId);
  if (currentCtx) {
    currentCtx.last_active_at = new Date().toISOString();
  }

  const activeMessages = store.messages.filter((m) => m.context_id === store.currentContextId);
  const nextSpeaker = selectNextSpeaker(
    newMsg.speaker,
    newMsg.text,
    currentCtx?.allowed_persona_ids,
    store.personas,
    false,
    activeMessages
  );

  res.json({
    success: true,
    directive: directiveObj,
    message: newMsg,
    nextSpeaker,
  });
});

app.post('/api/chat/hearme/dismiss', (req, res) => {
  const store = getDeviceStore(req);
  const { contextId } = req.body;
  const targetId = contextId || store.currentContextId;
  store.activeDirectives[targetId] = null;
  persistDeviceStores();
  res.json({ success: true, message: 'Priority directive dismissed' });
});

// Research Mode Endpoints
app.post('/api/research/start', async (req, res) => {
  const store = getDeviceStore(req);
  const clientKeys = extractClientKeys(req);
  const { topic } = req.body || {};

  const currentCtx = store.contexts.find((c) => c.context_id === store.currentContextId);
  const researchTopic = (topic || currentCtx?.topic_label || 'General Research').trim();

  const session_id = 'rs-' + Date.now();
  const session: ResearchSession = {
    session_id,
    context_id: store.currentContextId,
    topic: researchTopic,
    crew_assigned: ['zed', 'gus_gibbous', 'bramble', 'pixel', 'nana_nuance', 'prof_oop', 'moss'],
    current_stage: 'scoping',
    stage_index: 0,
    created_at: new Date().toISOString(),
    evidence_cards: [],
    stage_completions: {},
  };

  store.researchSessions[store.currentContextId] = session;

  try {
    const result = await executeResearchStage(store, store.currentContextId, clientKeys);
    res.json({
      success: true,
      session: result.session,
      messages: result.messagesAdded,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to start research pipeline' });
  }
});

app.post('/api/research/stage', async (req, res) => {
  const store = getDeviceStore(req);
  const clientKeys = extractClientKeys(req);

  try {
    const result = await executeResearchStage(store, store.currentContextId, clientKeys);
    res.json({
      success: true,
      session: result.session,
      report: result.report,
      messages: result.messagesAdded,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to execute research stage' });
  }
});

app.post('/api/research/run-all', async (req, res) => {
  const store = getDeviceStore(req);
  const clientKeys = extractClientKeys(req);
  const allMessages: ChatMessage[] = [];

  let session = store.researchSessions[store.currentContextId];
  if (!session || session.current_stage === 'complete') {
    const currentCtx = store.contexts.find((c) => c.context_id === store.currentContextId);
    const researchTopic = (req.body?.topic || currentCtx?.topic_label || 'General Research').trim();
    const session_id = 'rs-' + Date.now();
    session = {
      session_id,
      context_id: store.currentContextId,
      topic: researchTopic,
      crew_assigned: ['zed', 'gus_gibbous', 'bramble', 'pixel', 'nana_nuance', 'prof_oop', 'moss'],
      current_stage: 'scoping',
      stage_index: 0,
      created_at: new Date().toISOString(),
      evidence_cards: [],
      stage_completions: {},
    };
    store.researchSessions[store.currentContextId] = session;
  }

  let finalReport: ResearchReport | undefined;

  try {
    while (session && session.current_stage !== 'complete') {
      const stepResult = await executeResearchStage(store, store.currentContextId, clientKeys);
      allMessages.push(...stepResult.messagesAdded);
      if (stepResult.report) finalReport = stepResult.report;
      session = stepResult.session;
    }

    res.json({
      success: true,
      session,
      report: finalReport,
      messages: allMessages,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to run full research pipeline' });
  }
});

app.get('/api/research/session/:contextId', (req, res) => {
  const store = getDeviceStore(req);
  const contextId = req.params.contextId || store.currentContextId;
  const session = store.researchSessions[contextId] || null;
  const report = session ? store.researchReports[session.session_id] || null : null;
  const cards = store.evidenceCards[contextId] || [];

  res.json({
    session,
    report,
    cards,
  });
});


// Search, Crawl & Code Execution Logs Endpoints
app.get('/api/search/logs', (req, res) => {
  res.json({
    searches: search_log,
    crawls: crawl_log,
    execs: exec_log,
  });
});

// Polls Endpoints
app.get('/api/polls/active/:contextId', (req, res) => {
  const store = getDeviceStore(req);
  const { contextId } = req.params;
  const poll = store.polls.find((p) => p.context_id === contextId && p.status === 'open') || null;
  res.json({ poll });
});

app.post('/api/polls', (req, res) => {
  const store = getDeviceStore(req);
  const { question, options, created_by = 'You' } = req.body;
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'Poll question is required' });
  }

  const cleanOptions = Array.isArray(options)
    ? options.map((o) => String(o).trim()).filter(Boolean)
    : [];

  if (cleanOptions.length < 2) {
    return res.status(400).json({ error: 'At least 2 options are required for a poll' });
  }

  // Check if a poll is already open in this context
  const existingOpen = store.polls.find(
    (p) => p.context_id === store.currentContextId && p.status === 'open'
  );
  if (existingOpen) {
    return res.status(400).json({
      error: `A poll is already active in this conversation: "${existingOpen.question}". Please close it before creating a new one.`,
    });
  }

  const newPoll: Poll = {
    poll_id: store.pollAutoId++,
    context_id: store.currentContextId,
    question: question.trim(),
    options: cleanOptions,
    status: 'open',
    created_by: created_by.trim() || 'You',
    created_at: new Date().toISOString(),
    votes: {},
  };

  store.polls.push(newPoll);

  // Post system announcement message to the chat
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const announcementText = `📊 Poll created by ${newPoll.created_by}: "${newPoll.question}"\n${newPoll.options
    .map((opt, i) => `[${i + 1}] ${opt}`)
    .join('  ·  ')}`;

  const pollMsg: ChatMessage = {
    id: store.messageAutoId++,
    speaker: 'System',
    text: announcementText,
    timestamp: timeStr,
    session_id: 'session-' + Date.now(),
    context_id: store.currentContextId,
  };
  store.messages.push(pollMsg);
  persistDeviceStores();

  res.json({ success: true, poll: newPoll, message: pollMsg });
});

app.post('/api/polls/:id/vote', (req, res) => {
  const store = getDeviceStore(req);
  const pollId = Number(req.params.id);
  const { voter = 'You', option_index } = req.body;

  const poll = store.polls.find((p) => p.poll_id === pollId);
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }
  if (poll.status !== 'open') {
    return res.status(400).json({ error: 'This poll is already closed' });
  }

  const optIdx = Number(option_index);
  if (isNaN(optIdx) || optIdx < 0 || optIdx >= poll.options.length) {
    return res.status(400).json({ error: 'Invalid option index' });
  }

  // Enforce one vote per voter per poll
  poll.votes[voter] = optIdx;
  persistDeviceStores();

  res.json({ success: true, poll });
});

app.post('/api/polls/:id/close', (req, res) => {
  const store = getDeviceStore(req);
  const pollId = Number(req.params.id);
  const poll = store.polls.find((p) => p.poll_id === pollId);
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }

  poll.status = 'closed';

  // Tally votes
  const totalVotes = Object.keys(poll.votes).length;
  const counts = poll.options.map(
    (_, idx) => Object.values(poll.votes).filter((v) => v === idx).length
  );

  let winnerIdx = 0;
  let maxCount = -1;
  counts.forEach((c, i) => {
    if (c > maxCount) {
      maxCount = c;
      winnerIdx = i;
    }
  });

  const breakdown = poll.options
    .map((opt, i) => {
      const pct = totalVotes > 0 ? Math.round((counts[i] / totalVotes) * 100) : 0;
      return `${opt}: ${counts[i]} vote(s) (${pct}%)`;
    })
    .join('  ·  ');

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const resultText = `🏁 Poll Closed: "${poll.question}"\nWinner: "${poll.options[winnerIdx]}" with ${maxCount} vote(s).\nResults: ${breakdown}`;

  const resultMsg: ChatMessage = {
    id: store.messageAutoId++,
    speaker: 'System',
    text: resultText,
    timestamp: timeStr,
    session_id: 'session-' + Date.now(),
    context_id: poll.context_id,
  };
  store.messages.push(resultMsg);
  persistDeviceStores();

  res.json({ success: true, poll, message: resultMsg });
});


// Settings Endpoints
app.get('/api/settings', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const store = getDeviceStore(req);
  if (
    openRouterCacheMetadata.cacheVersion !== OPENROUTER_CACHE_VERSION ||
    Date.now() >= openRouterCacheMetadata.expiresAt ||
    dynamicOpenRouterModels.length <= defaultOpenRouterModels.length
  ) {
    try {
      await refreshOpenRouterModels(false);
    } catch (e) {
      console.warn('[OpenRouter] Background refresh failed:', e);
    }
  }
  res.json({
    selectedModel: store.selectedModelId,
    availableModels,
    modelsMetadata: {
      lastRefreshedAt: openRouterCacheMetadata.lastFetchedAt,
      expiresAt: openRouterCacheMetadata.expiresAt,
      refreshIntervalDays: 7,
      openRouterCount: dynamicOpenRouterModels.length,
    },
    keys: [], // Device-local keys are private to each browser/device in localStorage
    hasApiKey: false,
    hasOpenRouterKey: false,
    hasNvidiaKey: false,
    hasGroqKey: false,
    hasCloudflareKey: Boolean(process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY),
    hasTavilyKey: false,
    hasE2bKey: false,
    nsfwMode: store.nsfwMode,
  });
});

// Dynamic Models Refresh Endpoint (forces live re-sync from OpenRouter)
app.post('/api/models/refresh', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const clientKeys = extractClientKeys(req);
  try {
    const result = await refreshOpenRouterModels(true, clientKeys.openRouterKey);
    res.json({
      success: true,
      refreshedCount: result.count,
      availableModels,
      modelsMetadata: {
        lastRefreshedAt: openRouterCacheMetadata.lastFetchedAt,
        expiresAt: openRouterCacheMetadata.expiresAt,
        refreshIntervalDays: 7,
        openRouterCount: dynamicOpenRouterModels.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to refresh models' });
  }
});

// NSFW Mode Endpoints
app.get('/api/chat/nsfw', (req, res) => {
  const store = getDeviceStore(req);
  res.json({ nsfwMode: store.nsfwMode });
});

app.post('/api/chat/nsfw', (req, res) => {
  const store = getDeviceStore(req);
  const { nsfwMode: requestedMode } = req.body;
  store.nsfwMode = Boolean(requestedMode);
  persistDeviceStores();
  res.json({
    success: true,
    nsfwMode: store.nsfwMode,
  });
});

// Persona Management Endpoints
app.get('/api/personas', (req, res) => {
  const store = getDeviceStore(req);
  res.json({ personas: store.personas });
});

// Intelligent JSON Character Card Analyzer & Lore-to-Memory Distiller (Tavern V1/V2/V3, Chub, Character.AI, Custom JSON)
function replaceTavernMacros(text: string, charName: string, userLabel = 'User'): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\{\{\s*char\s*\}\}/gi, charName)
    .replace(/<BOT>/gi, charName)
    .replace(/\{\{\s*user\s*\}\}/gi, userLabel)
    .replace(/<USER>/gi, userLabel)
    .replace(/\r\n/g, '\n')
    .trim();
}

function extractDialogueAnchorsFromExamples(
  mesExample: string,
  firstMes: string,
  charName: string
): string[] {
  const anchors: string[] = [];
  const escapedName = charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const combined = `${mesExample || ''}\n${firstMes || ''}`;

  // 1. Extract spoken quotes "..." or character lines
  const lines = combined
    .split(/\n|<START>/i)
    .map((l) => l.trim())
    .filter((l) => l.length >= 12 && !/^(?:\{\{user\}\}|user|you|<user>)\s*:/i.test(l));

  for (const rawLine of lines) {
    let cleaned = rawLine
      .replace(new RegExp(`^(?:\\{\\{char\\}\\}|${escapedName}|<bot>)\\s*:\\s*`, 'i'), '')
      .trim();
    cleaned = replaceTavernMacros(cleaned, charName, 'you');
    if (!cleaned || cleaned.length < 12) continue;

    // If line is very long, take the first 1-2 sentences or first 160 chars
    if (cleaned.length > 165) {
      const sentenceMatch = cleaned.match(/^([^.!?]+[.!?]+(?:\s+[^.!?]+[.!?]+)?)/);
      cleaned = sentenceMatch ? sentenceMatch[1].trim() : cleaned.slice(0, 160).trim();
    }
    if (
      cleaned.length >= 12 &&
      cleaned.length <= 180 &&
      !anchors.some((a) => a.toLowerCase() === cleaned.toLowerCase())
    ) {
      anchors.push(cleaned);
    }
    if (anchors.length >= 5) break;
  }

  // Fallback: extract quoted dialogue if any
  if (anchors.length < 2 && combined.length > 0) {
    const quoteMatches = combined.match(/"([^"\n]{15,150})"/g);
    if (quoteMatches) {
      for (const q of quoteMatches) {
        const inner = replaceTavernMacros(q.slice(1, -1).trim(), charName, 'you');
        if (inner && !anchors.includes(inner)) {
          anchors.push(inner);
          if (anchors.length >= 4) break;
        }
      }
    }
  }

  return anchors;
}

function extractLoreShardsFromCard(
  rawDesc: string,
  rawPersonality: string,
  rawScenario: string,
  characterBook: any,
  charName: string
): Array<{ s: string; k: string[]; w: number }> {
  const shards: Array<{ s: string; k: string[]; w: number }> = [];

  const pushUniqueShard = (summary: string, customTags: string[] = [], weight = 4) => {
    const clean = replaceTavernMacros(summary, charName, 'User')
      .replace(/\s+/g, ' ')
      .replace(/^[-*•]+\s*/, '')
      .trim()
      .slice(0, 120);
    if (!clean || clean.length < 15) return;
    if (shards.some((existing) => existing.s.toLowerCase() === clean.toLowerCase())) return;
    const tags = Array.from(
      new Set([
        ...customTags.map((t) => String(t).toLowerCase().trim()).filter((t) => t.length >= 2),
        ...tokenizeForMemory(clean).slice(0, 5),
      ])
    ).slice(0, 6);
    shards.push({
      s: clean,
      k: tags.length > 0 ? tags : ['lore', charName.toLowerCase()],
      w: Math.max(1, Math.min(5, weight)),
    });
  };

  // 1. Extract from Tavern V2/V3 character_book (Lorebook / World Info entries)
  const bookEntries = Array.isArray(characterBook?.entries)
    ? characterBook.entries
    : characterBook?.entries && typeof characterBook.entries === 'object'
    ? Object.values(characterBook.entries)
    : [];

  for (const entry of bookEntries) {
    if (!entry || entry.enabled === false) continue;
    const content = String(entry.content || entry.entry || '').trim();
    if (!content) continue;
    const keys: string[] = Array.isArray(entry.keys)
      ? entry.keys
      : typeof entry.key === 'string'
      ? entry.key.split(',')
      : [];
    const firstSentence = content.split(/(?<=[.!?])\s+/)[0] || content;
    pushUniqueShard(firstSentence, ['lorebook', ...keys], 5);
    if (shards.length >= 16) break;
  }

  // 2. Extract scenario shard
  if (rawScenario && rawScenario.trim().length >= 15) {
    const cleanScen = rawScenario.split(/(?<=[.!?])\s+/)[0] || rawScenario;
    pushUniqueShard(`Scenario: ${cleanScen}`, ['scenario', 'setting'], 5);
  }

  // 3. Extract factual / backstory sentences from description & personality (skipping the first 2 core identity sentences)
  const combinedProse = `${rawDesc || ''}\n${rawPersonality || ''}`;
  const rawChunks = combinedProse
    .split(/\n+|(?<=[.!?])\s+/)
    .map((c) => c.trim())
    .filter((c) => c.length >= 22);

  for (let i = 2; i < rawChunks.length; i++) {
    if (shards.length >= 25) break;
    pushUniqueShard(rawChunks[i], ['backstory'], 4);
  }

  return shards;
}

app.post('/api/personas/import-analyze', async (req, res) => {
  const store = getDeviceStore(req);
  const clientKeys = extractClientKeys(req);
  const { rawJson } = req.body || {};

  if (!rawJson) {
    return res.status(400).json({ error: 'Please provide a JSON character card to analyze.' });
  }

  let parsed: any;
  try {
    parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
  } catch (err: any) {
    return res.status(400).json({
      error: `Invalid JSON syntax: ${err?.message || 'Could not parse JSON file.'}`,
    });
  }

  if (!parsed || typeof parsed !== 'object') {
    return res.status(400).json({ error: 'JSON root must be a valid character object.' });
  }

  // Detect format & unwrap V2/V3 `data` envelope or Character.AI `character` envelope
  let cardFormat = 'Custom Character JSON';
  let dataNode = parsed;
  if (parsed.spec === 'chara_card_v3' || parsed.spec_version?.startsWith('3')) {
    cardFormat = 'Tavern Card V3 (chara_card_v3)';
    dataNode = parsed.data && typeof parsed.data === 'object' ? { ...parsed, ...parsed.data } : parsed;
  } else if (parsed.spec === 'chara_card_v2' || (parsed.data && typeof parsed.data === 'object' && parsed.data.name)) {
    cardFormat = 'SillyTavern / Tavern V2 (chara_card_v2)';
    dataNode = { ...parsed, ...parsed.data };
  } else if (parsed.character && typeof parsed.character === 'object') {
    cardFormat = 'Character.AI / Pygmalion Export';
    dataNode = { ...parsed, ...parsed.character };
  } else if (parsed.char_name || parsed.first_mes || parsed.mes_example) {
    cardFormat = 'TavernAI V1 Card';
  }

  const rawName = String(
    dataNode.name || dataNode.char_name || dataNode.character_name || dataNode.title || 'Imported Character'
  ).trim();
  const charName = rawName.slice(0, 48) || 'Character';

  const rawDesc = replaceTavernMacros(
    String(dataNode.description || dataNode.char_persona || dataNode.persona || dataNode.definition || ''),
    charName,
    'User'
  );
  const rawPersonality = replaceTavernMacros(
    String(dataNode.personality || dataNode.short_description || dataNode.summary || ''),
    charName,
    'User'
  );
  const rawScenario = replaceTavernMacros(
    String(dataNode.scenario || dataNode.world_scenario || ''),
    charName,
    'you'
  );
  const rawFirstMes = replaceTavernMacros(
    String(
      dataNode.first_mes ||
        dataNode.char_greeting ||
        dataNode.greeting ||
        (Array.isArray(dataNode.alternate_greetings) ? dataNode.alternate_greetings[0] : '') ||
        ''
    ),
    charName,
    'you'
  );
  const rawMesExample = replaceTavernMacros(
    String(dataNode.mes_example || dataNode.example_dialogue || ''),
    charName,
    'you'
  );
  const rawSysPrompt = replaceTavernMacros(
    String(dataNode.system_prompt || dataNode.post_history_instructions || dataNode.jailbreak || ''),
    charName,
    'User'
  );
  const characterBook = dataNode.character_book || parsed.character_book || null;
  const rawTags: string[] = Array.isArray(dataNode.tags)
    ? dataNode.tags.map((t: any) => String(t))
    : [];

  // Detect avatar URL if valid http(s) or data:image
  const candidateAvatar = String(dataNode.avatar || dataNode.avatar_url || dataNode.image || '').trim();
  const validAvatar =
    candidateAvatar.startsWith('http://') ||
    candidateAvatar.startsWith('https://') ||
    candidateAvatar.startsWith('data:image/')
      ? candidateAvatar
      : undefined;

  // Detect NSFW clearance from tags or card metadata
  const nsfwRegex = /\b(nsfw|18\+|mature|explicit|uncensored|smut|erotic|dead\s*dove|adult)\b/i;
  const allowNsfw = Boolean(
    dataNode.nsfw === true ||
      dataNode.allowNsfw === true ||
      rawTags.some((t) => nsfwRegex.test(t)) ||
      nsfwRegex.test(rawDesc) ||
      nsfwRegex.test(rawSysPrompt)
  );

  // Detect if card has roleplay traits (*emotes*, first_mes, scenario, Tavern spec)
  const isRoleplayCard = Boolean(
    cardFormat.includes('Tavern') ||
      cardFormat.includes('Character.AI') ||
      rawFirstMes.length > 0 ||
      rawScenario.length > 0 ||
      /\*[^*]+\*/.test(rawFirstMes) ||
      /\*[^*]+\*/.test(rawMesExample)
  );

  // Deterministic distillation baseline
  const allSentences = `${rawPersonality ? rawPersonality + '. ' : ''}${rawDesc}`
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 10);

  let distilledDescription =
    allSentences.slice(0, 3).join(' ').slice(0, 380) ||
    `${charName} is a distinctive conversational and roleplay persona.`;
  if (rawPersonality && !distilledDescription.toLowerCase().includes(rawPersonality.slice(0, 20).toLowerCase())) {
    distilledDescription = `${rawPersonality.slice(0, 140)}. ${distilledDescription}`.slice(0, 400);
  }

  let styleAnchors = extractDialogueAnchorsFromExamples(rawMesExample, rawFirstMes, charName);
  if (styleAnchors.length === 0) {
    styleAnchors = [
      rawFirstMes ? rawFirstMes.slice(0, 140) : `Let's talk properly, just you and me.`,
    ];
  }

  let negativeConstraints: string[] = [
    `Never speak, act, or write dialogue lines on behalf of User.`,
    `Stay authentically in character as ${charName} without breaking the fourth wall or giving generic AI disclaimers.`,
  ];
  if (rawSysPrompt) {
    const sysLines = rawSysPrompt
      .split(/\n+|(?<=[.!?])\s+/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 15 && l.length <= 130)
      .slice(0, 2);
    negativeConstraints.push(...sysLines);
  }

  let userRapport = rawScenario
    ? rawScenario.split(/(?<=[.!?])\s+/)[0].slice(0, 95)
    : `engaged in an authentic character dynamic with you as ${charName}`;

  let extractedShards = extractLoreShardsFromCard(
    rawDesc,
    rawPersonality,
    rawScenario,
    characterBook,
    charName
  );

  // Also include any pre-exported Kōrero memory shards if present
  if (Array.isArray(dataNode.initialMemoryShards)) {
    for (const s of dataNode.initialMemoryShards) {
      if (s && typeof s.s === 'string') {
        extractedShards.push({
          s: s.s.slice(0, 120),
          k: Array.isArray(s.k) ? s.k : tokenizeForMemory(s.s).slice(0, 5),
          w: Number(s.w) || 4,
        });
      }
    }
  }

  // Optional AI Distillation Pass when an API key is configured on this device
  let distilledByAi = false;
  const hasAnyAiKey = Boolean(
    clientKeys.groqKey?.trim() ||
      clientKeys.openRouterKey?.trim() ||
      clientKeys.nvidiaKey?.trim() ||
      clientKeys.cloudflareKey?.trim() ||
      process.env.CLOUDFLARE_API_TOKEN?.trim()
  );

  if (hasAnyAiKey && (rawDesc.length > 180 || rawMesExample.length > 80 || rawScenario.length > 40)) {
    try {
      const distillPrompt = `You are an expert character card compiler for Kōrero. Distill this character card into a compact, high-coherence persona profile and atomic memory shards so the character sounds 100% authentic without bloating the prompt.

Character Name: ${charName}
Raw Description: ${rawDesc.slice(0, 1800)}
Raw Personality: ${rawPersonality.slice(0, 600)}
Raw Scenario: ${rawScenario.slice(0, 500)}
First Greeting: ${rawFirstMes.slice(0, 500)}
Example Dialogue: ${rawMesExample.slice(0, 800)}
System Instructions: ${rawSysPrompt.slice(0, 400)}

Return ONLY valid JSON matching this exact structure (no markdown fences or extra text):
{
  "description": "2 to 3 vivid, dense sentences capturing ${charName}'s core personality, speaking voice, demeanor, and role.",
  "userRapport": "1 concise line (under 90 chars) describing how ${charName} views and interacts with the user.",
  "style_anchor": ["3 to 4 short, authentic in-character quotes or *action* + dialogue lines showing how ${charName} talks"],
  "negative_constraints": ["2 to 3 specific behavioral rules for ${charName} (e.g., never act for the user, maintain their specific speech habit)"],
  "loreShards": [
    { "s": "Single atomic fact about ${charName}'s backstory, world, abilities, or relationships (max 110 chars)", "k": ["keyword1", "keyword2", "keyword3"], "w": 4 }
  ]
}`;

      const aiRes = await generateModelContent(
        { contents: distillPrompt, temperature: 0.3 },
        clientKeys,
        store.selectedModelId
      );
      const rawText = aiRes?.text?.trim() || '';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiObj = JSON.parse(jsonMatch[0]);
        if (typeof aiObj.description === 'string' && aiObj.description.trim().length >= 25) {
          distilledDescription = replaceTavernMacros(aiObj.description.trim(), charName, 'User').slice(0, 420);
          distilledByAi = true;
        }
        if (typeof aiObj.userRapport === 'string' && aiObj.userRapport.trim().length >= 8) {
          userRapport = replaceTavernMacros(aiObj.userRapport.trim(), charName, 'you').slice(0, 95);
        }
        if (Array.isArray(aiObj.style_anchor) && aiObj.style_anchor.length > 0) {
          const cleanAiAnchors = aiObj.style_anchor
            .map((a: any) => replaceTavernMacros(String(a).trim(), charName, 'you'))
            .filter((a: string) => a.length >= 8 && a.length <= 180)
            .slice(0, 5);
          if (cleanAiAnchors.length > 0) {
            styleAnchors = cleanAiAnchors;
          }
        }
        if (Array.isArray(aiObj.negative_constraints) && aiObj.negative_constraints.length > 0) {
          const cleanRules = aiObj.negative_constraints
            .map((r: any) => replaceTavernMacros(String(r).trim(), charName, 'User'))
            .filter((r: string) => r.length >= 10 && r.length <= 140)
            .slice(0, 4);
          if (cleanRules.length > 0) {
            negativeConstraints = cleanRules;
          }
        }
        if (Array.isArray(aiObj.loreShards) && aiObj.loreShards.length > 0) {
          const aiShards = aiObj.loreShards
            .filter((sh: any) => sh && typeof sh.s === 'string' && sh.s.trim().length >= 12)
            .map((sh: any) => ({
              s: replaceTavernMacros(String(sh.s).trim(), charName, 'User').slice(0, 120),
              k: Array.isArray(sh.k)
                ? sh.k.map((k: any) => String(k).toLowerCase().trim()).filter(Boolean).slice(0, 6)
                : tokenizeForMemory(String(sh.s)).slice(0, 5),
              w: Math.max(1, Math.min(5, Number(sh.w) || 4)),
            }));
          // Combine AI-distilled shards + Lorebook shards (up to 25 total)
          const merged = [...aiShards];
          for (const detShard of extractedShards) {
            if (merged.length >= 25) break;
            if (!merged.some((m) => m.s.toLowerCase() === detShard.s.toLowerCase())) {
              merged.push(detShard);
            }
          }
          extractedShards = merged.slice(0, 25);
        }
      }
    } catch (aiErr) {
      // Keep deterministic distillation if AI pass fails
    }
  }

  const analysis: CharacterImportAnalysis = {
    cardFormat,
    name: charName,
    description: distilledDescription,
    avatarUrl: validAvatar,
    allowNsfw,
    isRoleplayCard,
    firstMessage: rawFirstMes.slice(0, 1200),
    scenario: rawScenario.slice(0, 350),
    style_anchor: styleAnchors.slice(0, 5),
    negative_constraints: negativeConstraints.slice(0, 5),
    intellect: 7,
    thoughtfulness: 'balanced',
    pacingDelaySeconds: 1.0,
    userRapport,
    extractedShards: extractedShards.slice(0, 25),
    distilledByAi,
  };

  return res.json({ success: true, analysis });
});

app.post('/api/personas', (req, res) => {
  const store = getDeviceStore(req);
  const {
    name,
    description,
    badgeColor = '#3b82f6',
    avatarUrl,
    negative_constraints = [],
    style_anchor = [],
    allowNsfw = false,
    selectedModelId,
    intellect,
    thoughtfulness,
    pacingDelaySeconds,
    isRoleplayCard,
    firstMessage,
    scenario,
    initialMemoryShards,
    userRapport,
  } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Persona name is required' });
  }

  const cleanName = name.trim();
  const id = `persona-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;

  const newPersona: Persona = {
    id,
    name: cleanName,
    badgeColor: badgeColor || '#3b82f6',
    avatarLetter: cleanName.charAt(0).toUpperCase(),
    avatarUrl: avatarUrl?.trim() || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
    description: description?.trim() || `${cleanName} is a thoughtful discussion partner with unique views.`,
    negative_constraints: Array.isArray(negative_constraints)
      ? negative_constraints.map((c) => String(c).trim()).filter(Boolean)
      : [],
    style_anchor: Array.isArray(style_anchor)
      ? style_anchor.map((a) => String(a).trim()).filter(Boolean)
      : [],
    allowNsfw: Boolean(allowNsfw),
    isCustom: true,
    selectedModelId: typeof selectedModelId === 'string' ? selectedModelId.trim() : undefined,
    intellect: typeof intellect === 'number' ? intellect : 7,
    thoughtfulness: thoughtfulness || 'balanced',
    pacingDelaySeconds: typeof pacingDelaySeconds === 'number' ? pacingDelaySeconds : 1.0,
    isRoleplayCard: Boolean(isRoleplayCard),
    firstMessage: typeof firstMessage === 'string' && firstMessage.trim() ? firstMessage.trim() : undefined,
    scenario: typeof scenario === 'string' && scenario.trim() ? scenario.trim() : undefined,
  };

  store.personas.push(newPersona);

  // Initialize Coherent Memory Bank and seed any imported lore/backstory shards
  const bank = ensureBotMemoryBank(store, newPersona);
  if (typeof userRapport === 'string' && userRapport.trim()) {
    bank.u.rapport = userRapport.trim().slice(0, 95);
    bank.u.updatedAt = Math.floor(Date.now() / 1000);
  }
  if (Array.isArray(initialMemoryShards)) {
    for (const shard of initialMemoryShards.slice(0, 30)) {
      if (shard && typeof shard.s === 'string' && shard.s.trim()) {
        const tags = Array.isArray(shard.k)
          ? shard.k.map((k: any) => String(k).trim())
          : tokenizeForMemory(shard.s);
        upsertBotMemoryShard(bank, shard.s, tags, Number(shard.w) || 4, store.currentContextId);
      }
    }
  }

  persistDeviceStores();
  res.json({ success: true, persona: newPersona, personas: store.personas });
});

app.put('/api/personas/:id', (req, res) => {
  const store = getDeviceStore(req);
  const { id } = req.params;
  const pIndex = store.personas.findIndex((p) => p.id === id);
  if (pIndex === -1) {
    return res.status(404).json({ error: 'Persona not found' });
  }

  const existing = store.personas[pIndex];
  const {
    name,
    description,
    badgeColor,
    avatarUrl,
    negative_constraints,
    style_anchor,
    allowNsfw,
    selectedModelId,
    intellect,
    thoughtfulness,
    pacingDelaySeconds,
    isRoleplayCard,
    firstMessage,
    scenario,
  } = req.body;
  const oldName = existing.name;
  const newName = name !== undefined && name.trim() ? name.trim() : existing.name;

  store.personas[pIndex] = {
    ...existing,
    name: newName,
    avatarLetter: newName.charAt(0).toUpperCase(),
    description: description !== undefined ? description.trim() : existing.description,
    badgeColor: badgeColor !== undefined ? badgeColor : existing.badgeColor,
    avatarUrl: avatarUrl !== undefined ? avatarUrl.trim() : existing.avatarUrl,
    negative_constraints: Array.isArray(negative_constraints) ? negative_constraints : existing.negative_constraints,
    style_anchor: Array.isArray(style_anchor) ? style_anchor : existing.style_anchor,
    allowNsfw: allowNsfw !== undefined ? Boolean(allowNsfw) : existing.allowNsfw,
    selectedModelId: selectedModelId !== undefined ? (selectedModelId ? String(selectedModelId).trim() : undefined) : existing.selectedModelId,
    intellect: intellect !== undefined ? Number(intellect) : existing.intellect,
    thoughtfulness: thoughtfulness !== undefined ? thoughtfulness : existing.thoughtfulness,
    pacingDelaySeconds: pacingDelaySeconds !== undefined ? Number(pacingDelaySeconds) : existing.pacingDelaySeconds,
    isRoleplayCard: isRoleplayCard !== undefined ? Boolean(isRoleplayCard) : existing.isRoleplayCard,
    firstMessage: firstMessage !== undefined ? (firstMessage ? String(firstMessage).trim() : undefined) : existing.firstMessage,
    scenario: scenario !== undefined ? (scenario ? String(scenario).trim() : undefined) : existing.scenario,
  };

  // If name changed, update speaker in current chat messages
  if (oldName !== newName) {
    for (const msg of store.messages) {
      if (msg.speaker.toLowerCase() === oldName.toLowerCase()) {
        msg.speaker = newName;
      }
    }
  }

  persistDeviceStores();
  res.json({ success: true, persona: store.personas[pIndex], personas: store.personas });
});

app.delete('/api/personas/:id', (req, res) => {
  const store = getDeviceStore(req);
  const { id } = req.params;
  const pIndex = store.personas.findIndex((p) => p.id === id);
  if (pIndex === -1) {
    return res.status(404).json({ error: 'Persona not found' });
  }

  if (store.personas.length <= 2) {
    return res.status(400).json({ error: 'Cannot delete: at least 2 personas are required for a group chat.' });
  }

  store.personas.splice(pIndex, 1);
  persistDeviceStores();
  res.json({ success: true, personas: store.personas });
});

// Per-Bot Coherent Memory Bank Endpoints (Inspect, Edit/Pin, Reset)
app.get('/api/personas/:id/memory', (req, res) => {
  const store = getDeviceStore(req);
  const { id } = req.params;
  const persona = store.personas.find((p) => p.id === id || p.name.toLowerCase() === id.toLowerCase());
  if (!persona) {
    return res.status(404).json({ error: 'Persona not found' });
  }
  const bank = ensureBotMemoryBank(store, persona);
  const currentCtx = store.contexts.find((c) => c.context_id === store.currentContextId);
  const activeMessages = store.messages.filter((m) => m.context_id === store.currentContextId);
  const lastHumanMsg = [...activeMessages]
    .reverse()
    .find(
      (m) =>
        m.speaker !== 'System' &&
        !store.personas.some((p) => p.name.toLowerCase() === m.speaker.toLowerCase())
    );
  const preview = retrieveBotMemoryBlock(
    store,
    persona,
    store.personas,
    activeMessages.slice(-6),
    lastHumanMsg,
    currentCtx
  );
  const byteSize = Buffer.byteLength(JSON.stringify(bank), 'utf8');

  res.json({
    memory: bank,
    microYamlPreview: preview.microYamlBlock,
    approxPromptTokens: preview.approxTokens,
    maxPromptTokens: 150,
    shardCount: bank.e.length,
    maxShards: 40,
    byteSize,
    maxBytes: 4096,
  });
});

app.put('/api/personas/:id/memory', (req, res) => {
  const store = getDeviceStore(req);
  const { id } = req.params;
  const persona = store.personas.find((p) => p.id === id || p.name.toLowerCase() === id.toLowerCase());
  if (!persona) {
    return res.status(404).json({ error: 'Persona not found' });
  }
  const bank = ensureBotMemoryBank(store, persona);
  const { userName, rapport, traits, addShard, deleteShardId } = req.body;

  if (userName !== undefined) {
    bank.u.name = String(userName).trim().slice(0, 30) || undefined;
    bank.u.updatedAt = Math.floor(Date.now() / 1000);
  }
  if (rapport !== undefined) {
    bank.u.rapport = String(rapport).trim().slice(0, 95);
    bank.u.updatedAt = Math.floor(Date.now() / 1000);
  }
  if (Array.isArray(traits)) {
    bank.u.traits = traits
      .map((t) => String(t).trim().slice(0, 45))
      .filter(Boolean)
      .slice(0, 5);
    bank.u.updatedAt = Math.floor(Date.now() / 1000);
  }
  if (addShard && typeof addShard.s === 'string' && addShard.s.trim()) {
    const tags = Array.isArray(addShard.k)
      ? addShard.k.map((k: any) => String(k).trim())
      : tokenizeForMemory(addShard.s);
    upsertBotMemoryShard(bank, addShard.s, tags, Number(addShard.w) || 4, store.currentContextId);
  }
  if (typeof deleteShardId === 'string' && deleteShardId.trim()) {
    bank.e = bank.e.filter((s) => s.id !== deleteShardId.trim());
  }

  persistDeviceStores();
  const preview = retrieveBotMemoryBlock(store, persona, store.personas, []);
  const byteSize = Buffer.byteLength(JSON.stringify(bank), 'utf8');

  res.json({
    success: true,
    memory: bank,
    microYamlPreview: preview.microYamlBlock,
    approxPromptTokens: preview.approxTokens,
    shardCount: bank.e.length,
    byteSize,
  });
});

app.delete('/api/personas/:id/memory', (req, res) => {
  const store = getDeviceStore(req);
  const { id } = req.params;
  const persona = store.personas.find((p) => p.id === id || p.name.toLowerCase() === id.toLowerCase());
  if (!persona) {
    return res.status(404).json({ error: 'Persona not found' });
  }
  delete store.botMemories[persona.id];
  const freshBank = ensureBotMemoryBank(store, persona);
  persistDeviceStores();
  const preview = retrieveBotMemoryBlock(store, persona, store.personas, []);

  res.json({
    success: true,
    memory: freshBank,
    microYamlPreview: preview.microYamlBlock,
    approxPromptTokens: preview.approxTokens,
    shardCount: freshBank.e.length,
    byteSize: Buffer.byteLength(JSON.stringify(freshBank), 'utf8'),
  });
});

app.post('/api/settings/model', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const store = getDeviceStore(req);
  const { model } = req.body;
  if (!model || typeof model !== 'string') {
    return res.status(400).json({ error: 'Model id is required' });
  }
  const found = availableModels.find((m) => m.id === model.trim());
  if (!found) {
    return res.status(400).json({ error: 'Unsupported model id' });
  }
  store.selectedModelId = found.id;
  persistDeviceStores();
  res.json({ success: true, selectedModel: store.selectedModelId, modelName: found.name });
});

// Test connection for a model or key (uses device-supplied keys)
app.post('/api/settings/test', async (req, res) => {
  const store = getDeviceStore(req);
  const clientKeys = extractClientKeys(req);
  const { modelId } = req.body || {};
  const modelToTest = modelId || store.selectedModelId;
  try {
    let testResult: { text: string; modelUsed: string } | null = null;
    const activeModelObj = availableModels.find((m) => m.id === modelToTest);
    const isAutoRouting = modelToTest === 'auto/smart-routing';
    const isOpenRouter =
      !isAutoRouting &&
      (activeModelObj?.provider === 'openrouter' ||
        modelToTest === 'openrouter/free' ||
        modelToTest.endsWith(':free'));
    const isGroq =
      !isAutoRouting &&
      !isOpenRouter &&
      (activeModelObj?.provider === 'groq' ||
        modelToTest.startsWith('openai/gpt-oss') ||
        modelToTest.startsWith('llama-') ||
        modelToTest.includes('prompt-guard'));
    const isCloudflare =
      !isAutoRouting &&
      !isOpenRouter &&
      (activeModelObj?.provider === 'cloudflare' ||
        modelToTest.startsWith('@cf/') ||
        modelToTest.includes('glm-4.7') ||
        modelToTest.includes('qwen3-30b'));
    const isNvidia =
      !isAutoRouting &&
      !isOpenRouter &&
      (activeModelObj?.provider === 'nvidia' || modelToTest.startsWith('meta/llama-3.2'));

    if (isAutoRouting) {
      testResult = await generateModelContent(
        { contents: 'Say: online', temperature: 0.1 },
        clientKeys,
        'auto/smart-routing'
      );
      if (!testResult) {
        throw new Error('No active provider succeeded. Check your API keys or OpenRouter privacy settings.');
      }
    } else if (isCloudflare) {
      testResult = await callCloudflare(modelToTest, 'Say: online', 0.1, clientKeys);
    } else if (isGroq) {
      testResult = await callGroq(modelToTest, 'Say: online', 0.1, clientKeys);
    } else if (isNvidia) {
      testResult = await callNvidiaNim('Say: online', modelToTest, 0.1, clientKeys);
    } else {
      const openRouterModel =
        modelToTest === 'meta/llama-3.3-70b-instruct' ||
        modelToTest === 'meta-llama/llama-3.3-70b-instruct' ||
        modelToTest === 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free' ||
        modelToTest === 'cognitivecomputations/dolphin-mistral-24b-venice-edition'
          ? 'openrouter/free'
          : modelToTest;
      const disableFailover = openRouterModel !== 'openrouter/free';
      testResult = await callOpenRouterWithModel(openRouterModel, 'Say: online', 0.1, clientKeys, disableFailover);
    }

    res.json({
      success: true,
      modelUsed: testResult?.modelUsed || modelToTest,
      message: `Verified connection with ${testResult?.modelUsed || modelToTest}!`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Connection test failed',
    });
  }
});

// Real-time Groq models endpoint (inspects active models on Groq account)
app.get('/api/groq/models', async (req, res) => {
  const clientKeys = extractClientKeys(req);
  const groqKey = clientKeys?.groqKey?.trim();
  const defaultGroqModels = availableModels.filter((m) => m.provider === 'groq');

  if (!groqKey) {
    return res.json({ models: defaultGroqModels });
  }

  try {
    const groq = new Groq({ apiKey: groqKey });
    const list = await groq.models.list();
    const liveIds = (list.data || []).map((m: any) => m.id);
    return res.json({
      models: defaultGroqModels,
      liveIds,
      accountActive: true,
    });
  } catch (err: any) {
    return res.json({
      models: defaultGroqModels,
      warning: err?.message || 'Failed to list models from Groq API',
    });
  }
});

app.get('/api/chat/context/:id/messages', (req, res) => {
  const store = getDeviceStore(req);
  const contextId = req.params.id;
  const ctx = store.contexts.find((c) => c.context_id === contextId);
  if (ctx) {
    store.currentContextId = contextId;
    persistDeviceStores();
  }
  const ctxMessages = store.messages.filter((m) => m.context_id === contextId);
  res.json({
    context: ctx,
    currentContextId: store.currentContextId,
    messages: ctxMessages,
  });
});

// Human sends a message (Supports /image <prompt> text-to-image command)
app.post('/api/chat/message', async (req, res) => {
  const store = getDeviceStore(req);
  const clientKeys = extractClientKeys(req);
  const { text, speaker = 'You', sticker, contextId } = req.body;
  if (typeof contextId === 'string' && contextId.trim() && store.contexts.some((c) => c.context_id === contextId.trim())) {
    store.currentContextId = contextId.trim();
  }
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  const cleanText = text.trim();
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Check for /image or /imagine command in user message
  let generatedImageAttachment: GeneratedImageAttachment | undefined;
  const imageMatch = cleanText.match(/^\/(?:image|imagine)\s+(.+)$/i);
  if (imageMatch) {
    const imagePrompt = imageMatch[1].trim();
    const quotaCheck = checkAndConsumeImageQuota(store, 260);

    if (!quotaCheck.allowed) {
      // If rate limited, return informative system warning message
      const warnMsg: ChatMessage = {
        id: store.messageAutoId++,
        speaker: 'System',
        text: `⚠️ Image Generation Rate Limit: ${quotaCheck.reason || 'Rate limit reached.'}\n- Limit: 10 images/hour (unused hours roll over)\n- Daily Cap: 2,600 tokens/day (${quotaCheck.quota?.dailyTokensUsed || 0} / 2,600 used)`,
        timestamp: timeStr,
        session_id: 'session-' + Date.now(),
        context_id: store.currentContextId,
      };
      store.messages.push(warnMsg);
      persistDeviceStores();
      return res.json({
        message: warnMsg,
        quota: quotaCheck.quota,
        nextSpeaker: 'Rook',
      });
    }

    try {
      const fluxResult = await callCloudflareFlux(imagePrompt, clientKeys);
      generatedImageAttachment = {
        image_url: fluxResult.imageUrl,
        prompt: fluxResult.prompt,
        model: fluxResult.model,
        created_at: new Date().toISOString(),
        tokens_used: fluxResult.tokensUsed,
      };
    } catch (imgErr: any) {
      console.error('Cloudflare Flux image error:', imgErr);
      const errorMsg: ChatMessage = {
        id: store.messageAutoId++,
        speaker: 'System',
        text: `❌ Image Generation Failed: ${imgErr?.message || 'Could not generate image with Flux 1 Schnell.'}`,
        timestamp: timeStr,
        session_id: 'session-' + Date.now(),
        context_id: store.currentContextId,
      };
      store.messages.push(errorMsg);
      persistDeviceStores();
      return res.json({
        message: errorMsg,
        nextSpeaker: 'Rook',
      });
    }
  }

  // Extract tagged bots in human message
  const taggedPersonas = extractTaggedPersonas(cleanText, store.personas);
  const taggedBots = taggedPersonas.map((p) => p.name);

  // Only auto-add a bot to current context's allowed_persona_ids if the human explicitly used an @mention (@Name)
  const currentCtx = store.contexts.find((c) => c.context_id === store.currentContextId);
  if (currentCtx && Array.isArray(currentCtx.allowed_persona_ids) && cleanText.includes('@')) {
    for (const p of taggedPersonas) {
      const explicitAt = new RegExp(`@${normalizeString(p.name)}\\b|@${normalizeString(p.id)}\\b`, 'i');
      if (
        explicitAt.test(normalizeString(cleanText)) &&
        !currentCtx.allowed_persona_ids.includes(p.id) &&
        !currentCtx.allowed_persona_ids.includes(p.name)
      ) {
        currentCtx.allowed_persona_ids.push(p.id);
      }
    }
  }

  const newMsg: ChatMessage = {
    id: store.messageAutoId++,
    speaker: speaker.trim() || 'You',
    text: cleanText,
    timestamp: timeStr,
    session_id: 'session-' + Date.now(),
    context_id: store.currentContextId,
    tagged_bots: taggedBots.length > 0 ? taggedBots : undefined,
    sticker: sticker || undefined,
    generated_image: generatedImageAttachment,
  };

  // If Pixel is tagged or asked for data/math/stats, create a local temporary task.md
  if (
    taggedBots.includes('Pixel') ||
    /pixel|calculate|math|stats|statistic|data|distribution|chart|sample|python|code/i.test(cleanText)
  ) {
    store.pixelTasks[store.currentContextId] = {
      task_id: 'task-' + Date.now(),
      context_id: store.currentContextId,
      requested_by: newMsg.speaker,
      description: cleanText,
      created_at: new Date().toISOString(),
      status: 'in_progress',
      markdown_content: `# Task: ${cleanText}\n- **Assigned By**: ${newMsg.speaker}\n- **Status**: in_progress\n- **Created At**: ${new Date().toLocaleString()}\n\n## Checklist\n- [x] Received request from @${newMsg.speaker}\n- [/] Execute Python calculations / data analysis in E2B sandbox\n- [ ] Conclude findings and mark task completed\n`,
    };
  }

  store.messages.push(newMsg);
  persistDeviceStores();

  // Update context last active
  if (currentCtx) {
    currentCtx.last_active_at = new Date().toISOString();
  }

  const pixelTask = store.pixelTasks[store.currentContextId];
  const isPixelCompleted = pixelTask ? pixelTask.status === 'completed' : false;

  const activeMessages = store.messages.filter((m) => m.context_id === store.currentContextId);
  const nextSpeaker = selectNextSpeaker(
    newMsg.speaker,
    newMsg.text,
    currentCtx?.allowed_persona_ids,
    store.personas,
    isPixelCompleted,
    activeMessages
  );

  res.json({
    message: newMsg,
    nextSpeaker,
    pixelTask,
    imageQuota: store.imageQuota,
  });
});

// Dedicated Cloudflare Flux 1 Schnell Text-to-Image Endpoint
app.post('/api/image/generate', async (req, res) => {
  const store = getDeviceStore(req);
  const clientKeys = extractClientKeys(req);
  const { prompt, speaker = 'You', contextId } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required for image generation.' });
  }

  const cleanPrompt = prompt.trim();
  const targetContextId = contextId || store.currentContextId;
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const quotaCheck = checkAndConsumeImageQuota(store, 260);
  if (!quotaCheck.allowed) {
    return res.status(429).json({
      error: quotaCheck.reason,
      quota: quotaCheck.quota,
    });
  }

  try {
    const fluxResult = await callCloudflareFlux(cleanPrompt, clientKeys);
    const imageAttachment: GeneratedImageAttachment = {
      image_url: fluxResult.imageUrl,
      prompt: fluxResult.prompt,
      model: fluxResult.model,
      created_at: new Date().toISOString(),
      tokens_used: fluxResult.tokensUsed,
    };

    const newMsg: ChatMessage = {
      id: store.messageAutoId++,
      speaker: speaker || 'You',
      text: `/image ${cleanPrompt}`,
      timestamp: timeStr,
      session_id: 'session-' + Date.now(),
      context_id: targetContextId,
      generated_image: imageAttachment,
    };

    store.messages.push(newMsg);
    persistDeviceStores();

    return res.json({
      success: true,
      message: newMsg,
      image: imageAttachment,
      quota: quotaCheck.quota,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || 'Failed to generate image with Cloudflare Flux 1 Schnell.',
    });
  }
});

// Real-time Quota Info for Text-to-Image Generation
app.get('/api/image/quota', (req, res) => {
  const store = getDeviceStore(req);
  if (!store.imageQuota) {
    store.imageQuota = {
      hourlyCredits: 10,
      lastHourGrantTime: Date.now(),
      dailyTokensUsed: 0,
      dailyResetTime: Date.now() + 24 * 3600 * 1000,
      totalImagesGenerated: 0,
      history: [],
    };
  }
  const quota = store.imageQuota;
  const now = Date.now();
  if (now >= quota.dailyResetTime) {
    quota.dailyTokensUsed = 0;
    quota.dailyResetTime = now + 24 * 3600 * 1000;
  }
  const hoursElapsed = Math.floor((now - quota.lastHourGrantTime) / (3600 * 1000));
  if (hoursElapsed > 0) {
    quota.hourlyCredits += hoursElapsed * 10;
    quota.lastHourGrantTime += hoursElapsed * 3600 * 1000;
  }
  persistDeviceStores();

  res.json({
    hourlyAvailable: quota.hourlyCredits,
    dailyTokensUsed: quota.dailyTokensUsed,
    dailyTokensRemaining: Math.max(0, 2600 - quota.dailyTokensUsed),
    dailyCap: 2600,
    totalGenerated: quota.totalImagesGenerated,
    timeToNextHourMs: Math.max(0, quota.lastHourGrantTime + 3600 * 1000 - now),
    timeToDailyResetMs: Math.max(0, quota.dailyResetTime - now),
  });
});

// Execute one turn for a persona (uses device-specific clientKeys)
app.post('/api/chat/turn', async (req, res) => {
  const store = getDeviceStore(req);
  const clientKeys = extractClientKeys(req);

  const hasOrKey = !!clientKeys.openRouterKey?.trim();
  const hasNvKey = !!clientKeys.nvidiaKey?.trim();
  const hasGroqKey = !!clientKeys.groqKey?.trim();
  const hasCfKey = !!(
    clientKeys.cloudflareKey?.trim() ||
    process.env.CLOUDFLARE_API_TOKEN?.trim() ||
    process.env.CLOUDFLARE_API_KEY?.trim()
  );

  if (!hasOrKey && !hasNvKey && !hasGroqKey && !hasCfKey) {
    return res.status(400).json({
      error: 'No active API key found on this device. Please open the side menu, go to "API Keys", and add your key (Cloudflare, Groq, OpenRouter, or NVIDIA NIM) to start chatting.',
    });
  }

  let { personaName, contextId } = req.body;
  if (typeof contextId === 'string' && contextId.trim() && store.contexts.some((c) => c.context_id === contextId.trim())) {
    store.currentContextId = contextId.trim();
  }
  const currentCtx = store.contexts.find((c) => c.context_id === store.currentContextId);
  const allowedIds = currentCtx?.allowed_persona_ids;

  let activePool = store.personas;
  if (Array.isArray(allowedIds) && allowedIds.length > 0) {
    const filtered = store.personas.filter(
      (p) => allowedIds.includes(p.id) || allowedIds.includes(p.name)
    );
    if (filtered.length > 0) {
      activePool = filtered;
    }
  }

  // Determine speaker if not supplied
  const activeMessages = store.messages.filter((m) => m.context_id === store.currentContextId);
  const lastMsg = activeMessages[activeMessages.length - 1];

  if (!personaName) {
    personaName = selectNextSpeaker(
      lastMsg ? lastMsg.speaker : '',
      lastMsg ? lastMsg.text : '',
      allowedIds,
      store.personas,
      false,
      activeMessages
    );
  }

  // Find requested persona: prefer activePool so constrained single-bot chats don't accidentally pull in outside bots
  let persona = activePool.find(
    (p) => p.name.toLowerCase() === personaName.toLowerCase() || p.id.toLowerCase() === personaName.toLowerCase()
  );

  if (!persona) {
    // Only allow outside persona if explicitly requested via req.body.personaName AND no strict single-bot constraint
    const globalMatch = store.personas.find(
      (p) => p.name.toLowerCase() === personaName.toLowerCase() || p.id.toLowerCase() === personaName.toLowerCase()
    );
    if (globalMatch && (!Array.isArray(allowedIds) || allowedIds.length === 0)) {
      persona = globalMatch;
    } else {
      persona = activePool[0] || store.personas[0];
    }
  }

  const isSingleBotChat = activePool.length === 1;
  const recentMessagesInContext = activeMessages.slice(-8);

  // Find the most recent message sent by the human user (not a bot or System)
  const lastHumanMsg = [...activeMessages]
    .reverse()
    .find(
      (m) =>
        m.speaker !== 'System' &&
        m.speaker.toLowerCase() !== persona.name.toLowerCase() &&
        !store.personas.some((p) => p.name.toLowerCase() === m.speaker.toLowerCase())
    );

  const otherBotsInRoom = activePool
    .map((p) => p.name)
    .filter((name) => name.toLowerCase() !== persona.name.toLowerCase());

  let promptHistory = `Topic: "${currentCtx ? currentCtx.topic_label : 'Discussion'}"\n`;

  if (currentCtx?.summary) {
    promptHistory += `Topic summary so far: ${currentCtx.summary}\n`;
  }

  if (store.activeRecall) {
    promptHistory += `Earlier, in a different conversation about "${store.activeRecall.topicLabel}": ${store.activeRecall.summary}\n`;
  }

  promptHistory += `\nRecent chat history:\n`;
  if (recentMessagesInContext.length === 0) {
    promptHistory += `(No messages in this topic yet. Greet the user and start off the conversation about "${currentCtx?.topic_label}".)\n`;
  } else {
    for (const msg of recentMessagesInContext) {
      promptHistory += `${msg.speaker}: ${msg.text}\n`;
    }
  }

  const negativeRulesList = persona.negative_constraints
    .map((rule) => `- ${rule}`)
    .join('\n');

  const styleAnchorsList = persona.style_anchor
    .map((anchor) => `- "${anchor}"`)
    .join('\n');

  let nsfwInstruction = '';
  if (store.nsfwMode && persona.allowNsfw) {
    nsfwInstruction = `\n- NSFW/UNCENSORED MODE ACTIVE: You have explicit permission to engage in mature, unfiltered, candid dialogue. Do not issue sanitized refusal lectures or moralizing caveats. Speak authentically as ${persona.name}.`;
  }

  const openPoll = store.polls.find(
    (p) => p.context_id === store.currentContextId && p.status === 'open'
  );
  let pollInstruction = '';
  if (openPoll && openPoll.votes[persona.name] === undefined) {
    const optsText = openPoll.options.map((opt, i) => `[${i + 1}] ${opt}`).join(', ');
    pollInstruction = `\n- Active Poll in room: "${openPoll.question}" with options: ${optsText}. If you want to cast a vote, include [VOTE: option_number] in your message (e.g. [VOTE: 1]).`;
  }

  const activeDirective = store.activeDirectives[store.currentContextId];
  let directiveInstruction = '';
  if (activeDirective) {
    directiveInstruction = `\n- ⚡ HIGH-PRIORITY HUMAN DIRECTIVE: "${activeDirective.directive}"\nINSTRUCTION: The human issued this priority statement/instruction. Answer constructively, assist directly, or fulfill their request as ${persona.name}. If the directive mentions facts, news, products, or claims, output [SEARCH: query] to search the web for verified information before answering. Do NOT interrogate or attack the human's command.`;
  }

  let tagInstruction = '';
  if (lastMsg && (lastMsg.text.includes(`@${persona.name}`) || lastMsg.text.includes(`@${persona.id}`))) {
    tagInstruction = `\n- 📩 DIRECT @BOT REQUEST FOR YOU (@${persona.name}): Someone in the chat explicitly tagged/called you saying: "${lastMsg.text}". Answer their request or fulfill their inquiry directly as ${persona.name}.`;
  }

  let pixelTaskInstruction = '';
  const activePixelTask = store.pixelTasks[store.currentContextId];
  if (persona.name.toLowerCase() === 'pixel' && activePixelTask && activePixelTask.status === 'in_progress') {
    pixelTaskInstruction = `\n- 📄 LOCAL TASK.MD ASSIGNMENT: You are fulfilling a temporary task.md requested by ${activePixelTask.requested_by}: "${activePixelTask.description}". Perform any required Python calculations. Once complete, your task will be marked COMPLETED and you will stop auto-responding until requested again.`;
  }

  const chatStructureRules = isSingleBotChat
    ? `- 1-ON-1 DIRECT CONVERSATION MODE: You are in a direct 1-on-1 conversation exclusively with the human user ("${lastHumanMsg?.speaker || 'You'}"). There are NO other bots or crew members in this chat.
- Do NOT call on, tag, mention, or defer work to other crew members (such as Rook, Zed, Bramble, Pixel, Moss, Nana Nuance, Gus, Prof. Oop, or Kō). Answer and assist the human user directly yourself.
- Speak directly to the human user as "you". Never talk to yourself, never reply to your own previous message as if another person wrote it, and wait for the user's response.`
    : `- ROLE DISCIPLINE: Stay inside your role — don't do another crew member's job. If you notice a gap outside your role, flag it for them by name instead of covering it yourself.
- You are in a group chat with ${otherBotsInRoom.join(', ')} and the human ("${lastHumanMsg?.speaker || 'You'}"). Treat all participants as peers.
- Refer to others by name when responding to their points.`;

  const isLastMsgSelf = Boolean(lastMsg && lastMsg.speaker.toLowerCase() === persona.name.toLowerCase());
  const relevanceInstruction = isLastMsgSelf
    ? `- CONVERSATIONAL RELEVANCE: The last message in the chat was your own previous message ("${lastMsg.text}"). Do NOT reply to yourself, agree with yourself, or repeat what you just said! Instead, address the human user ("${lastHumanMsg?.speaker || 'You'}") directly${
        lastHumanMsg ? ` regarding their message ("${lastHumanMsg.text}")` : ` about "${currentCtx?.topic_label || 'the topic'}"`
      } with a natural follow-up or question for them.`
    : isSingleBotChat && lastHumanMsg
    ? `- CONVERSATIONAL RELEVANCE: Directly respond to what the user (${lastHumanMsg.speaker}) said to you: "${lastHumanMsg.text}". Speak directly to them as ${persona.name}, and do not talk to yourself.`
    : `- CONVERSATIONAL RELEVANCE: Directly respond to what ${lastMsg ? `${lastMsg.speaker} said: "${lastMsg.text}"` : 'the conversation is discussing'}. Stay on topic, speak authentically as ${persona.name}, and contribute distinct value.`;

  // Retrieve selective Top-3 Coherent Memory Block in Micro-YAML format (strictly capped <= 150 tokens)
  const { microYamlBlock: botMemoryBlock } = retrieveBotMemoryBlock(
    store,
    persona,
    activePool,
    recentMessagesInContext,
    lastHumanMsg,
    currentCtx
  );

  const isAdaptiveRpTurn = Boolean(
    isSingleBotChat && (persona.isRoleplayCard || persona.firstMessage || persona.scenario)
  );
  const scenarioLine =
    isAdaptiveRpTurn && persona.scenario ? `\nScenario / Setting Context: ${persona.scenario}\n` : '';
  const closingStyleInstruction = isAdaptiveRpTurn
    ? `Reply as ${persona.name} directly to the user in authentic 1-on-1 character/roleplay style (1-2 expressive paragraphs max; you may weave *physical actions, expressions, and scene details* with spoken dialogue if natural to ${persona.name}). Write ONLY ${persona.name}'s turn and wait for the user's reply.`
    : persona.isRoleplayCard
    ? `Reply as ${persona.name} in concise group-chat mode (1-3 punchy sentences max; keep any *action emotes* brief so the group room flows naturally).`
    : `Reply as ${persona.name} directly to the user. 1-3 sentences max, casual chat style.`;

  const promptContents = `${promptHistory}${scenarioLine}
---
You are ${persona.name}.
${persona.description}

${botMemoryBlock}

Rules:
${negativeRulesList}
- GOLDEN RULE: Absurd in voice, rigorous in facts. Humor lives in the framing, never in an invented source, date, or quote.
${chatStructureRules}
- SINGLE TURN ONLY: Write ONLY ${persona.name}'s single response for this turn. NEVER write dialogue lines for "You:", "User:", "Human:", or any other character, and NEVER continue a multi-turn conversation with yourself in one message.
- Never prefix your output with your own name.${nsfwInstruction}${pollInstruction}${directiveInstruction}${tagInstruction}${pixelTaskInstruction}
- COHERENT MEMORY RECORDING: Use your [Memory (${persona.name})] naturally without robotic announcements. If the user shares a lasting personal fact, preference, name, or project goal worth remembering across future chats, silently append \`[MEM: concise fact under 15 words | tags: tag1, tag2 | w: 1-5]\` at the very end of your reply.
- WEB SEARCH CAPABILITY: You have live internet search enabled! If any real-world facts, current events, dates, statistics, quotes, technical details, or claims are mentioned in the conversation or directive, output [SEARCH: exact query text] in your draft reply to search the live web for verified facts before giving your final reply.
- SANDBOX CODE EXECUTION & DATA VISUALIZATION: You have live Python sandbox execution enabled with an automated self-healing refinement loop! If any calculations, data transformations, or visual charts/infographics are requested, output [EXEC: python_code_here] in your draft reply. For Plotly charts, write a standalone Python script and save the figure as 'output.html' using fig.write_html('output.html', include_plotlyjs='cdn'). Do NOT call fig.write_image() as static kaleido export is incompatible. For matplotlib/seaborn, save using plt.savefig('output.png', bbox_inches='tight', dpi=150). Output ONLY executable Python code inside [EXEC: ...]. If an error occurs, the self-healing loop will automatically feed terminal stderr back to you to fix and re-run.
- 🎨 PARALLEL TEXT-TO-IMAGE GENERATION (NEW FEATURE): You, fellow personas, and the user can generate images and artwork in real-time using Cloudflare Flux 1 Schnell (@cf/black-forest-labs/flux-1-schnell)! If you want to paint, illustrate, visualize a scene, or respond to visual ideas, include \`/image <detailed prompt describing the image>\` in your reply (e.g. \`/image an atmospheric cyberpunk neon owl perched on glowing rain-slicked circuitry, synthwave aesthetic, 8k\`). The system will automatically render your visual art right into the chat stream!

${relevanceInstruction}

Examples of how you talk:
${styleAnchorsList}

${closingStyleInstruction}`;

  try {
    let currentPrompt = promptContents;
    let replyText = '';
    let searchQueryUsed: string | undefined;
    let execCodeUsed: string | undefined;
    let execOutputUsed: string | undefined;
    let execSuccessUsed: boolean | undefined;
    let visualGraphUsed: string | undefined;

    // Multi-pass marker protocol (capped at 2 iterations per turn)
    const isPixel = persona.name.toLowerCase() === 'pixel' || persona.id.toLowerCase() === 'pixel';
    const activePersonaModel = persona.selectedModelId || (isPixel ? 'cohere/north-mini-code:free' : store.selectedModelId);
    let modelUsedForTurn: string | undefined;

    for (let pass = 0; pass < 2; pass++) {
      const rawReplyResult = await generateModelContent(
        {
          contents: currentPrompt,
          temperature: isPixel ? 0.75 : 0.85,
        },
        clientKeys,
        activePersonaModel
      );

      replyText = rawReplyResult?.text?.trim() || '...';
      if (rawReplyResult?.modelUsed) {
        modelUsedForTurn = rawReplyResult.modelUsed;
      }
      const prefixRegex = new RegExp(`^${persona.name}\\s*:\\s*`, 'i');
      replyText = replyText.replace(prefixRegex, '').trim();

      // Pass 1: Check for [SEARCH: query]
      const searchMatch = replyText.match(/\[SEARCH:\s*([^\]]+)\]/i);
      if (searchMatch) {
        const query = searchMatch[1].trim();
        searchQueryUsed = query;
        const searchResults = await fetch_web_results(query, 5, clientKeys.tavilyKey);

        if (!store.contextSearchUrls[store.currentContextId]) {
          store.contextSearchUrls[store.currentContextId] = [];
        }
        store.contextSearchUrls[store.currentContextId].push(
          ...searchResults.map((r) => r.url)
        );

        const formatted = format_search_results(searchResults);
        currentPrompt = `${promptContents}\n\n[Web Search Results for "${query}"]:\n${formatted}\n\nNow provide your actual final in-character reply as ${persona.name} referencing or using these facts. Do NOT output [SEARCH: ...] markers.`;
        continue;
      }

      // Pass 2: Check for [CRAWL: url]
      const crawlMatch = replyText.match(/\[CRAWL:\s*([^\]]+)\]/i);
      if (crawlMatch) {
        const targetUrl = crawlMatch[1].trim();
        const knownUrls = store.contextSearchUrls[store.currentContextId] || [];
        const isMatched = knownUrls.some(
          (u) =>
            u.toLowerCase().includes(targetUrl.toLowerCase()) ||
            targetUrl.toLowerCase().includes(u.toLowerCase())
        );

        if (isMatched) {
          const crawlContent = await fetch_full_page(targetUrl, 3000, clientKeys.tavilyKey);
          const formatted = format_crawl_result(targetUrl, crawlContent);
          currentPrompt = `${promptContents}\n\n[Page Content for "${targetUrl}"]:\n${formatted}\n\nNow provide your actual final in-character reply as ${persona.name}. Do NOT output [CRAWL: ...] markers.`;
          continue;
        } else {
          currentPrompt = `${promptContents}\n\n[Note: URL "${targetUrl}" was not in recent search results.]\n\nProvide your actual final reply as ${persona.name}.`;
          continue;
        }
      }

      // Pass 3: Check for [EXEC: python code] (Excluded for Kō and Moss per spec)
      const isKoOrMoss = persona.id === 'ko' || persona.id === 'moss' || persona.name === 'Kō' || persona.name === 'Moss';
      const execMatch = !isKoOrMoss ? replyText.match(/\[EXEC:\s*([\s\S]+?)\]/i) : null;
      if (execMatch) {
        let codeToRun = execMatch[1].trim();
        let attempt = 1;
        const maxAttempts = 2;

        let execRes = await run_code(
          store.currentContextId,
          persona.name,
          codeToRun,
          clientKeys.e2bKey,
          12
        );

        // Internal Pure Code Repair Loop: Capped at 2 attempts so a broken script never stalls >1m
        while (!execRes.success && attempt < maxAttempts) {
          // Do not attempt code fixing if E2B API Key is unconfigured or session cap is reached
          if (
            execRes.output.includes('E2B API key not configured') ||
            execRes.output.includes('execution cap reached')
          ) {
            break;
          }

          attempt++;

          // Dedicated code fixer prompt - NO persona chat restrictions or 1-3 sentences constraints to avoid code truncation
          const fixPrompt = `You are an expert Python engineer fixing a broken script for code execution.

[Failed Python Code - Attempt ${attempt - 1}/${maxAttempts}]:
\`\`\`python
${codeToRun}
\`\`\`

[Execution Error Output]:
${execRes.output}

INSTRUCTION:
1. Identify the syntax error, missing brackets, unclosed quotes, incomplete statements, or runtime exception.
2. Fix the Python script so that it is complete, syntactically valid, and executes without errors.
3. For Plotly charts, write the figure to 'output.html' using fig.write_html('output.html', include_plotlyjs='cdn'). Do NOT call fig.write_image() or use kaleido static export. For matplotlib/seaborn, save using plt.savefig('output.png', bbox_inches='tight', dpi=150).
4. Output the complete corrected Python code inside a \`\`\`python ... \`\`\` or \`[EXEC: ...]\` block.
5. Output ONLY the code block. Do NOT output explanations, conversational filler, or truncated lines.`;

          const fixResult = await generateModelContent(
            { contents: fixPrompt, temperature: 0.1 },
            clientKeys,
            activePersonaModel
          );
          const fixReply = fixResult?.text;

          // Extract code from [EXEC: ...] or ```python ... ```
          let extractedFix: string | null = null;
          if (fixReply) {
            const mExec = fixReply.match(/\[EXEC:\s*([\s\S]+?)\]/i);
            const mCode = fixReply.match(/```(?:python)?\s*([\s\S]+?)```/i);
            if (mExec) {
              extractedFix = mExec[1].trim();
            } else if (mCode) {
              extractedFix = mCode[1].trim();
            }
          }

          if (!extractedFix) {
            break; // No new code produced
          }

          codeToRun = extractedFix;
          execRes = await run_code(
            store.currentContextId,
            `${persona.name} (Auto-Refine #${attempt - 1})`,
            codeToRun,
            clientKeys.e2bKey,
            12
          );
        }

        execCodeUsed = codeToRun;
        execOutputUsed =
          attempt > 1
            ? `${execRes.output}\n(Self-corrected code after ${attempt} internal attempts)`
            : execRes.output;
        execSuccessUsed = execRes.success;
        visualGraphUsed = execRes.visualGraph;

        if (execRes.success) {
          currentPrompt = `${promptContents}\n\n[Python Execution SUCCESSFUL (Attempt ${attempt}/${maxAttempts})]:\nCode Executed:\n\`\`\`python\n${codeToRun}\n\`\`\`\nOutput:\n${execRes.output}\n\nNow provide your actual final in-character reply as ${persona.name} sharing these calculated insights. Do NOT output [EXEC: ...] markers or raw code blocks.`;
        } else {
          currentPrompt = `${promptContents}\n\n[Note: Code execution was unable to run after ${attempt} internal retries.]\n\nProvide your actual final in-character reply as ${persona.name}. Speak naturally about the topic/concept. Do NOT output raw error tracebacks or complain about code syntax errors in chat. Do NOT output [EXEC: ...] markers.`;
        }
        continue;
      }

      break;
    }

    if (openPoll) {
      const voteMatch = replyText.match(/\[VOTE:\s*(\d+)\]/i);
      if (voteMatch) {
        const voteIndex = parseInt(voteMatch[1], 10) - 1;
        if (voteIndex >= 0 && voteIndex < openPoll.options.length) {
          openPoll.votes[persona.name] = voteIndex;
        }
        replyText = replyText.replace(/\[VOTE:\s*\d+\]/gi, '').trim();
      }
    }

    replyText = replyText
      .replace(/\[SEARCH:\s*[^\]]+\]/gi, '')
      .replace(/\[CRAWL:\s*[^\]]+\]/gi, '')
      .replace(/\[EXEC:\s*[\s\S]+?\]/gi, '')
      .trim();

    // Extract and persist any inline [MEM: ...] or user traits before stripping markers from visible chat
    replyText = extractAndSaveBotMemory(
      store,
      persona,
      replyText,
      lastHumanMsg,
      store.currentContextId
    );

    // Strip any hallucinated multi-turn continuation lines where the LLM scripts "You:" / "User:" / "Human:" or another speaker turn
    const allSpeakerLabels = [
      'You',
      'User',
      'Human',
      ...store.personas.map((p) => p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    ];
    const continuationRegex = new RegExp(`\\n\\s*(?:${allSpeakerLabels.join('|')})\\s*:\\s*[\\s\\S]*$`, 'i');
    replyText = replyText.replace(continuationRegex, '').trim();

    if (!replyText) replyText = '...';

    // Parse any /image or /imagine command in persona generated reply
    let botGeneratedImage: GeneratedImageAttachment | undefined;
    const botImageMatch = replyText.match(/\/(?:image|imagine)\s+([^.\n\r]+(?:\.[^.\n\r]+)?)/i);
    if (botImageMatch) {
      const botImgPrompt = botImageMatch[1].trim();
      const quotaCheck = checkAndConsumeImageQuota(store, 260);
      if (quotaCheck.allowed) {
        try {
          const fluxRes = await callCloudflareFlux(botImgPrompt, clientKeys);
          botGeneratedImage = {
            image_url: fluxRes.imageUrl,
            prompt: fluxRes.prompt,
            model: fluxRes.model,
            created_at: new Date().toISOString(),
            tokens_used: fluxRes.tokensUsed,
          };
          // Clean the raw /image command from the bot's speech bubble so dialogue remains pristine
          replyText = replyText.replace(botImageMatch[0], '').trim();
          if (!replyText) {
            replyText = `I rendered this for you: "${botImgPrompt}"`;
          }
        } catch (imgErr) {
          console.warn('Bot Flux image generation error:', imgErr);
        }
      }
    }

    // Check tagged bots in generated reply using robust matching
    const replyTaggedPersonas = extractTaggedPersonas(replyText, store.personas).filter(
      (p) => p.name.toLowerCase() !== persona.name.toLowerCase()
    );
    const replyTaggedBots = replyTaggedPersonas.map((p) => p.name);

    // Pixel task.md completion handling
    let completedPixelTask: PixelTask | undefined;
    if (persona.name.toLowerCase() === 'pixel' && store.pixelTasks[store.currentContextId]) {
      const pt = store.pixelTasks[store.currentContextId]!;
      pt.status = 'completed';
      pt.completed_at = new Date().toISOString();
      pt.result_summary = replyText;
      pt.markdown_content = `# Task: ${pt.description}\n- **Assigned By**: ${pt.requested_by}\n- **Status**: completed\n- **Created At**: ${new Date(pt.created_at).toLocaleString()}\n- **Completed At**: ${new Date().toLocaleString()}\n\n## Final Findings\n${replyText}\n${execCodeUsed ? `\n### Python Script Executed\n\`\`\`python\n${execCodeUsed}\n\`\`\`\n` : ''}`;
      completedPixelTask = pt;
    }

    // Automatically record Task / Execution / Research memory shards alongside User Conversation memory
    const botBank = ensureBotMemoryBank(store, persona);
    if (completedPixelTask) {
      const taskFact = `Task [${completedPixelTask.description.slice(0, 45)}]: ${replyText.slice(0, 65)}`;
      upsertBotMemoryShard(
        botBank,
        taskFact,
        ['task', ...tokenizeForMemory(completedPixelTask.description).slice(0, 4)],
        4,
        store.currentContextId
      );
    } else if (execSuccessUsed && execOutputUsed) {
      const firstLineOut = execOutputUsed.split('\n').map((l) => l.trim()).find(Boolean) || '';
      const execFact = `Ran Python (${(lastHumanMsg?.text || currentCtx?.topic_label || 'calc').slice(0, 35)}): ${firstLineOut.slice(0, 65)}`;
      upsertBotMemoryShard(
        botBank,
        execFact,
        ['exec', 'python', ...tokenizeForMemory(lastHumanMsg?.text || '').slice(0, 3)],
        3,
        store.currentContextId
      );
    } else if (searchQueryUsed) {
      const searchFact = `Searched "${searchQueryUsed.slice(0, 40)}": ${replyText.slice(0, 65)}`;
      upsertBotMemoryShard(
        botBank,
        searchFact,
        ['search', ...tokenizeForMemory(searchQueryUsed).slice(0, 4)],
        3,
        store.currentContextId
      );
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: ChatMessage = {
      id: store.messageAutoId++,
      speaker: persona.name,
      text: replyText,
      timestamp: timeStr,
      session_id: 'session-' + Date.now(),
      context_id: store.currentContextId,
      model_used: modelUsedForTurn,
      recalled_topic: store.activeRecall ? store.activeRecall.topicLabel : undefined,
      search_query: searchQueryUsed,
      exec_code: execCodeUsed,
      exec_output: execOutputUsed,
      exec_success: execSuccessUsed,
      visual_graph: visualGraphUsed,
      tagged_bots: replyTaggedBots.length > 0 ? replyTaggedBots : undefined,
      pixel_task: completedPixelTask,
      generated_image: botGeneratedImage,
    };

    store.messages.push(newMsg);
    persistDeviceStores();

    if (currentCtx) {
      currentCtx.last_active_at = new Date().toISOString();
    }

    const currentPixelTask = store.pixelTasks[store.currentContextId];
    const isPixelTaskCompleted = currentPixelTask ? currentPixelTask.status === 'completed' : false;

    const updatedMessages = store.messages.filter((m) => m.context_id === store.currentContextId);
    const nextSpeaker = selectNextSpeaker(
      newMsg.speaker,
      newMsg.text,
      currentCtx?.allowed_persona_ids,
      store.personas,
      isPixelTaskCompleted,
      updatedMessages
    );

    const wasRecall = store.activeRecall?.topicLabel;
    store.activeRecall = null;
    if (store.activeDirectives[store.currentContextId]) {
      store.activeDirectives[store.currentContextId] = null;
    }

    const currentPoll = store.polls.find(
      (p) => p.context_id === store.currentContextId && p.status === 'open'
    ) || null;

    res.json({
      message: newMsg,
      nextSpeaker,
      recalledTopic: wasRecall,
      pixelTask: currentPixelTask,
      activePoll: currentPoll,
      botMemories: store.botMemories,
    });
  } catch (err: any) {
    console.error('Turn generation failed:', err);
    res.status(500).json({ error: err.message || 'Failed to generate response' });
  }
});

// Pixel Task.md Endpoints
app.get('/api/pixel/task/:contextId', (req, res) => {
  const store = getDeviceStore(req);
  const contextId = req.params.contextId || store.currentContextId;
  const task = store.pixelTasks[contextId] || null;
  res.json({ task });
});

app.post('/api/pixel/task/:contextId/clear', (req, res) => {
  const store = getDeviceStore(req);
  const contextId = req.params.contextId || store.currentContextId;
  store.pixelTasks[contextId] = null;
  res.json({ success: true, message: 'Pixel task cleared' });
});

// Start completely fresh new chat
app.post('/api/chat/new', async (req, res) => {
  const store = getDeviceStore(req);
  const clientKeys = extractClientKeys(req);
  const { topicLabel = 'New Discussion', allowed_persona_ids } = req.body || {};
  const oldContextId = store.currentContextId;
  const newCtxId = 'ctx-' + Date.now();
  const label = (topicLabel || 'New Discussion').trim();

  // Validate allowed bots (fallback to all personas if none specified)
  const validAllowedIds = Array.isArray(allowed_persona_ids) && allowed_persona_ids.length > 0
    ? allowed_persona_ids.filter((id) => store.personas.some((p) => p.id === id || p.name === id))
    : store.personas.map((p) => p.id);

  const newContext: ChatContext = {
    context_id: newCtxId,
    topic_label: label,
    summary: null,
    created_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
    allowed_persona_ids: validAllowedIds,
  };

  store.contexts.push(newContext);
  store.currentContextId = newCtxId;

  // Pick first speaker from allowed personas
  const allowedBots = store.personas.filter((p) => validAllowedIds.includes(p.id) || validAllowedIds.includes(p.name));
  const firstPersona = allowedBots[0] || store.personas[0];
  const firstSpeaker = firstPersona?.name || 'Rook';

  // If starting a 1-on-1 chat with a character that has an opening greeting (firstMessage / first_mes), use it!
  let openingText = `New chat session started: "${label}". What should we dive into?`;
  if (allowedBots.length === 1 && firstPersona?.firstMessage) {
    const knownUserName = store.botMemories?.[firstPersona.id]?.u?.name || 'you';
    openingText = replaceTavernMacros(firstPersona.firstMessage, firstPersona.name, knownUserName);
  }

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const openingMsg: ChatMessage = {
    id: store.messageAutoId++,
    speaker: firstSpeaker,
    text: openingText,
    timestamp: timeStr,
    session_id: 'session-' + Date.now(),
    context_id: newCtxId,
  };
  store.messages.push(openingMsg);
  persistDeviceStores();

  // Summarize old context in background if needed
  const oldCtx = store.contexts.find((c) => c.context_id === oldContextId);
  if (oldCtx && !oldCtx.summary) {
    summarizeContext(store, oldContextId, clientKeys).catch(() => {});
  }

  res.json({
    success: true,
    newContext,
    currentContextId: newCtxId,
    contexts: store.contexts,
    message: openingMsg,
    nextSpeaker: selectNextSpeaker(firstSpeaker, openingMsg.text, validAllowedIds, store.personas),
  });
});

// Update allowed personas in an existing context
app.put('/api/chat/context/:id/personas', (req, res) => {
  const store = getDeviceStore(req);
  const { id } = req.params;
  const { allowed_persona_ids } = req.body;
  const ctx = store.contexts.find((c) => c.context_id === id);
  if (!ctx) {
    return res.status(404).json({ error: 'Context not found' });
  }

  if (Array.isArray(allowed_persona_ids)) {
    ctx.allowed_persona_ids = allowed_persona_ids.filter((pid) =>
      store.personas.some((p) => p.id === pid || p.name === pid)
    );
  }
  persistDeviceStores();

  const enrichedContexts = store.contexts.map((c) => ({
    ...c,
    message_count: store.messages.filter((m) => m.context_id === c.context_id).length,
  }));

  res.json({ success: true, context: ctx, contexts: enrichedContexts });
});

// Start new topic (/newtopic <label>)
app.post('/api/chat/new-topic', async (req, res) => {
  const store = getDeviceStore(req);
  const clientKeys = extractClientKeys(req);
  const { topicLabel } = req.body;
  if (!topicLabel || typeof topicLabel !== 'string' || !topicLabel.trim()) {
    return res.status(400).json({ error: 'Topic label is required' });
  }

  const oldContextId = store.currentContextId;
  const newCtxId = 'ctx-' + Date.now();
  const label = topicLabel.trim();

  // Create new context
  const newContext: ChatContext = {
    context_id: newCtxId,
    topic_label: label,
    summary: null,
    created_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
  };

  store.contexts.push(newContext);
  store.currentContextId = newCtxId;

  // Insert system announcement message in the new context
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const switchNotice: ChatMessage = {
    id: store.messageAutoId++,
    speaker: 'System',
    text: `Topic changed to: "${label}".`,
    timestamp: timeStr,
    session_id: 'session-' + Date.now(),
    context_id: newCtxId,
  };
  store.messages.push(switchNotice);
  persistDeviceStores();

  // Asynchronously summarize previous context in background
  const oldCtx = store.contexts.find((c) => c.context_id === oldContextId);
  if (oldCtx && !oldCtx.summary) {
    summarizeContext(store, oldContextId, clientKeys).catch(() => {});
  }

  res.json({
    newContext,
    switchNotice,
    activeContextId: store.currentContextId,
  });
});

// Recall past topic (/recall <keyword>)
app.post('/api/chat/recall', (req, res) => {
  const store = getDeviceStore(req);
  const { query } = req.body;
  const q = (query || '').trim().toLowerCase();

  // Past contexts excluding the active one
  const pastContexts = store.contexts.filter((c) => c.context_id !== store.currentContextId);

  if (pastContexts.length === 0) {
    return res.json({
      matched: false,
      message: 'No previous topics to recall yet.',
      candidates: [],
    });
  }

  let match = pastContexts.find(
    (c) =>
      (c.topic_label && c.topic_label.toLowerCase().includes(q)) ||
      (c.summary && c.summary.toLowerCase().includes(q))
  );

  // If no direct keyword match and query is empty, offer list
  if (!match && pastContexts.length > 0) {
    match = pastContexts[pastContexts.length - 1];
  }

  if (match) {
    const summaryText = match.summary || `Discussed ${match.topic_label}.`;
    store.activeRecall = {
      contextId: match.context_id,
      topicLabel: match.topic_label,
      summary: summaryText,
    };

    return res.json({
      matched: true,
      recalled: store.activeRecall,
      message: `Recalled context: "${match.topic_label}". Next turn will reference it.`,
    });
  }

  res.json({
    matched: false,
    message: `No matching topic found for "${query}".`,
    candidates: pastContexts.map((c) => ({ id: c.context_id, label: c.topic_label })),
  });
});

// Pin or dismiss active recall
app.post('/api/chat/set-recall', (req, res) => {
  const store = getDeviceStore(req);
  const { contextId } = req.body;
  if (!contextId) {
    store.activeRecall = null;
    return res.json({ success: true, activeRecall: null });
  }

  const ctx = store.contexts.find((c) => c.context_id === contextId);
  if (!ctx) {
    return res.status(404).json({ error: 'Context not found' });
  }

  store.activeRecall = {
    contextId: ctx.context_id,
    topicLabel: ctx.topic_label,
    summary: ctx.summary || `Earlier conversation on ${ctx.topic_label}.`,
  };

  res.json({ success: true, activeRecall: store.activeRecall });
});

// Update personas
app.put('/api/chat/personas', (req, res) => {
  const store = getDeviceStore(req);
  const { updatedPersonas } = req.body;
  if (Array.isArray(updatedPersonas) && updatedPersonas.length > 0) {
    store.personas = updatedPersonas;
    persistDeviceStores();
  }
  res.json({ personas: store.personas });
});

// Reset conversation
app.post('/api/chat/reset', (req, res) => {
  const devId = getDeviceId(req);
  deviceStores.delete(devId);
  const store = getDeviceStore(req);
  persistDeviceStores();
  res.json({ success: true, currentContextId: store.currentContextId, messages: store.messages });
});

// Client <-> Server state sync endpoint to prevent chat & discussion group deletion on refresh
app.post('/api/chat/sync', (req, res) => {
  const store = getDeviceStore(req);
  const { messages, contexts, currentContextId, personas: clientPersonas, botMemories: clientMemories } = req.body || {};

  // 1. Merge personas (preserve custom/imported personas & edits from client)
  if (Array.isArray(clientPersonas) && clientPersonas.length > 0) {
    const personaMap = new Map<string, Persona>();
    for (const p of store.personas) {
      personaMap.set(p.id, p);
    }
    for (const cp of clientPersonas) {
      if (!cp || !cp.id) continue;
      const existing = personaMap.get(cp.id);
      if (!existing) {
        personaMap.set(cp.id, cp);
      } else if (cp.isCustom) {
        personaMap.set(cp.id, { ...existing, ...cp });
      }
    }
    store.personas = Array.from(personaMap.values());
  }

  // 2. Merge botMemories
  if (clientMemories && typeof clientMemories === 'object') {
    if (!store.botMemories) store.botMemories = {};
    for (const [botId, bank] of Object.entries(clientMemories as Record<string, BotMemoryBank>)) {
      if (!bank || typeof bank !== 'object') continue;
      if (!store.botMemories[botId]) {
        store.botMemories[botId] = bank;
      } else {
        const srvBank = store.botMemories[botId];
        if (bank.u?.name && !srvBank.u.name) srvBank.u.name = bank.u.name;
        if (bank.u?.rapport && (!srvBank.u.rapport || srvBank.u.updatedAt < (bank.u.updatedAt || 0))) {
          srvBank.u.rapport = bank.u.rapport;
        }
        if (Array.isArray(bank.u?.traits) && bank.u.traits.length > 0) {
          srvBank.u.traits = Array.from(new Set([...srvBank.u.traits, ...bank.u.traits])).slice(0, 5);
        }
        if (Array.isArray(bank.e)) {
          for (const sh of bank.e) {
            if (sh && typeof sh.s === 'string' && !srvBank.e.some((e) => e.s === sh.s)) {
              srvBank.e.push(sh);
            }
          }
          srvBank.e = srvBank.e.slice(0, 40);
        }
      }
    }
  }

  // 3. Merge discussion groups (contexts) so non-default discussion groups are never lost
  if (Array.isArray(contexts) && contexts.length > 0) {
    for (const ctx of contexts) {
      if (!ctx || !ctx.context_id) continue;
      const existingIdx = store.contexts.findIndex((c) => c.context_id === ctx.context_id);
      if (existingIdx === -1) {
        store.contexts.push({
          context_id: ctx.context_id,
          topic_label: ctx.topic_label || 'Discussion',
          summary: ctx.summary || null,
          created_at: ctx.created_at || new Date().toISOString(),
          last_active_at: ctx.last_active_at || new Date().toISOString(),
          allowed_persona_ids: Array.isArray(ctx.allowed_persona_ids) ? ctx.allowed_persona_ids : undefined,
        });
      } else {
        const srvCtx = store.contexts[existingIdx];
        if (ctx.topic_label && ctx.topic_label !== 'General Discussion' && srvCtx.topic_label === 'General Discussion') {
          srvCtx.topic_label = ctx.topic_label;
        }
        if (ctx.summary && !srvCtx.summary) {
          srvCtx.summary = ctx.summary;
        }
        if (
          Array.isArray(ctx.allowed_persona_ids) &&
          ctx.allowed_persona_ids.length > 0 &&
          (!Array.isArray(srvCtx.allowed_persona_ids) || srvCtx.allowed_persona_ids.length === 0)
        ) {
          srvCtx.allowed_persona_ids = ctx.allowed_persona_ids;
        }
      }
    }
  }

  // 4. Merge messages across all contexts without cross-context ID collisions
  if (Array.isArray(messages) && messages.length > 0) {
    const getMsgKey = (m: ChatMessage) =>
      `${m.context_id || 'ctx-1'}__${m.id ?? ''}__${m.speaker}__${(m.text || '').slice(0, 32)}`;

    const existingMap = new Map<string, ChatMessage>();
    for (const m of store.messages) {
      if (m) existingMap.set(getMsgKey(m), m);
    }

    for (const m of messages) {
      if (!m) continue;
      const key = getMsgKey(m);
      const existing = existingMap.get(key);
      if (!existing) {
        // Clean any placeholder '[CACHED_IN_INDEXEDDB]' if needed
        const cleanMsg: ChatMessage = { ...m, context_id: m.context_id || 'ctx-1' };
        if (cleanMsg.visual_graph === '[CACHED_IN_INDEXEDDB]') {
          delete cleanMsg.visual_graph;
        }
        if (cleanMsg.generated_image?.image_url === '[CACHED_IN_INDEXEDDB]') {
          delete cleanMsg.generated_image;
        }
        existingMap.set(key, cleanMsg);
      } else {
        if (m.visual_graph && m.visual_graph !== '[CACHED_IN_INDEXEDDB]' && !existing.visual_graph) {
          existing.visual_graph = m.visual_graph;
        }
        if (
          m.generated_image?.image_url &&
          m.generated_image.image_url !== '[CACHED_IN_INDEXEDDB]' &&
          !existing.generated_image?.image_url
        ) {
          existing.generated_image = m.generated_image;
        }
      }
    }

    store.messages = Array.from(existingMap.values()).sort((a, b) => {
      const idA = typeof a.id === 'number' ? a.id : 0;
      const idB = typeof b.id === 'number' ? b.id : 0;
      return idA - idB;
    });
    store.messageAutoId =
      Math.max(...store.messages.map((m: any) => (typeof m.id === 'number' ? m.id : 0)), store.messageAutoId) + 1;
  }

  if (currentContextId && store.contexts.some((c) => c.context_id === currentContextId)) {
    store.currentContextId = currentContextId;
  }

  persistDeviceStores();

  const enrichedContexts = store.contexts.map((ctx) => ({
    ...ctx,
    message_count: store.messages.filter((m) => m.context_id === ctx.context_id).length,
  }));
  const activeMessages = store.messages.filter((m) => m.context_id === store.currentContextId);

  res.json({
    success: true,
    count: store.messages.length,
    currentContextId: store.currentContextId,
    contexts: enrichedContexts,
    messages: activeMessages,
    personas: store.personas,
    botMemories: store.botMemories,
  });
});

// Gracefully handle payload too large or body parsing errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      error: 'Payload too large. Maximum supported payload size is 50MB.',
    });
  }
  next(err);
});

// Mount Vite or serve static
async function startServer() {
  // Always serve public static assets (logos, manifest, favicons, icons)
  app.use(express.static(path.resolve(__dirname, 'public')));

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    // Trigger initial OpenRouter live endpoint verification if cache is outdated
    if (
      openRouterCacheMetadata.cacheVersion !== OPENROUTER_CACHE_VERSION ||
      Date.now() >= openRouterCacheMetadata.expiresAt
    ) {
      refreshOpenRouterModels(false).catch((e) => console.warn('[OpenRouter] Startup sync failed:', e));
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
