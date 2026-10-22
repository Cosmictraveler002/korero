# Kōrero Coherent Per-Bot Memory Architecture (`plan.md`)

## 1. Design Goals & Constraints
1. **Per-Bot Coherent Identity**: Each persona (`Rook`, `Zed`, `Bramble`, `Pixel`, `Moss`, `Nana Nuance`, `Gus Gibbous`, `Prof. Oop`, `Kō`, and custom bots) maintains its own distinct memory bank—remembering the user from its own perspective, specialty, and voice.
2. **Minimal Storage Footprint**: Total disk/IndexedDB footprint capped at **≤ 4 KB per bot** (~32 KB total across all 8 crew members).
3. **Strict Prompt Token Budget**: **Never push full memory into the chat prompt.** Memory injection is strictly capped at **≤ 150 tokens per turn** (~500–600 characters max) via selective Top-K retrieval.
4. **Zero Extra API Call Overhead**: Memory capture happens inline during normal turns (via silent `[MEM: ...]` extraction markers and deterministic heuristics) so it does not consume extra Groq/OpenRouter rate limits.

---

## 2. Data Format Choice: Hybrid `Minified JSON` (Storage) + `Micro-YAML` (Prompt)

| Layer | Chosen Format | Why |
| :--- | :--- | :--- |
| **At-Rest Storage** (`server_device_stores.json` & Client `IndexedDB`) | **Minified JSON with Short Keys** | Native `JSON.parse` / `JSON.stringify` with zero parsing dependencies, fast I/O, and tiny byte size on disk. |
| **In-Prompt Injection** (Sent to LLM inside `/api/chat/turn`) | **Micro-YAML (Compact Key-Value)** | Eliminates JSON braces `{}`, quotes `""`, and repeated keys—saving **~40% tokens** compared to raw JSON while remaining effortless for LLMs to read. |

---

## 3. Coherent 3-Tier Per-Bot Memory Schema

### 3.1 Storage Schema (Minified JSON on Disk — Max ~4 KB / Bot)
```json
{
  "botId": "pixel",
  "u": {
    "name": "Subhamoy",
    "traits": ["builds AI apps", "prefers direct answers", "uses Python & TypeScript"],
    "rapport": "trusted collaborator, enjoys statistical deep-dives",
    "updatedAt": 1792622000
  },
  "e": [
    {
      "id": "m1",
      "s": "User is debugging OpenRouter free model routing and ZDR privacy settings.",
      "k": ["openrouter", "zdr", "api", "models", "routing"],
      "c": "ctx-1792621000",
      "w": 4,
      "t": 1792621900
    },
    {
      "id": "m2",
      "s": "User prefers 1-on-1 bots to wait for replies instead of auto-continuing.",
      "k": ["chat", "turn", "1-on-1", "single-bot", "pacing"],
      "c": "ctx-1792621500",
      "w": 5,
      "t": 1792622400
    }
  ],
  "p": {
    "gus_gibbous": "Skeptical of Gus's unverified leaps; always asks him for sample size n.",
    "bramble": "Relies on Bramble's primary source dates before running regressions."
  }
}
```

### Field Key Legend (Minimal Space)
- `u` (**User & Relationship Core** — Max 5 traits, 1 rapport line): Always-coherent summary of who the user is and how *this specific bot* relates to them.
- `e` (**Episodic Memory Shards** — Max 40 shards in storage; **only Top 3 injected per turn**):
  - `id`: Short shard ID (`m1`..`m40`)
  - `s`: Single-sentence fact/event summary (**hard cap: 120 chars / ~20 words**)
  - `k`: Lowercase keyword tags for fast zero-embedding retrieval (3–6 tags)
  - `c`: Source `context_id`
  - `w`: Importance/Salience weight (`1` = minor detail, `5` = core user preference/project fact)
  - `t`: Unix timestamp (seconds)
- `p` (**Peer Bot Stances** — Max 1 short line per peer): Only used in multi-bot group chats; **completely omitted in 1-on-1 single-bot chats**.

---

## 4. Selective Retrieval & Token Budget Pipeline (Never Push Full Memory)

