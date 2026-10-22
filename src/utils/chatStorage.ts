// Robust IndexedDB + LocalStorage storage layer for mobile & desktop
// Prevents chat & discussion group deletion on refreshes and server restarts caused by:
// 1. 5MB LocalStorage quota exceeded from base64 images / graphs
// 2. Server container restarts returning only the default ctx-1 discussion group
// 3. Context switching & multi-group message synchronization
import { ChatMessage, ChatContext, Persona, BotMemoryBank } from '../types';

const DB_NAME = 'korero_chat_db';
const DB_VERSION = 2;
const STORE_MESSAGES = 'messages';
const STORE_CONTEXTS = 'contexts';
const STORE_META = 'meta';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        db.createObjectStore(STORE_MESSAGES, { keyPath: 'contextId' });
      }
      if (!db.objectStoreNames.contains(STORE_CONTEXTS)) {
        db.createObjectStore(STORE_CONTEXTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
}

// Safely set an item in localStorage, evicting heavy message caches if 5MB quota is exceeded
export function safeLocalStorageSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // QuotaExceededError: free space by removing old message caches (full messages remain in IndexedDB)
    try {
      const msgKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('korero_ctx_msgs_') || k.startsWith('korero_chat_messages_'))) {
          msgKeys.push(k);
        }
      }
      for (const mk of msgKeys) {
        if (mk !== key) {
          localStorage.removeItem(mk);
        }
      }
      localStorage.setItem(key, value);
    } catch (retryErr) {
      console.warn('[Storage] LocalStorage quota full even after cleanup:', retryErr);
    }
  }
}

// Strip heavy base64 images & graphs for localStorage fallback so it never hits 5MB quota
function createLightweightMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-60).map((m) => {
    let copy = m;
    if (copy.visual_graph && copy.visual_graph.length > 500) {
      copy = {
        ...copy,
        visual_graph: '[CACHED_IN_INDEXEDDB]',
      };
    }
    if (
      copy.generated_image?.image_url &&
      copy.generated_image.image_url.startsWith('data:') &&
      copy.generated_image.image_url.length > 500
    ) {
      copy = {
        ...copy,
        generated_image: {
          ...copy.generated_image,
          image_url: '[CACHED_IN_INDEXEDDB]',
        },
      };
    }
    return copy;
  });
}

// Merge two lists of messages deduplicated by context_id + id or timestamp+speaker
export function mergeMessages(listA: ChatMessage[], listB: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();

  const getKey = (m: ChatMessage) => {
    const ctxPrefix = m.context_id || 'ctx-1';
    if (m.id !== undefined && m.id !== null) return `${ctxPrefix}_id_${m.id}_${m.speaker}`;
    return `${ctxPrefix}_key_${m.speaker}_${m.timestamp}_${m.session_id || ''}`;
  };

  for (const m of listA || []) {
    if (!m) continue;
    map.set(getKey(m), m);
  }

  for (const m of listB || []) {
    if (!m) continue;
    const key = getKey(m);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, m);
    } else {
      let merged = { ...existing, ...m };
      // Preserve full visual_graph if one copy has the real base64/HTML and the other has placeholder
      if (
        existing.visual_graph &&
        existing.visual_graph !== '[CACHED_IN_INDEXEDDB]' &&
        (!m.visual_graph || m.visual_graph === '[CACHED_IN_INDEXEDDB]')
      ) {
        merged.visual_graph = existing.visual_graph;
      }
      // Preserve full generated_image.image_url if one copy has the real base64 and the other has placeholder
      if (
        existing.generated_image?.image_url &&
        existing.generated_image.image_url !== '[CACHED_IN_INDEXEDDB]' &&
        (!m.generated_image?.image_url || m.generated_image.image_url === '[CACHED_IN_INDEXEDDB]')
      ) {
        merged.generated_image = {
          ...(m.generated_image || existing.generated_image),
          image_url: existing.generated_image.image_url,
        };
      }
      map.set(key, merged);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const idA = typeof a.id === 'number' ? a.id : 0;
    const idB = typeof b.id === 'number' ? b.id : 0;
    return idA - idB;
  });
}

