# Intelligent JSON Character Card Importer & Adaptive Roleplay Engine

This plan introduces an intelligent JSON character import pipeline that transforms verbose SillyTavern/TavernAI (V1, V2, V3) and custom character cards into lean, high-coherence Kōrero personas—distilling core voice, converting heavy backstory and lorebooks into token-budgeted Memory Shards, and adapting speaking style automatically between 1-on-1 roleplay and multi-bot group chats.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural choices were confirmed during Phase 1 and govern how imported characters are parsed, stored, and prompted.

- **Confirmed Decision 1 — Card Format Support**: Native parsing for **SillyTavern & TavernAI V1 / V2 (`chara_card_v2`) / V3 (`chara_card_v3`) JSON cards** (including embedded `character_book` lorebooks, `mes_example`, `first_mes`, `scenario`, `system_prompt`, and `{{char}}` / `{{user}}` macros), plus smart fallback mapping for general character JSON files.
- **Confirmed Decision 2 — Prompt-Safe Lore Distillation**: Instead of dumping a 1,500-token character sheet into every chat turn, the importer **distills the core voice & personality** into the active persona profile and **converts backstory, scenario, and lorebook entries into Episodic Memory Shards (`e`)** inside the bot's Coherent Memory Bank (recalled selectively via Top-3 Micro-YAML ≤ 150 tokens).
- **Confirmed Decision 3 — Adaptive Conversation Mode**: Imported characters operate in **Adaptive Mode**—preserving expressive roleplay formatting (`*actions*`, rich character voice, and authentic `first_mes` greetings) in **1-on-1 chats**, while automatically tightening to concise 1–3 sentence banter when placed in **multi-bot group chats**.

---

## 1. Overview & Core Concept