```
┌─────────────────────────────────────────────────────────────────────────┐
│Incoming Turn: User Message + Active Topic + Active Bot (e.g. "Pixel")   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. Tokenize Query Context                                               │
│    Extract normalized keywords from:                                    │
│    • Last human message (weight ×3)                                     │
│    • Current topic label (weight ×2)                                    │
│    • Last bot message (weight ×1)                                       │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. Score Bot's Episodic Shards (e[0..N]) — O(N) In-Memory (< 0.2ms)     │
│    Score(shard) = (TagOverlapCount × 4)                                 │
│                 + (TextTokenMatchCount × 2)                             │
│                 + (shard.w × 1.5)                                       │
│                 + RecencyBoost(shard.t)                                 │
│    Filter: Keep ONLY top K=3 shards with Score > threshold              │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. Assemble Micro-YAML Memory Block (Hard Cap: ≤ 150 Tokens / 600 Chars)│
│    • Tier 1 (`u` User Core): ~35 tokens                                 │
│    • Tier 2 (Top-3 `e` Shards): ~75 tokens                              │
│    • Tier 3 (`p` Peer Stance): ~25 tokens (0 tokens in 1-on-1 chat!)    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Example of What Actually Gets Injected Into the Prompt (~95 Tokens Total)
Instead of dumping 40 memories into the prompt, `/api/chat/turn` injects only this compact **Micro-YAML** block:

```yaml
[Memory (Pixel)]:
user: Subhamoy | traits: builds AI apps, prefers direct answers, uses Python & TypeScript
rapport: trusted collaborator, enjoys statistical deep-dives
recalled:
- User prefers 1-on-1 bots to wait for replies instead of auto-continuing.
- User is debugging OpenRouter free model routing and ZDR privacy settings.
```

*Token count*: **~68 tokens** (well under the 150-token ceiling).

---

## 5. How Memories Are Created, Updated & Pruned (Zero Extra API Calls)

### 5.1 Inline Silent Memory Extraction (`[MEM: ...]`)
During any regular `/api/chat/turn`, the persona prompt includes a lightweight instruction:
> `- MEMORY RECORDING: If the user shares a lasting personal detail, preference, project goal, or key decision worth remembering across chats, append [MEM: <concise 1-line fact under 15 words> | tags: tag1, tag2 | w: 1-5] at the very end of your reply.`

 When `server.ts` receives the bot's reply:
1. It parses any `[MEM: ...]` tag (and optional `[USER_TRAIT: ...]`).
2. It strips `[MEM: ...]` from `replyText` before saving the chat message (so the user never sees raw tags in the chat bubble).
3. It upserts the memory shard into `store.botMemories[persona.id]`.

### 5.2 Deduplication & Compaction (Minimal Space Guarantee)
Whenever a new shard is added to `store.botMemories[persona.id].e`:
1. **Keyword Overlap Merge**: If an existing shard shares ≥ 60% of the same keyword tags (`k`) or has > 70% token similarity in `s`, the old shard is **overwritten/updated** in-place instead of appending a duplicate.
2. **Ring-Buffer Eviction (Max 40 Shards)**: If `e.length > 40`, compute `evictionScore = shard.w * 2 + recencyScore(shard.t)` and drop the lowest-scoring shard. This guarantees each bot's memory never exceeds **~4 KB**.

---

## 6. UI & API Integration Plan

1. **Backend (`server.ts`)**:
   - Add `BotMemoryBank` interface and `botMemories: Record<string, BotMemoryBank>` to `DeviceStore`.
   - Implement `retrieveBotMemoryBlock(store, persona, activePool, lastHumanMsg, currentCtx)` with hard 600-character / ~150-token truncation.
   - Implement `extractAndSaveBotMemory(store, persona, rawReplyText, lastHumanMsg)` to parse and strip `[MEM: ...]` markers and deduplicate shards.
   - Add REST endpoints:
     - `GET /api/personas/:id/memory` — inspect a bot's current memory bank and token usage.
     - `PUT /api/personas/:id/memory` — manually edit/pin user traits or delete specific memory shards.
     - `DELETE /api/personas/:id/memory` — wipe/reset a specific bot's memory bank.
2. **Frontend (`src/components/EditPersonaModal.tsx` / Side Menu)**:
   - Add a compact **"Bot Memory Bank (X / 40 shards · ~Y tokens active)"** inspector inside each bot's Edit modal so the user can view what each bot remembers about them, delete individual memories, or add pinned facts.