// Merge local and server discussion groups (contexts) so non-default groups are never erased on refresh
export function mergeContexts(localContexts: ChatContext[], serverContexts: ChatContext[]): ChatContext[] {
  const map = new Map<string, ChatContext>();

  for (const ctx of localContexts || []) {
    if (ctx && ctx.context_id) {
      map.set(ctx.context_id, { ...ctx });
    }
  }

  for (const ctx of serverContexts || []) {
    if (!ctx || !ctx.context_id) continue;
    const existing = map.get(ctx.context_id);
    if (!existing) {
      map.set(ctx.context_id, { ...ctx });
    } else {
      // Keep custom topic_label if local has a non-default label, and preserve allowed_persona_ids
      const preferLocalAllowed =
        Array.isArray(existing.allowed_persona_ids) &&
        existing.allowed_persona_ids.length > 0 &&
        (!Array.isArray(ctx.allowed_persona_ids) || ctx.allowed_persona_ids.length === 0);

      map.set(ctx.context_id, {
        ...existing,
        ...ctx,
        topic_label:
          ctx.topic_label && ctx.topic_label !== 'General Discussion'
            ? ctx.topic_label
            : existing.topic_label || ctx.topic_label,
        summary: ctx.summary || existing.summary || null,
        allowed_persona_ids: preferLocalAllowed
          ? existing.allowed_persona_ids
          : ctx.allowed_persona_ids || existing.allowed_persona_ids,
        message_count: Math.max(existing.message_count || 0, ctx.message_count || 0),
      });
    }
  }

  return Array.from(map.values());
}

// Merge local and server personas so custom/imported characters and edits survive server restarts
export function mergePersonas(localPersonas: Persona[], serverPersonas: Persona[]): Persona[] {
  const map = new Map<string, Persona>();

  for (const p of serverPersonas || []) {
    if (p && p.id) {
      map.set(p.id, { ...p });
    }
  }

  for (const p of localPersonas || []) {
    if (!p || !p.id) continue;
    const existing = map.get(p.id);
    if (!existing) {
      // Custom persona created on client that server lost on restart
      map.set(p.id, { ...p });
    } else if (p.isCustom) {
      map.set(p.id, { ...existing, ...p });
    }
  }

  return Array.from(map.values());
}

export async function saveMessagesToStorage(contextId: string, messages: ChatMessage[]): Promise<void> {
  if (!contextId || !Array.isArray(messages)) return;

  // 1. Save full messages (including base64 graphs & images) to IndexedDB
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_MESSAGES, 'readwrite');
    const store = tx.objectStore(STORE_MESSAGES);
    store.put({ contextId, messages, updatedAt: Date.now() });
  } catch (e) {
    console.warn('[Storage] IndexedDB save error:', e);
  }

  // 2. Save lightweight backup to LocalStorage (never exceeds 5MB quota)
  try {
    const light = createLightweightMessages(messages);
    safeLocalStorageSetItem(`korero_ctx_msgs_${contextId}`, JSON.stringify(light));
  } catch (e) {
    console.warn('[Storage] LocalStorage fallback write warning:', e);
  }
}

