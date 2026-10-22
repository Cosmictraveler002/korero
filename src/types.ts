export type EvidenceStatus = 'verified' | 'disputed' | 'unverified' | 'refuted';

export type ResearchState =
  | 'idle'
  | 'scrolling'
  | 'reading'
  | 'found'
  | 'eureka'
  | 'doubt'
  | 'rabbithole'
  | 'debating'
  | 'stamp'
  | 'mic_drop';

export type ResearchStage =
  | 'idle'
  | 'scoping'
  | 'gathering'
  | 'tracing'
  | 'debating'
  | 'checking'
  | 'synthesizing'
  | 'complete';

export interface EvidenceSource {
  title: string;
  url: string;
  publisher?: string;
  published?: string;
  accessed?: string;
  source_type?: 'primary' | 'secondary' | 'tertiary' | 'opinion';
  quality: 'high' | 'medium' | 'low';
  paraphrase: string;
  quote?: string;
}

export interface EvidenceCard {
  id: string;
  claim: string;
  status: EvidenceStatus;
  found_by: string;
  checked_by?: string;
  sources: EvidenceSource[];
  caveats: string[];
  confidence: 'High' | 'Medium' | 'Low';
  topic?: string;
  context_id?: string;
  timestamp?: string;
}

export interface ResearchSession {
  session_id: string;
  context_id: string;
  topic: string;
  crew_assigned: string[];
  current_stage: ResearchStage;
  stage_index: number;
  created_at: string;
  completed_at?: string;
  evidence_cards: EvidenceCard[];
  stage_completions: Record<string, string[]>;
}

export interface ResearchReport {
  session_id: string;
  topic: string;
  report_text: string;
  confidence: 'High' | 'Medium' | 'Low';
  generated_at: string;
  evidence_count: number;
  verified_count: number;
  disputed_count: number;
  refuted_count: number;
  unverified_count: number;
  key_sources: EvidenceSource[];
}

export interface ResearchVerdict {
  id: string;
  topic: string;
  summary: string;
  confidence: 'High' | 'Medium' | 'Low';
  key_sources: EvidenceSource[];
  open_questions: string[];
  status: EvidenceStatus;
  author: string;
  timestamp: string;
}

export type ThoughtfulnessLevel = 'quick' | 'balanced' | 'thoughtful' | 'scholarly';

export interface Persona {
  id: string;
  name: string;
  role?: string;
  nerdProp?: string;
  accentColor?: string;
  badgeColor: string;
  avatarLetter: string;
  avatarUrl?: string;
  catchphrase?: string;
  description: string;
  negative_constraints: string[];
  style_anchor: string[];
  allowNsfw?: boolean;
  isCustom?: boolean;
  selectedModelId?: string;
  intellect?: number; // 1-10 scale
  thoughtfulness?: ThoughtfulnessLevel;
  pacingDelaySeconds?: number; // 0 to 4s extra thoughtful pause
  isRoleplayCard?: boolean; // Adaptive mode: expressive RP in 1-on-1, concise in group chat
  firstMessage?: string; // Tavern first_mes opening greeting for 1-on-1 chats
  scenario?: string; // Concise scenario context for 1-on-1 chats
  initialMemoryShards?: Array<{ s: string; k: string[]; w: number }>; // Used on creation from JSON import
  userRapport?: string; // Used on creation from JSON import
}

export interface CharacterImportAnalysis {
  cardFormat: string;
  name: string;
  description: string;
  avatarUrl?: string;
  allowNsfw: boolean;
  isRoleplayCard: boolean;
  firstMessage: string;
  scenario: string;
  style_anchor: string[];
  negative_constraints: string[];
  intellect: number;
  thoughtfulness: ThoughtfulnessLevel;
  pacingDelaySeconds: number;
  userRapport: string;
  extractedShards: Array<{ s: string; k: string[]; w: number }>;
  distilledByAi: boolean;
}

export interface BotMemoryUserCore {
  name?: string;
  traits: string[]; // Max 5 concise user traits
  rapport: string; // 1-line relationship stance from this bot's perspective
  updatedAt: number; // Unix seconds
}

