// Robust IndexedDB + LocalStorage storage layer for mobile & desktop
// Prevents chat deletion on mobile browsers (Safari, Chrome) caused by:
// 1. 5MB LocalStorage quota exceeded from base64 images
// 2. Mobile device ID regeneration
// 3. Context switching overwrites
import { ChatMessage, ChatContext } from '../types';

const DB_NAME = 'korero_chat_db';
const DB_VERSION = 1;
const STORE_MESSAGES = 'messages';
const STORE_CONTEXTS = 'contexts';

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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

// Strip heavy base64 images for localStorage fallback so it never hits 5MB quota
function createLightweightMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => {
    if (m.visual_graph && m.visual_graph.length > 500) {
      return {
        ...m,
        visual_graph: '[CACHED_IN_INDEXEDDB]',
      };
    }
    return m;
  });
}

// Merge two lists of messages deduplicated by id or timestamp+speaker
export function mergeMessages(listA: ChatMessage[], listB: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();

  const getKey = (m: ChatMessage) => {
    if (m.id !== undefined && m.id !== null) return `id_${m.id}`;
    return `key_${m.speaker}_${m.timestamp}_${m.session_id || ''}`;
  };

  for (const m of listA) {
    map.set(getKey(m), m);
  }

  for (const m of listB) {
    const key = getKey(m);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, m);
    } else {
      // Keep version with richer visual_graph or longer content
      if (m.visual_graph && (!existing.visual_graph || existing.visual_graph === '[CACHED_IN_INDEXEDDB]')) {
        map.set(key, m);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const idA = typeof a.id === 'number' ? a.id : 0;
    const idB = typeof b.id === 'number' ? b.id : 0;
    return idA - idB;
  });
}

export async function saveMessagesToStorage(contextId: string, messages: ChatMessage[]): Promise<void> {
  if (!contextId || !Array.isArray(messages)) return;

  // 1. Save full messages (including base64 graphs) to IndexedDB
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_MESSAGES, 'readwrite');
    const store = tx.objectStore(STORE_MESSAGES);
    store.put({ contextId, messages, updatedAt: Date.now() });
  } catch (e) {
    console.warn('[Storage] IndexedDB save error:', e);
  }

  // 2. Save lightweight backup to LocalStorage
  try {
    const light = createLightweightMessages(messages);
    localStorage.setItem(`korero_ctx_msgs_${contextId}`, JSON.stringify(light));
    localStorage.setItem(`korero_active_context_id`, contextId);
  } catch (e) {
    console.warn('[Storage] LocalStorage fallback write warning:', e);
  }
}

export async function loadMessagesFromStorage(contextId: string): Promise<ChatMessage[]> {
  if (!contextId) return [];

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
      return res.messages;
    }
  } catch (e) {
    console.warn('[Storage] IndexedDB read warning:', e);
  }

  // 2. Try LocalStorage for this context
  try {
    const raw = localStorage.getItem(`korero_ctx_msgs_${contextId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  // 3. Scan and recover from any legacy deviceId-keyed messages (prevents mobile loss)
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

export async function saveContextsToStorage(contexts: ChatContext[]): Promise<void> {
  if (!Array.isArray(contexts) || contexts.length === 0) return;

  try {
    const db = await getDb();
    const tx = db.transaction(STORE_CONTEXTS, 'readwrite');
    const store = tx.objectStore(STORE_CONTEXTS);
    store.put({ id: 'all_contexts', contexts, updatedAt: Date.now() });
  } catch (e) {}

  try {
    localStorage.setItem('korero_all_contexts', JSON.stringify(contexts));
  } catch (e) {}
}

export async function loadContextsFromStorage(): Promise<ChatContext[]> {
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
      return res.contexts;
    }
  } catch (e) {}

  try {
    const raw = localStorage.getItem('korero_all_contexts');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  // Legacy recovery
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('korero_chat_contexts_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    }
  } catch (e) {}

  return [];
}