export async function loadMessagesFromStorage(contextId: string): Promise<ChatMessage[]> {
  if (!contextId) return [];

  let idbMessages: ChatMessage[] = [];
  // 1. Try IndexedDB first for full fidelity
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_MESSAGES, 'readonly');
    const store = tx.objectStore(STORE_MESSAGES);
    const res: any = await new Promise((resolve) => {
      const req = store.get(contextId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });

    if (res && Array.isArray(res.messages) && res.messages.length > 0) {
      idbMessages = res.messages;
    }
  } catch (e) {
    console.warn('[Storage] IndexedDB read warning:', e);
  }

  // 2. Try LocalStorage for this context
  let lsMessages: ChatMessage[] = [];
  try {
    const raw = localStorage.getItem(`korero_ctx_msgs_${contextId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        lsMessages = parsed;
      }
    }
  } catch (e) {}

  if (idbMessages.length > 0 || lsMessages.length > 0) {
    return mergeMessages(lsMessages, idbMessages);
  }

  // 3. Scan and recover from any legacy deviceId-keyed messages
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('korero_chat_messages_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const matching = parsed.filter((m: ChatMessage) => m.context_id === contextId || !m.context_id);
            if (matching.length > 0) return matching;
          }
        }
      }
    }
  } catch (e) {}

  return [];
}

// Load all messages across all discussion groups from IndexedDB + LocalStorage
export async function loadAllMessagesFromStorage(contextIds: string[]): Promise<ChatMessage[]> {
  const allIds = new Set<string>(contextIds.filter(Boolean));

  // Also discover any contextIds stored in localStorage keys `korero_ctx_msgs_*`
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('korero_ctx_msgs_')) {
        const cid = key.replace('korero_ctx_msgs_', '').trim();
        if (cid) allIds.add(cid);
      }
    }
  } catch (e) {}

  // Also discover any contextIds stored in IndexedDB STORE_MESSAGES
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_MESSAGES, 'readonly');
    const store = tx.objectStore(STORE_MESSAGES);
    const keys: any[] = await new Promise((resolve) => {
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
    for (const k of keys) {
      if (typeof k === 'string' && k) allIds.add(k);
    }
  } catch (e) {}

  const combined: ChatMessage[] = [];
  for (const cid of Array.from(allIds)) {
    const msgs = await loadMessagesFromStorage(cid);
    for (const m of msgs) {
      combined.push({
        ...m,
        context_id: m.context_id || cid,
      });
    }
  }

  return combined;
}

export async function saveContextsToStorage(contexts: ChatContext[]): Promise<void> {
  if (!Array.isArray(contexts) || contexts.length === 0) return;

  try {
    const db = await getDb();
    const tx = db.transaction(STORE_CONTEXTS, 'readwrite');
    const store = tx.objectStore(STORE_CONTEXTS);
    store.put({ id: 'all_contexts', contexts, updatedAt: Date.now() });
  } catch (e) {}

  try {
    safeLocalStorageSetItem('korero_all_contexts', JSON.stringify(contexts));
  } catch (e) {}
}

export async function loadContextsFromStorage(): Promise<ChatContext[]> {
  let idbContexts: ChatContext[] = [];
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_CONTEXTS, 'readonly');
    const store = tx.objectStore(STORE_CONTEXTS);
    const res: any = await new Promise((resolve) => {
      const req = store.get('all_contexts');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });

    if (res && Array.isArray(res.contexts) && res.contexts.length > 0) {
      idbContexts = res.contexts;
    }
  } catch (e) {}

  let lsContexts: ChatContext[] = [];
  try {
    const raw = localStorage.getItem('korero_all_contexts');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        lsContexts = parsed;
      }
    }
  } catch (e) {}

  // Legacy recovery
  if (idbContexts.length === 0 && lsContexts.length === 0) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('korero_chat_contexts_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              lsContexts = mergeContexts(lsContexts, parsed);
            }
          }
        }
      }
    } catch (e) {}
  }

  return mergeContexts(lsContexts, idbContexts);
}

export async function savePersonasToStorage(personas: Persona[]): Promise<void> {
  if (!Array.isArray(personas) || personas.length === 0) return;

  try {
    const db = await getDb();
    const tx = db.transaction(STORE_META, 'readwrite');
    const store = tx.objectStore(STORE_META);
    store.put({ id: 'all_personas', personas, updatedAt: Date.now() });
  } catch (e) {}

  try {
    safeLocalStorageSetItem('korero_all_personas', JSON.stringify(personas));
  } catch (e) {}
}

export async function loadPersonasFromStorage(): Promise<Persona[]> {
  let idbPersonas: Persona[] = [];
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_META, 'readonly');
    const store = tx.objectStore(STORE_META);
    const res: any = await new Promise((resolve) => {
      const req = store.get('all_personas');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    if (res && Array.isArray(res.personas) && res.personas.length > 0) {
      idbPersonas = res.personas;
    }
  } catch (e) {}

  let lsPersonas: Persona[] = [];
  try {
    const raw = localStorage.getItem('korero_all_personas');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        lsPersonas = parsed;
      }
    }
  } catch (e) {}

  return mergePersonas(lsPersonas, idbPersonas);
}

export async function saveBotMemoriesToStorage(botMemories: Record<string, BotMemoryBank>): Promise<void> {
  if (!botMemories || typeof botMemories !== 'object') return;

  try {
    const db = await getDb();
    const tx = db.transaction(STORE_META, 'readwrite');
    const store = tx.objectStore(STORE_META);
    store.put({ id: 'bot_memories', botMemories, updatedAt: Date.now() });
  } catch (e) {}

  try {
    safeLocalStorageSetItem('korero_bot_memories', JSON.stringify(botMemories));
  } catch (e) {}
}

export async function loadBotMemoriesFromStorage(): Promise<Record<string, BotMemoryBank>> {
  let idbMem: Record<string, BotMemoryBank> = {};
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_META, 'readonly');
    const store = tx.objectStore(STORE_META);
    const res: any = await new Promise((resolve) => {
      const req = store.get('bot_memories');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    if (res && res.botMemories && typeof res.botMemories === 'object') {
      idbMem = res.botMemories;
    }
  } catch (e) {}

  let lsMem: Record<string, BotMemoryBank> = {};
  try {
    const raw = localStorage.getItem('korero_bot_memories');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        lsMem = parsed;
      }
    }
  } catch (e) {}

  return { ...lsMem, ...idbMem };
}
