# 💬 Kōrero (コレーロ) — Intelligent Multi-Persona Chatroom & Adaptive Roleplay Engine

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Kōrero** is a state-of-the-art, multi-persona AI chatroom, group debate environment, and adaptive roleplay engine. It enables human users to converse with multiple specialized AI personas simultaneously, initiate deep research pipelines, execute live Python code in isolated sandboxes, browse real-time web sources, and import multi-format Character Cards (SillyTavern V2/V3, TavernAI V1, Character.AI).

---

## 📑 Table of Contents
- [✨ Key Capabilities](#-key-capabilities)
- [🏗️ System Architecture](#️-system-architecture)
- [🤖 Multi-Provider Model Routing Engine](#-multi-provider-model-routing-engine)
- [🔄 Turn-Based Group Chat & Speaker Selection Architecture](#-turn-based-group-chat--speaker-selection-architecture)
- [🧠 Coherent Memory Bank & Context Injection](#-coherent-memory-bank--context-injection)
- [📊 Deep Research Pipeline (6-Stage Automated Agent Crew)](#-deep-research-pipeline-6-stage-automated-agent-crew)
- [🃏 Character Card Normalization & Voice Distillation Engine](#-character-card-normalization--voice-distillation-engine)
- [💾 Multi-Discussion Group Persistence Layer](#-multi-discussion-group-persistence-layer)
- [🛠️ Interactive Command Suite](#️-interactive-command-suite)
- [🚀 Quickstart & Local Setup](#-quickstart--local-setup)
- [📦 Production Deployment](#-production-deployment)
- [📜 License](#-license)

---

## ✨ Key Capabilities

- **Group Chatroom & 1-on-1 Adaptive Roleplay**: Switch seamlessly between multi-bot roundtable discussions and targeted 1-on-1 character roleplays.
- **Coherent Bot Memory Banks**: Per-bot episodic & user memory with Top-K vector-less semantic retrieval (`≤ 150 tokens` Micro-YAML prompt injection).
- **Multi-Format SillyTavern / Tavern V2/V3 Character Importer**: Import `.json` character cards with instant macro resolution (`{{char}}`, `{{user}}`), lorebook entry conversion into memory shards, and automatic LLM/NLP prompt distillation (`≤ 420 chars`).
- **6-Stage Deep Research Pipeline**: Autonomous 7-member research crew (Kō, Zed, Bramble, Pixel, Nana Nuance, Prof. Oop, Moss) that gathers live web evidence, traces primary publication origins, verifies sample sizes, and stamps citation clearance.
- **Code Execution Sandbox (E2B Integration)**: Live Python code execution for statistical analysis, data processing, and interactive chart rendering.
- **Real-Time Web Search & Crawleation**: Live search via Tavily API with full page crawling and source attribution.
- **Cloudflare Flux 1 Schnell Text-to-Image Engine**: High-speed parallel AI visual generation using Cloudflare Workers AI with rate limiting and credit rollover.
- **Priority Directives (`/hearme`)**: Override room focus and command all active bots to address a priority directive.
- **Fail-Safe Offline Storage**: Hybrid IndexedDB + LocalStorage fallback with automatic 5MB quota eviction protection and client-server state deduplication.

---

## 🏗️ System Architecture

Kōrero is designed as a full-stack, single-process application running Vite-middleware Express in development and compiled static assets in production.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT (Browser / PWA)                             │
│  ┌───────────────────────┐   ┌─────────────────────────┐   ┌──────────────────┐  │
│  │   React UI & Hooks    │   │  IndexedDB (Full Store) │   │ LocalStorage     │  │
│  │  App.tsx & Modals     │ ⇄ │  STORE_MESSAGES / CTX   │ ⇄ │ (Lightweight)    │  │
│  └───────────┬───────────┘   └─────────────────────────┘   └──────────────────┘  │
└──────────────┼───────────────────────────────────────────────────────────────────┘
               │ HTTP / JSON API (x-device-id, Client Headers)
┌──────────────▼───────────────────────────────────────────────────────────────────┐
│                          EXPRESS BACKEND SERVER (server.ts)                      │
│                                                                                  │
│  ┌────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────┐ │
│  │  DeviceStore Isolator  │  │  Speaker Selection Engine │  │ Memory Manager   │ │
│  │  device_stores.json    │  │  Domain Scoring & R-Robin│  │ Micro-YAML Inject│ │
│  └───────────┬────────────┘  └────────────┬─────────────┘  └────────┬─────────┘ │
│              │                            │                         │           │
│  ┌───────────▼────────────────────────────▼─────────────────────────▼──────────┐ │
│  │                   Multi-Provider LLM Router Engine                          │ │
│  └──────┬──────────────┬─────────────────┬──────────────────────┬──────────────┘ │
└─────────┼──────────────┼─────────────────┼──────────────────────┼────────────────┘
          │              │                 │                      │
┌─────────▼──────┐┌──────▼───────┐┌────────▼─────────┐┌───────────▼────────────┐
│   Groq LPUs    ││  OpenRouter  ││ Cloudflare AI    ││    NVIDIA NIM API    │
│ Llama 3.3 70B  ││ Dynamic Free ││ Flux 1 Schnell   ││ Llama 3.2 90B Vision │
│ DeepSeek R1 70B││ Meta-Router  ││ GLM 4.7 / Qwen3  ││ High GPU Acceleration│
└────────────────┘└──────────────┘└──────────────────┘└──────────────────────┘
```

---

## 🤖 Multi-Provider Model Routing Engine

Kōrero supports direct client-to-provider key forwarding with device isolation (`x-device-id`) and automatic multi-provider failover.

### Supported Providers & Models

| Provider | Model ID | Capabilities |
| :--- | :--- | :--- |
| **Groq LPU** | `auto/smart-routing` | Smart auto-switch to fastest active provider |
| **Groq LPU** | `openai/gpt-oss-120b` | Flagship open-weight 120B reasoning model |
| **Groq LPU** | `llama-3.3-70b-versatile` | High tokens/sec 70B parameter instruction model |
| **Groq LPU** | `deepseek-r1-distill-llama-70b` | DeepSeek R1 reasoning distilled into Llama 70B |
| **OpenRouter** | `openrouter/free` | Dynamic free router that picks active free models |
| **OpenRouter** | `google/gemma-4-31b-it:free` | Google Gemma 4 31B dense multimodal model |
| **Cloudflare AI**| `@cf/zai-org/glm-4.7-flash` | Cloudflare Workers AI fast inference |
| **NVIDIA NIM** | `meta/llama-3.2-90b-vision-instruct` | GPU-accelerated NVIDIA NIM enterprise endpoint |

### Dynamic OpenRouter Auto-Cache Scheduler
The server runs a weekly auto-refresh background timer (`6-hour interval check`) that verifies live OpenRouter endpoint availability (`status === 0` and `prompt pricing === 0`) and caches verified models locally in `data/openrouter_models_cache.json`.

---

## 🔄 Turn-Based Group Chat & Speaker Selection Architecture

The engine uses a deterministic, multi-stage speaker selection algorithm (`selectNextSpeaker`) to maintain natural group conversation flow without duplicate monologues:

```
[User Message / Event]
          │
          ▼
   1. Active Priority Check ───────► Explicit @mention found? ───► Pick Mentioned Persona
          │
          ▼
   2. Pixel Task Active? ──────────► Unfinished calculation? ────► Force @Pixel turn
          │
          ▼
   3. Domain Expertise Scoring ────► Keyword Match (>0)? ───────► Pick Top Expert
          │  - Math/Code ──► Pixel
          │  - Sources ───► Bramble / Moss
          │  - Web ───────► Zed
          │  - Gossip ────► Tui
          │
          ▼
   4. Fair Round-Robin & Least-Recently-Spoken Rotation
      Rotates to the candidate bot that spoke least recently in recent history.
```

### 1-on-1 Roleplay vs. Group Chat Mode
- **1-on-1 Chat (`allowed_persona_ids.length === 1`)**: When chatting with a single bot, the turn loop executes exactly 1 response and pauses to wait for human input, preventing bots from chatting with themselves. If the character card defines a `firstMessage`, it posts its opening greeting automatically upon chat initialization.
- **Group Chat (`allowed_persona_ids.length > 1`)**: Bots are capped at a maximum of 1 peer follow-up turn before yielding back to the user. Responses are automatically trimmed to concise group banter (1–3 sentences).

---

## 🧠 Coherent Memory Bank & Context Injection

Each persona maintains an isolated `BotMemoryBank` stored on disk and synchronized with client-side IndexedDB:

```typescript
interface BotMemoryBank {
  botId: string;
  u: {
    name?: string;               // User's preferred name
    traits: string[];            // Extracted user traits
    rapport: string;             // Stored relationship dynamic
    updatedAt: number;
  };
  e: BotMemoryShard[];           // Ring-buffer of up to 40 episodic memory shards
  p?: Record<string, string>;    // Peer stances (used in group chats only)
}

interface BotMemoryShard {
  id: string;
  s: string;                     // Short summary (≤ 120 chars)
  k: string[];                   // Keywords / triggers
  c: string;                     // Context ID
  w: number;                     // Weight (1-5)
  t: number;                     // Timestamp (seconds)
}
```

### Zero-Cost Vectorless Retrieval (Top-K = 3)
1. Tokenizes current turn text, active topic label, and recent context messages.
2. Scores shards in $O(N)$ time:
   $$\text{Score} = (\text{Tag Matches} \times 4) + (\text{Text Matches} \times 2) + (\text{Weight} \times 1.5) + \text{RecencyBoost}$$
3. Assembles Top-3 shards into a Micro-YAML prompt block capped at $\le 600$ characters ($\approx 150$ tokens):

```yaml
[Memory (Mira)]:
user: Subhamoy | traits: developer, typescript enthusiast
rapport: analytical collaborator over late-night warm tea
recalled:
- User is building an expressive multi-persona chatroom app.
- User prefers Llama 3.3 70B for fast reasoning tasks.
```

### Inline Memory Extraction Markers
During turns, models can emit inline control tags that update their memory bank without appearing in the user's chat transcript:
- `[MEM: User likes TypeScript | tags: typescript, coding | w: 4]`
- `[USER_TRAIT: nocturnal coder]`
- `[USER_NAME: Alex]`

---

## 📊 Deep Research Pipeline (6-Stage Automated Agent Crew)

Kōrero features an autonomous research mode that orchestrates a 7-member specialized crew across a multi-stage pipeline:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      STAGE 1: SCOPING (Kō framing)                       │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼─────────────────────────────────────┐
│                 STAGE 2: GATHERING (Zed & Gus Gibbous)                   │
│   Zed: Live web search & snippets  |  Gus: Wild hypothesis generation     │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼─────────────────────────────────────┐
│                   STAGE 3: TRACING (Bramble Origin)                      │
│   Bramble traces primary documentation, publication dates & footnotes   │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼─────────────────────────────────────┐
│                    STAGE 4: DEBATING (Tri-Angle)                         │
│   Pixel (Sample size)  |  Nana Nuance (Scope)  |  Prof. Oop (Counter)    │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼─────────────────────────────────────┐
│                   STAGE 5: CHECKING (Moss Gatekeeper)                    │
│   Moss stamps citation clearance & verifies publisher metadata           │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼─────────────────────────────────────┐
│                   STAGE 6: SYNTHESIZING (Kō Final Verdict)               │
│   Outputs executive synthesis report & structured Evidence Cards        │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🃏 Character Card Normalization & Voice Distillation Engine

Kōrero ingests character definitions from multiple external standards via `/api/personas/import-analyze`:

1. **Card Unwrapping**: Normalizes Tavern V1 (`char_name`, `char_persona`), SillyTavern V2/V3 (`spec: "chara_card_v2"` / `"v3"`), and Character.AI formats.
2. **Macro Expansion Engine**: Replaces `{{char}}`, `<BOT>`, `{{user}}`, and `<USER>` placeholders across scenarios, greetings, dialogues, and descriptions.
3. **Voice Distillation**: Compresses detailed backstories into a concise personality prompt ($\le 420$ characters), extracts `style_anchor` quotes, and derives negative behavioral constraints.
4. **Lorebook Conversion**: Ingests `character_book.entries` with trigger `keys` and maps them directly into atomic `BotMemoryShard` entries seeded into the bot's memory bank.

---

## 💾 Multi-Discussion Group Persistence Layer

To guarantee that discussion groups, messages, custom personas, and memories survive page refreshes, mobile browser restarts, and server container restarts, Kōrero employs a multi-tiered persistence layer:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                               CLIENT SIDE                               │
│  IndexedDB (korero_chat_db)              LocalStorage (Lightweight)     │
│  ├── STORE_MESSAGES (Full base64 graphs) ├── korero_all_contexts         │
│  ├── STORE_CONTEXTS (All groups)         ├── korero_all_personas        │
│  └── STORE_META (Personas & Memories)    └── korero_ctx_msgs_<id> (60)  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Dual-Way Sync (/api/chat/sync)
┌────────────────────────────────────▼────────────────────────────────────┐
│                               SERVER SIDE                               │
│  DeviceStore isolator (by x-device-id header or IP/UA signature)        │
│  └── data/device_stores.json (150ms debounced disk flush + SIGTERM)    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Quota Eviction & Deduplication
- `safeLocalStorageSetItem()` automatically prunes old message keys from LocalStorage if browser quotas (5MB) are approached, keeping full fidelity safely stored in IndexedDB.
- Base64 images in `generated_image.image_url` and visual graphs in `visual_graph` are replaced with `[CACHED_IN_INDEXEDDB]` placeholders in LocalStorage.
- `/api/chat/sync` performs deduplication across all discussion groups so client and server remain perfectly aligned.

---

## 🛠️ Interactive Command Suite

Type slash commands directly in the chat input bar:

| Command | Usage | Description |
| :--- | :--- | :--- |
| `/hearme` | `/hearme <instruction>` | Issue room directive that commands all active bots to address the instruction |
| `/image` | `/image <prompt>` | Synthesize visual artwork using Cloudflare Flux 1 Schnell |
| `/imagine` | `/imagine <prompt>` | Alias for text-to-image synthesis |
| `/poll` | `/poll "Question" "Opt 1" "Opt 2"` | Create an interactive poll for human and AI participants |
| `/vote` | `/vote <option_number>` | Cast a vote on the active poll |
| `/closepoll` | `/closepoll` | Close active poll and tally final results |
| `/newtopic` | `/newtopic <label>` | Create a new discussion group thread |
| `/pause` | `/pause` | Pause automated bot follow-ups |
| `/resume` | `/resume` | Resume automated bot turns |

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/korero.git
   cd korero
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables** (Optional):
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here
   GROQ_API_KEY=your_groq_api_key_here
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   CLOUDFLARE_API_TOKEN=your_cloudflare_token_here
   TAVILY_API_KEY=your_tavily_key_here
   E2B_API_KEY=your_e2b_key_here
   ```
   > *Note: Users can also enter their private API keys directly in the UI under **Side Menu > API Keys**. Client-entered keys are stored privately on their device and never saved in global environment variables.*

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 📦 Production Deployment

### Build Executable Bundle
To build the application for production deployment:
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Docker Deployment
Create a `Dockerfile` in the root directory:
```dockerfile
FROM node:20-alpine WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

Build and run the container:
```bash
docker build -t korero-app .
docker run -p 3000:3000 -v $(pwd)/data:/app/data korero-app
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.

---

<p center>
Built with ❤️ for multi-persona AI interaction and adaptive character roleplay.
</p>