export interface BotMemoryShard {
  id: string;
  s: string; // Concise 1-sentence fact/event summary (<= 120 chars)
  k: string[]; // 3-6 lowercase keyword tags for zero-embedding retrieval
  c: string; // Source context_id
  w: number; // Salience weight (1-5)
  t: number; // Unix timestamp (seconds)
}

export interface BotMemoryBank {
  botId: string;
  u: BotMemoryUserCore;
  e: BotMemoryShard[]; // Max 40 shards in storage; only Top 3 injected per turn
  p: Record<string, string>; // Peer bot stances (omitted in 1-on-1 chat)
}

export interface PixelTask {
  task_id: string;
  context_id: string;
  requested_by: string;
  description: string;
  created_at: string;
  status: 'in_progress' | 'completed';
  completed_at?: string;
  result_summary?: string;
  markdown_content: string;
}

export interface GeneratedImageAttachment {
  image_url: string;
  prompt: string;
  model: string;
  created_at: string;
  tokens_used?: number;
}

export interface ImageQuotaInfo {
  hourlyAvailable: number;
  dailyTokensUsed: number;
  dailyTokensRemaining: number;
  dailyCap: number;
  totalGenerated?: number;
  timeToNextHourMs?: number;
  timeToDailyResetMs?: number;
}

export interface ChatMessage {
  id: number;
  speaker: string;
  text: string;
  timestamp: string;
  session_id: string;
  context_id: string;
  model_used?: string;
  recalled_topic?: string;
  search_query?: string;
  exec_code?: string;
  exec_output?: string;
  exec_success?: boolean;
  visual_graph?: string;
  pixel_task?: PixelTask;
  tagged_bots?: string[];
  is_priority_directive?: boolean;
  generated_image?: GeneratedImageAttachment;
  sticker?: {
    characterId: string;
    expression: string;
    catchphrase?: string;
  };
  evidence?: EvidenceCard;
  verdict?: ResearchVerdict;
  researchState?: ResearchState;
}

export interface ChatContext {
  context_id: string;
  topic_label: string;
  summary: string | null;
  created_at: string;
  last_active_at: string;
  message_count?: number;
  allowed_persona_ids?: string[];
}

export interface Poll {
  poll_id: number;
  context_id: string;
  question: string;
  options: string[];
  status: 'open' | 'closed';
  created_by: string;
  created_at: string;
  votes: Record<string, number>; // voter name -> option_index (0-based)
  counts?: number[]; // count per option index
  totalVotes?: number;
}

export interface ApiKeyItem {
  id: string;
  provider: 'groq' | 'openrouter' | 'nvidia' | 'cloudflare' | 'tavily' | 'e2b' | 'custom';
  name: string;
  maskedKey: string;
  rawKey?: string;
  key?: string;
  isActive: boolean;
  addedAt: string;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: 'groq' | 'nvidia' | 'openrouter' | 'cloudflare';
  tag: string;
  description: string;
}

export interface ModelSettings {
  selectedModel: string;
  availableModels: ModelOption[];
  keys: ApiKeyItem[];
  hasApiKey: boolean;
  hasOpenRouterKey: boolean;
  hasNvidiaKey: boolean;
  hasGroqKey?: boolean;
  hasCloudflareKey?: boolean;
  hasTavilyKey?: boolean;
  hasE2bKey?: boolean;
  maskedApiKey?: string;
  nsfwMode?: boolean;
  modelsMetadata?: {
    lastRefreshedAt?: number;
    expiresAt?: number;
    refreshIntervalDays?: number;
    openRouterCount?: number;
  };
}

export interface ChatState {
  currentContextId: string;
  contexts: ChatContext[];
  messages: ChatMessage[];
  personas: Persona[];
  nextSpeaker: string;
  nsfwMode?: boolean;
  activePoll?: Poll | null;
  activeDirective?: {
    directive: string;
    setBy: string;
    timestamp: string;
  } | null;
  activeRecallTopic?: {
    contextId: string;
    topicLabel: string;
    summary: string;
  } | null;
  activeResearchSession?: ResearchSession | null;
  activeResearchReport?: ResearchReport | null;
  activePixelTask?: PixelTask | null;
}