- **What It Does**: Allows users to upload a `.json` character card file or paste raw JSON directly inside the **Create Bot Persona** modal (or via a dedicated **Import JSON Card** action). An intelligent analyzer extracts the character's identity, speaking style, behavioral rules, initial greeting, and lore shards with a live preview before saving.
- **Target Audience / Persona**: Users bringing rich roleplay characters, historical figures, or specialized companions from SillyTavern/TavernAI into Kōrero for either immersive 1-on-1 conversations or multi-bot roundtables.
- **Key Value**: Eliminates "flat import / flat output" degradation and token-limit exhaustion. Characters sound like themselves immediately, remember deep lore on demand through the memory bank, and never talk for the user.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Entry Point**: Inside the **Create New Bot Persona** modal (and accessible from the Bots drawer), a top segmented bar lets the user switch between **Manual Creation** and **Import JSON Character Card**.
  2. **Upload or Paste JSON**: Users can drag-and-drop / select a `.json` character card file or paste raw JSON text.
  3. **Intelligent Analysis & Distillation**: Clicking **Analyze & Distill Character** runs the server-side compiler (using the active LLM with an instant deterministic NLP fallback if no API key is configured yet).
  4. **Interactive Distillation Preview**: Before creating the bot, the modal populates and previews:
     - **Detected Card Spec** (e.g., `Tavern Card V2 · 14 Lore Shards Extracted · Roleplay Ready`) rendered as clean inline metadata with `·` separators.
     - **Distilled Core Identity** (2–4 high-density sentences capturing personality and voice).
     - **Extracted Style Anchors** (authentic dialogue quotes parsed from `mes_example` and `first_mes`).
     - **Derived Negative Constraints** (guardrails synthesized from `system_prompt` and character traits).
     - **Extracted Memory Shards Preview** (collapsible list of backstory, scenario, and `character_book` lore items that will be seeded directly into the bot's 40-shard Coherent Memory Bank).
     - **Opening Greeting (`first_mes`)**: Editable opening scene/greeting used automatically when starting a fresh 1-on-1 chat with this character.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Utilitarian dark-slate studio console (`#0a0a0a` / `neutral-950` canvas, `#171717` / `neutral-900` structural surfaces, crisp `1px` `neutral-800` hairline borders).
  - *Color Palette & Mood*: 60% deep neutral canvas, 30% structural slate containers, 10% emerald/cyan semantic accents for memory shard extraction and active states.
  - *Typography & Hierarchy*: Clean sans-serif UI labels paired with tabular monospace (`font-mono tabular-nums`) for shard counts, token estimates (`~110/150 tok`), and JSON diagnostics. All metadata uses unboxed inline text with `·` separators (zero static pill clutter).
- **Interactive Feedback & Motion**:
  - Instant JSON syntax validation on file drop or paste (`<= 150ms` feedback).
  - Clear progress state during intelligent distillation, transitioning smoothly into the editable persona form so the user has final control over every field before clicking **Create Imported Persona**.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Hybrid AI + Deterministic Distillation Pipeline**
  - *Chosen Approach*: Combine a deterministic Tavern V1/V2/V3 structural parser (`{{char}}`/`{{user}}` macro sanitizer, `<START>` dialogue splitter, `character_book` extractor) with an optional single-shot LLM distillation pass when an API key is active.
  - *Why*: Pure LLM parsing can fail if the user hasn't configured an API key yet or hits a rate limit; pure regex parsing can leave bloated 800-word descriptions untouched. The hybrid pipeline guarantees 100% reliability while producing razor-sharp voice distillation when a model is available.
  - *Alternatives Considered*: Raw field copying (`card.description -> persona.description`), which was rejected because large Tavern cards exceed 1,500+ tokens, drown out chat history, and produce flat outputs.

- **Decision 2: Seeding Lore & Scenario into the Coherent Memory Bank (`BotMemoryBank.e`)**
  - *Chosen Approach*: Chunk the character's `scenario`, long-form backstory paragraphs, and `character_book.entries` into atomic `BotMemoryShard` items (`<= 120 chars` each, tagged with `character_book` keys or extracted keywords, weight `w: 4`).
  - *Why*: Allows a character with 20+ lore entries and a rich backstory to recall specific worldbuilding facts, relationships, or scenario details only when the conversation touches those keywords—keeping per-turn prompt injection strictly `<= 150 tokens`.

- **Decision 3: Adaptive 1-on-1 Roleplay vs. Group Chat Prompting**
  - *Chosen Approach*: Tag imported roleplay personas with `isRoleplayCard: true` (plus optional `firstMessage` and `scenario`). In `/api/chat/turn`, when `isSingleBotChat` is true and the persona has roleplay traits, unlock expressive character prose (`*actions*`, emotional nuance, 1–2 paragraphs) while keeping strict `SINGLE TURN ONLY` anti-self-talk guardrails. When `isSingleBotChat` is false (group chat), enforce Kōrero's crisp 1–3 sentence group banter rules.
  - *Why*: Users importing a Tavern card want authentic roleplay immersion in 1-on-1 chats, but don't want a single bot writing 4-paragraph novellas inside an 8-bot group room.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Distillation Pipeline Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                  CreatePersonaModal (Import JSON Mode)                     │
│  [Upload .json File]  or  [Paste Raw JSON]  ──►  POST /api/personas/import │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 1. Schema Normalizer & Macro Sanitizer                                     │
│    • Unwraps Tavern V2/V3 (`data.*`) or V1 root fields                     │
│    • Replaces `{{char}}` -> Name, `{{user}}` -> User                       │
│    • Splits `mes_example` on `<START>` to extract character speech lines   │
│    • Extracts `character_book.entries` (Lorebook keys & content)           │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 2. Intelligent Voice & Lore Distiller (LLM + Deterministic Fallback)       │
│    ├─► Core Persona Voice (2-4 dense sentences -> `persona.description`)   │
│    ├─► Style Anchors (4-6 authentic quotes -> `persona.style_anchor`)      │
│    ├─► Guardrails (`system_prompt` -> `persona.negative_constraints`)      │
│    ├─► Opening Scene (`first_mes` -> `persona.firstMessage`)               │
│    └─► Lore & Backstory Shards (up to 25 shards -> `BotMemoryBank.e`)      │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 3. Adaptive Runtime Execution (`POST /api/chat/turn` & New 1-on-1 Chat)    │
│    • New 1-on-1 Chat: Auto-posts `persona.firstMessage` if present         │
│    • 1-on-1 Turn: Enables expressive RP prose + `*actions*` + single-turn  │
│    • Group Turn: Enforces concise 1-3 sentence peer dialogue               │
│    • Memory Retrieval: Injects Top-3 matching lore/user shards (<=150 tok) │
└────────────────────────────────────────────────────────────────────────────┘
```

### Data Model Extensions
- **`Persona` Entity**:
  - `isRoleplayCard?: boolean` — Indicates the persona was imported from a character/roleplay card and supports adaptive 1-on-1 RP formatting.
  - `firstMessage?: string` — The character's opening greeting/scene (`first_mes`), automatically used to kick off a new 1-on-1 conversation with that character.
  - `scenario?: string` — Concise 1-line scenario framing for 1-on-1 sessions.
- **`ImportAnalysisResult` Payload**:
  - Returned by `POST /api/personas/import-analyze`: contains the normalized `Persona` fields plus `extractedShards: Array<{ s: string; k: string[]; w: number }>`, `userRapport: string`, and `cardFormat: string`.
  - When the user confirms creation (`POST /api/personas`), the server persists the new `Persona` and immediately seeds `extractedShards` and `userRapport` into `store.botMemories[newPersona.id]`.

### Interactive Component & State Mapping
- **CreatePersonaModal**:
  - Adds a top mode switcher (`Manual Setup` | `Import JSON Card`).
  - File input (`accept=".json,application/json"`) + raw JSON textarea + **Distill & Preview Character** button.
  - Populates all form fields (`name`, `description`, `styleAnchors`, `constraints`, `allowNsfw`, `firstMessage`, and a preview list of `extractedShards` with individual remove buttons) so the user can review or tweak any distilled field before saving.
- **New 1-on-1 Chat Greeting Integration**:
  - In `POST /api/contexts`, when a new conversation is created with exactly 1 allowed bot (`allowed_persona_ids.length === 1`) and that bot has a `firstMessage`, the server initializes the conversation with that character's `firstMessage` (replacing `{{user}}` with the user's known name from `botMemories` or `"you"`) instead of a generic system placeholder.
