import React, { useState, useEffect, useRef } from 'react';
import { Send, BarChart2, Pause, Play, Zap, Smile, Sparkles, FileText, Plus, ArrowUp, Code2, Image as ImageIcon, Download, ExternalLink, Cpu } from 'lucide-react';
import { ChatMessage, ChatContext, Persona, ModelSettings, Poll, ApiKeyItem, PixelTask, GeneratedImageAttachment, ImageQuotaInfo } from './types';
import { PersonaAvatar } from './components/PersonaAvatar';
import { CreatePersonaModal } from './components/CreatePersonaModal';
import { EditPersonaModal } from './components/EditPersonaModal';
import { NewChatModal } from './components/NewChatModal';
import { CreatePollModal } from './components/CreatePollModal';
import { ActivePollCard } from './components/ActivePollCard';
import { SideMenuDrawer } from './components/SideMenuDrawer';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { KoreroCharacterSvg } from './components/KoreroCharacterSvg';
import { StickerPickerModal } from './components/StickerPickerModal';
import { AvatarPickerModal } from './components/AvatarPickerModal';
import { PixelTaskModal } from './components/PixelTaskModal';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { ImageGenerateModal } from './components/ImageGenerateModal';
import {
  saveMessagesToStorage,
  loadMessagesFromStorage,
  saveContextsToStorage,
  loadContextsFromStorage,
  mergeMessages,
} from './utils/chatStorage';
import {
  KORERO_CHARACTERS,
  getCharacterByPersonaName,
  ExpressionType,
  KoreroCharacter,
} from './data/characters';

export default function App() {
  // Persistent device ID to isolate chat room & keys per browser/device
  const [deviceId] = useState<string>(() => {
    try {
      let id = localStorage.getItem('korero_device_id');
      if (!id) {
        id = 'dev-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('korero_device_id', id);
      }
      return id;
    } catch (e) {
      return 'dev-local';
    }
  });

  const [currentContextId, setCurrentContextId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('korero_active_context_id');
      if (saved) return saved;
      const id = localStorage.getItem('korero_device_id') || 'dev-local';
      const legacy = localStorage.getItem(`korero_chat_context_id_${id}`);
      if (legacy) return legacy;
    } catch (e) {}
    return 'ctx-1';
  });

  // Persistent messages from IndexedDB + LocalStorage (prevents loss on mobile refreshes / restarts)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const activeCtx = localStorage.getItem('korero_active_context_id') || 'ctx-1';
      const raw = localStorage.getItem(`korero_ctx_msgs_${activeCtx}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const id = localStorage.getItem('korero_device_id') || 'dev-local';
      const legacy = localStorage.getItem(`korero_chat_messages_${id}`);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Persistent contexts from storage
  const [contexts, setContexts] = useState<ChatContext[]>(() => {
    try {
      const raw = localStorage.getItem('korero_all_contexts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const id = localStorage.getItem('korero_device_id') || 'dev-local';
      const legacy = localStorage.getItem(`korero_chat_contexts_${id}`);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [nextSpeaker, setNextSpeaker] = useState<string>('Rook');
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [activeDirective, setActiveDirective] = useState<{
    directive: string;
    setBy: string;
    timestamp: string;
  } | null>(null);
  const [activeRecall, setActiveRecall] = useState<{
    contextId: string;
    topicLabel: string;
    summary: string;
  } | null>(null);
  const [activePixelTask, setActivePixelTask] = useState<PixelTask | null>(null);

  // Retractable Side Menu & Creation Modals
  const [showSideMenu, setShowSideMenu] = useState<boolean>(false);
  const [showNewChatModal, setShowNewChatModal] = useState<boolean>(false);
  const [showCreatePersonaModal, setShowCreatePersonaModal] = useState<boolean>(false);
  const [showCreatePollModal, setShowCreatePollModal] = useState<boolean>(false);
  const [showStickerModal, setShowStickerModal] = useState<boolean>(false);
  const [showAvatarPickerModal, setShowAvatarPickerModal] = useState<boolean>(false);
  const [showPixelTaskModal, setShowPixelTaskModal] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<PixelTask | null>(null);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [nsfwMode, setNsfwMode] = useState<boolean>(false);
  const [suggestionIndex, setSuggestionIndex] = useState<number>(0);

  // Cloudflare Flux 1 Schnell Text-to-Image State & Lightbox Modal
  const [previewImage, setPreviewImage] = useState<GeneratedImageAttachment | null>(null);
  const [showImageGenerateModal, setShowImageGenerateModal] = useState<boolean>(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [imageGeneratingPrompt, setImageGeneratingPrompt] = useState<string | null>(null);
  const [asciiSpinnerIdx, setAsciiSpinnerIdx] = useState<number>(0);
  const [imageQuota, setImageQuota] = useState<ImageQuotaInfo | null>(null);

  const ASCII_SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  // ASCII Spinner ticker for image generation and message sending feedback
  useEffect(() => {
    if (!isGeneratingImage && !isSendingMessage) return;
    const timer = setInterval(() => {
      setAsciiSpinnerIdx((prev) => (prev + 1) % ASCII_SPINNER_FRAMES.length);
    }, 90);
    return () => clearInterval(timer);
  }, [isGeneratingImage, isSendingMessage]);

  // User Mascot Avatar State
  const [myAvatar, setMyAvatar] = useState<KoreroCharacter>(() => {
    const saved = localStorage.getItem('korero_user_avatar_id');
    const found = KORERO_CHARACTERS.find((c) => c.id === saved);
    return found || KORERO_CHARACTERS[6]; // Koa default
  });
  const [myDefaultExpr, setMyDefaultExpr] = useState<ExpressionType>('happy');

  // Bot selector modal for existing chat context
  const [showChangeChatBotsModal, setShowChangeChatBotsModal] = useState<boolean>(false);

  const [settings, setSettings] = useState<ModelSettings>({
    selectedModel: 'auto/smart-routing',
    availableModels: [],
    keys: [],
    hasApiKey: false,
    hasOpenRouterKey: false,
    hasNvidiaKey: false,
    hasGroqKey: false,
    hasTavilyKey: false,
  });

  // Device-local API keys stored privately in this browser only
  const [deviceKeys, setDeviceKeys] = useState<ApiKeyItem[]>(() => {
    try {
      const raw = localStorage.getItem('korero_device_keys');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('korero_device_keys', JSON.stringify(deviceKeys));
    } catch (e) {}
  }, [deviceKeys]);

  // Persist messages to IndexedDB + LocalStorage per context (prevents deletion on phone)
  useEffect(() => {
    if (messages.length > 0 && currentContextId) {
      saveMessagesToStorage(currentContextId, messages).catch(() => {});
    }
  }, [messages, currentContextId]);

  // Persist contexts to IndexedDB + LocalStorage
  useEffect(() => {
    if (contexts.length > 0) {
      saveContextsToStorage(contexts).catch(() => {});
    }
  }, [contexts]);

  // Persist currentContextId to storage
  useEffect(() => {
    if (currentContextId) {
      try {
        localStorage.setItem('korero_active_context_id', currentContextId);
        localStorage.setItem(`korero_chat_context_id_${deviceId}`, currentContextId);
      } catch (e) {}
    }
  }, [currentContextId, deviceId]);

  const maskKey = (key: string): string => {
    if (!key) return '';
    if (key.length <= 14) return key.slice(0, 4) + '••••••••' + key.slice(-3);
    return key.slice(0, 9) + '•••••••••••••' + key.slice(-4);
  };

  const renderTextWithTags = (text: string, activePersonas: Persona[]) => {
    if (!text) return null;
    const parts = text.split(/(@[A-Za-z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const cleanTag = part.slice(1).toLowerCase();
        const matched = activePersonas.find(
          (p) => p.name.toLowerCase() === cleanTag || p.id.toLowerCase() === cleanTag
        );
        if (matched) {
          return (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setInputText((prev) => (prev ? `${prev} @${matched.name} ` : `@${matched.name} `));
              }}
              className="inline-flex items-center px-1.5 py-0.2 rounded text-[11px] font-semibold font-mono mx-0.5 border transition cursor-pointer hover:bg-white/10"
              style={{
                backgroundColor: `${matched.badgeColor}18`,
                color: matched.badgeColor,
                borderColor: `${matched.badgeColor}40`,
              }}
              title={`Tag @${matched.name}`}
            >
              @{matched.name}
            </button>
          );
        }
      }
      return part;
    });
  };

  // Helper to build headers with device-specific active keys & device ID
  const getClientAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-device-id': deviceId,
    };
    const activeGroq = deviceKeys.find((k) => k.provider === 'groq' && k.isActive && (k.rawKey || k.key));
    const activeCloudflare = deviceKeys.find((k) => k.provider === 'cloudflare' && k.isActive && (k.rawKey || k.key));
    const activeOpenRouter = deviceKeys.find((k) => k.provider === 'openrouter' && k.isActive && (k.rawKey || k.key));
    const activeNvidia = deviceKeys.find((k) => k.provider === 'nvidia' && k.isActive && (k.rawKey || k.key));
    const activeTavily = deviceKeys.find((k) => k.provider === 'tavily' && k.isActive && (k.rawKey || k.key));
    const activeE2b = deviceKeys.find((k) => k.provider === 'e2b' && k.isActive && (k.rawKey || k.key));

    const cleanHeaderVal = (v?: string) => (v ? v.replace(/[^\x20-\x7E]/g, '').trim() : '');

    if (activeGroq) headers['x-groq-key'] = cleanHeaderVal(activeGroq.rawKey || activeGroq.key);
    if (activeCloudflare) headers['x-cloudflare-key'] = cleanHeaderVal(activeCloudflare.rawKey || activeCloudflare.key);
    if (activeOpenRouter) headers['x-openrouter-key'] = cleanHeaderVal(activeOpenRouter.rawKey || activeOpenRouter.key);
    if (activeNvidia) headers['x-nvidia-key'] = cleanHeaderVal(activeNvidia.rawKey || activeNvidia.key);
    if (activeTavily) headers['x-tavily-key'] = cleanHeaderVal(activeTavily.rawKey || activeTavily.key);
    if (activeE2b) headers['x-e2b-key'] = cleanHeaderVal(activeE2b.rawKey || activeE2b.key);

    return headers;
  };

  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Controls & Simulation state
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [thinkingPersona, setThinkingPersona] = useState<Persona | null>(null);
  const [speed, setSpeed] = useState<'fast' | 'normal' | 'relaxed'>('normal');

  // Human user state & fluid input controls
  const [inputText, setInputText] = useState<string>('');
  const [userName, setUserName] = useState<string>('You');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPlusMenu, setShowPlusMenu] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close plus menu when clicking outside (desktop mouse + mobile touch)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    if (showPlusMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showPlusMenu]);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch settings & models from server
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        headers: getClientAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const localModel = localStorage.getItem('korero_selected_model_id');
        const isLocalValid = Boolean(localModel && data.availableModels?.some((m: any) => m.id === localModel));
        if (localModel && !isLocalValid) {
          try {
            localStorage.removeItem('korero_selected_model_id');
          } catch (e) {}
        }
        const activeModel = isLocalValid ? localModel : data.selectedModel;
        setSettings({
          ...data,
          selectedModel: activeModel || data.selectedModel,
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  // Initial fetch of chat state
  const fetchState = async () => {
    try {
      // First load existing local messages immediately to guarantee no blank screen
      const targetCtx = currentContextId || localStorage.getItem('korero_active_context_id') || 'ctx-1';
      const storedLocalMsgs = await loadMessagesFromStorage(targetCtx);
      if (storedLocalMsgs.length > 0 && messages.length === 0) {
        setMessages(storedLocalMsgs);
      }

      const res = await fetch('/api/chat/state', {
        headers: getClientAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load chat state');
      const data = await res.json();

      const activeCtxId = data.currentContextId || targetCtx;
      const cachedList = await loadMessagesFromStorage(activeCtxId);
      const serverMsgs = data.messages || [];

      // Merge local and server messages deduplicated by ID to prevent deletion
      const merged = mergeMessages(cachedList, serverMsgs);

      if (merged.length > serverMsgs.length) {
        // Sync cached messages back to server so nothing is wiped!
        fetch('/api/chat/sync', {
          method: 'POST',
          headers: getClientAuthHeaders(),
          body: JSON.stringify({
            messages: merged,
            contexts: data.contexts?.length ? data.contexts : contexts,
            currentContextId: activeCtxId,
          }),
        }).catch(() => {});
      }

      setMessages(merged.length > 0 ? merged : serverMsgs);
      await saveMessagesToStorage(activeCtxId, merged.length > 0 ? merged : serverMsgs);

      if (data.contexts && data.contexts.length > 0) {
        setContexts(data.contexts);
        saveContextsToStorage(data.contexts).catch(() => {});
      }
      setPersonas(data.personas || []);
      if (data.currentContextId) setCurrentContextId(data.currentContextId);
      if (data.nextSpeaker) setNextSpeaker(data.nextSpeaker);
      if (data.activeRecallTopic) setActiveRecall(data.activeRecallTopic);
      if (data.nsfwMode !== undefined) setNsfwMode(Boolean(data.nsfwMode));
      if (data.activePoll !== undefined) setActivePoll(data.activePoll);
      if (data.activeDirective !== undefined) setActiveDirective(data.activeDirective);
      scrollToBottom('auto');
    } catch (err) {
      console.warn('Could not connect to server, retaining local offline messages:', err);
      const targetCtx = currentContextId || 'ctx-1';
      const cached = await loadMessagesFromStorage(targetCtx);
      if (cached.length > 0) setMessages(cached);
    }
  };

  // Fetch active poll for current context
  const fetchActivePoll = async (contextId: string) => {
    try {
      const res = await fetch(`/api/polls/active/${contextId}`, {
        headers: getClientAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setActivePoll(data.poll || null);
      }
    } catch (e) {
      console.error('Failed to fetch active poll', e);
    }
  };

  // NSFW Toggle Handler
  const handleToggleNsfw = async (newVal: boolean) => {
    try {
      setNsfwMode(newVal);
      const res = await fetch('/api/chat/nsfw', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({ nsfwMode: newVal }),
      });
      if (res.ok) {
        showToast(newVal ? '18+ NSFW Mode Activated' : '18+ NSFW Mode Deactivated');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch real-time Cloudflare Flux 1 Schnell rate limit & token quota
  const fetchImageQuota = async () => {
    try {
      const res = await fetch('/api/image/quota', {
        headers: getClientAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setImageQuota(data);
      }
    } catch (err) {
      console.warn('Failed to fetch image quota', err);
    }
  };

  // Parallel text-to-image synthesis with Cloudflare Flux 1 Schnell
  const handleGenerateImage = async (promptText: string) => {
    setIsGeneratingImage(true);
    setImageGeneratingPrompt(promptText);
    clearFollowUpTimer();
    unansweredBotTurnsRef.current = 0;
    setUnansweredBotTurns(0);
    setIsPaused(false);

    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({
          prompt: promptText,
          speaker: userName,
          contextId: currentContextId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate image with Flux 1 Schnell');
      }

      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      if (data.quota) {
        setImageQuota(data.quota);
      }
      showToast('🎨 Image generated with Flux 1 Schnell!');
      scrollToBottom('smooth');
      setTimeout(() => executeTurn(), 400);
    } catch (err: any) {
      showToast(err?.message || 'Image generation failed');
      throw err;
    } finally {
      setIsGeneratingImage(false);
      setImageGeneratingPrompt(null);
    }
  };

  // Start fresh chat with selected bots
  const handleStartNewChat = async (topicLabel: string, allowedIds: string[]) => {
    clearFollowUpTimer();
    unansweredBotTurnsRef.current = 0;
    setUnansweredBotTurns(0);
    try {
      const res = await fetch('/api/chat/new', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({
          topicLabel: topicLabel || 'New Discussion',
          allowed_persona_ids: allowedIds,
        }),
      });
      if (!res.ok) throw new Error('Failed to create new chat');
      const data = await res.json();
      setCurrentContextId(data.currentContextId);
      setContexts(data.contexts);
      setMessages([data.message]);
      setActivePoll(null);
      setActiveDirective(null);
      if (data.nextSpeaker) setNextSpeaker(data.nextSpeaker);
      showToast(
        allowedIds.length === 1
          ? `Started 1-on-1 chat`
          : `Started conversation with ${allowedIds.length} bots`
      );
    } catch (err: any) {
      showToast(err.message || 'Error creating chat');
    }
  };

  // Update allowed bots for the current active conversation
  const handleUpdateCurrentContextBots = async (allowedIds: string[]) => {
    clearFollowUpTimer();
    try {
      const res = await fetch(`/api/chat/context/${currentContextId}/personas`, {
        method: 'PUT',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({ allowed_persona_ids: allowedIds }),
      });
      if (!res.ok) throw new Error('Failed to update conversation bots');
      const data = await res.json();
      setContexts(data.contexts);
      showToast(
        allowedIds.length === 1
          ? `Updated to 1-on-1 chat (1 bot active)`
          : `Updated conversation bots (${allowedIds.length} active)`
      );
      setShowChangeChatBotsModal(false);
    } catch (err: any) {
      showToast(err.message || 'Error updating conversation bots');
    }
  };

  // Update bot name, profile picture, and traits
  const handleUpdatePersona = async (personaId: string, updatedData: Partial<Persona>) => {
    const res = await fetch(`/api/personas/${personaId}`, {
      method: 'PUT',
      headers: getClientAuthHeaders(),
      body: JSON.stringify(updatedData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update persona');
    }
    const data = await res.json();
    setPersonas(data.personas);

    if (updatedData.name) {
      setMessages((prev) =>
        prev.map((m) =>
          m.speaker.toLowerCase() === personaId.toLowerCase() ||
          m.speaker.toLowerCase() === (editingPersona?.name || '').toLowerCase()
            ? { ...m, speaker: updatedData.name! }
            : m
        )
      );
    }

    showToast(`Updated bot: ${data.persona.name}`);
  };

  // Create persona handler
  const handleCreatePersona = async (newPersona: Partial<Persona>) => {
    const res = await fetch('/api/personas', {
      method: 'POST',
      headers: getClientAuthHeaders(),
      body: JSON.stringify(newPersona),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create persona');
    }
    const data = await res.json();
    setPersonas(data.personas);
    showToast(`Created bot character: ${data.persona.name}`);
  };

  // Delete custom persona handler
  const handleDeletePersona = async (personaId: string) => {
    try {
      const res = await fetch(`/api/personas/${personaId}`, {
        method: 'DELETE',
        headers: getClientAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete persona');
      }
      const data = await res.json();
      setPersonas(data.personas);
      showToast('Bot character removed');
    } catch (err: any) {
      showToast(err.message || 'Error deleting bot');
    }
  };

  // Switch context/topic handler
  const handleSwitchContext = async (contextId: string) => {
    clearFollowUpTimer();
    unansweredBotTurnsRef.current = 0;
    setUnansweredBotTurns(0);
    try {
      // 1. Immediately switch and load local messages to avoid flashing
      setCurrentContextId(contextId);
      const cached = await loadMessagesFromStorage(contextId);
      if (cached.length > 0) {
        setMessages(cached);
      }

      const res = await fetch(`/api/chat/context/${contextId}/messages`, {
        headers: getClientAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load topic messages');
      const data = await res.json();
      const serverMsgs = data.messages || [];
      const merged = mergeMessages(cached, serverMsgs);

      setMessages(merged);
      await saveMessagesToStorage(contextId, merged);

      const activeCtx = contexts.find((c) => c.context_id === contextId);
      await fetchActivePoll(contextId);
      // Refresh state to fetch any active directive
      const stateRes = await fetch('/api/chat/state', {
        headers: getClientAuthHeaders(),
      });
      if (stateRes.ok) {
        const stateData = await stateRes.json();
        setActiveDirective(stateData.activeDirective || null);
      }
      showToast(`Switched to: "${activeCtx?.topic_label || 'Discussion'}"`);
    } catch (err: any) {
      showToast(err.message || 'Error switching topic');
    }
  };

  // Priority Directive (/hearme) Handlers
  const handleSendHearMe = async (directiveText: string) => {
    if (!directiveText.trim()) return;
    try {
      const res = await fetch('/api/chat/hearme', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({ directive: directiveText.trim(), speaker: userName }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to activate /hearme');
      }
      const data = await res.json();
      setActiveDirective(data.directive);
      setMessages((prev) => [...prev, data.message]);
      setInputText('');
      setIsPaused(false);
      if (data.nextSpeaker) setNextSpeaker(data.nextSpeaker);
      showToast('⚡ Importance directive active — all bots must address this instruction');
      executeTurn(data.nextSpeaker || nextSpeaker);
    } catch (err: any) {
      showToast(err.message || 'Error sending priority directive');
    }
  };

  const handleDismissDirective = async () => {
    try {
      await fetch('/api/chat/hearme/dismiss', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({ contextId: currentContextId }),
      });
      setActiveDirective(null);
      showToast('Priority directive dismissed');
    } catch (e) {
      console.error(e);
    }
  };

  // Poll Handlers
  const handleCreatePoll = async (question: string, options: string[]) => {
    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({ question, options, created_by: userName }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create poll');
      }
      const data = await res.json();
      setActivePoll(data.poll);
      setMessages((prev) => [...prev, data.message]);
      showToast('Poll created and announced');
    } catch (err: any) {
      showToast(err.message || 'Error creating poll');
    }
  };

  const handleVotePoll = async (optionIndex: number) => {
    if (!activePoll) return;
    try {
      const res = await fetch(`/api/polls/${activePoll.poll_id}/vote`, {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({ voter: userName, option_index: optionIndex }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record vote');
      }
      const data = await res.json();
      setActivePoll(data.poll);
      showToast(`Voted for option ${optionIndex + 1}`);
    } catch (err: any) {
      showToast(err.message || 'Error casting vote');
    }
  };

  const handleClosePoll = async () => {
    if (!activePoll) return;
    try {
      const res = await fetch(`/api/polls/${activePoll.poll_id}/close`, {
        method: 'POST',
        headers: getClientAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to close poll');
      }
      const data = await res.json();
      setActivePoll(null);
      setMessages((prev) => [...prev, data.message]);
      showToast('Poll closed and results tallied');
    } catch (err: any) {
      showToast(err.message || 'Error closing poll');
    }
  };

  useEffect(() => {
    fetchState();
    fetchSettings();

    // Android/Mobile virtual keyboard resize listener
    const handleResize = () => {
      scrollToBottom('auto');
    };

    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  useEffect(() => {
    if (showSideMenu) {
      fetchSettings();
    }
  }, [showSideMenu]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, activeDirective]);

  const queuedSpeakerRef = useRef<string | null>(null);
  const unansweredBotTurnsRef = useRef<number>(0);
  const [unansweredBotTurns, setUnansweredBotTurns] = useState<number>(0);
  const followUpTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear follow-up timer helper
  const clearFollowUpTimer = () => {
    if (followUpTimerRef.current) {
      clearTimeout(followUpTimerRef.current);
      followUpTimerRef.current = null;
    }
  };

  // Execute a single turn
  const executeTurn = async (forcedSpeaker?: string) => {
    clearFollowUpTimer();
    const speakerToCall = forcedSpeaker || queuedSpeakerRef.current || nextSpeaker;

    if (isThinking) {
      if (forcedSpeaker) {
        queuedSpeakerRef.current = forcedSpeaker;
      }
      return;
    }

    if (forcedSpeaker && queuedSpeakerRef.current === forcedSpeaker) {
      queuedSpeakerRef.current = null;
    }

    // Match persona to apply natural intellect & thoughtful pacing
    const personaObj = personas.find(
      (p) =>
        p.name.toLowerCase() === speakerToCall.toLowerCase() ||
        p.id.toLowerCase() === speakerToCall.toLowerCase()
    );

    setThinkingPersona(personaObj || null);
    setIsThinking(true);

    // Fast Pacing Configuration (capped so network requests start nearly immediately)
    let pacingMs = 150;
    if (personaObj) {
      if (typeof personaObj.pacingDelaySeconds === 'number' && personaObj.pacingDelaySeconds >= 0) {
        pacingMs = Math.min(800, Math.round(personaObj.pacingDelaySeconds * 1000));
      } else if (personaObj.thoughtfulness === 'scholarly') {
        pacingMs = 450;
      } else if (personaObj.thoughtfulness === 'thoughtful') {
        pacingMs = 350;
      } else if (personaObj.thoughtfulness === 'balanced') {
        pacingMs = 200;
      } else if (personaObj.thoughtfulness === 'quick') {
        pacingMs = 80;
      } else if (typeof personaObj.intellect === 'number') {
        if (personaObj.intellect >= 8) pacingMs = 400;
        else if (personaObj.intellect >= 6) pacingMs = 200;
        else pacingMs = 100;
      }
    }

    if (pacingMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, pacingMs));
    }

    try {
      const res = await fetch('/api/chat/turn', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({ personaName: speakerToCall }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Turn generation failed');
      }

      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      if (data.nextSpeaker) {
        setNextSpeaker(data.nextSpeaker);
      }
      if (data.recalledTopic) {
        setActiveRecall(null);
        showToast(`Referenced past topic: "${data.recalledTopic}"`);
      }
      if (data.activePoll !== undefined) {
        setActivePoll(data.activePoll);
      } else if (currentContextId) {
        fetchActivePoll(currentContextId);
      }

      // Track consecutive bot turns without human response
      unansweredBotTurnsRef.current += 1;
      setUnansweredBotTurns(unansweredBotTurnsRef.current);

      // Check how many bots participate in this conversation
      const activeCtxObj = contexts.find((c) => c.context_id === currentContextId);
      const activeBotCount =
        activeCtxObj?.allowed_persona_ids && activeCtxObj.allowed_persona_ids.length > 0
          ? activeCtxObj.allowed_persona_ids.length
          : personas.length;
      const isSingleBotRoom = activeBotCount <= 1;
      const isNextSpeakerDifferent = Boolean(
        data.nextSpeaker &&
          data.message?.speaker &&
          data.nextSpeaker.toLowerCase() !== data.message.speaker.toLowerCase()
      );

      // In a 1-on-1 single-bot chat, stop after 1 reply and wait for the human user's response (never talk to self).
      // In a multi-bot group chat, allow at most 1 peer bot follow-up before waiting for the human user.
      clearFollowUpTimer();
      if (!isSingleBotRoom && unansweredBotTurnsRef.current < 2 && isNextSpeakerDifferent && !isPaused) {
        followUpTimerRef.current = setTimeout(() => {
          executeTurn(data.nextSpeaker);
        }, 12000);
      }
    } catch (err: any) {
      console.error('Turn error:', err);
      const errMsg = err?.message || 'Error running turn';
      if (errMsg.toLowerCase().includes('429') || errMsg.toLowerCase().includes('rate')) {
        showToast('Provider rate limit hit. Paused turns to cooldown.');
      } else {
        showToast(errMsg);
      }
      setIsPaused(true);
    } finally {
      setIsThinking(false);
      // Immediately run queued speaker if a specific bot call arrived while in-flight
      if (queuedSpeakerRef.current) {
        const queued = queuedSpeakerRef.current;
        queuedSpeakerRef.current = null;
        setTimeout(() => executeTurn(queued), 150);
      }
    }
  };

  // Clean up timers on unmount or context switch
  useEffect(() => {
    return () => {
      clearFollowUpTimer();
    };
  }, []);

  // Model Selection handler
  const handleSelectModel = async (modelId: string) => {
    // 1. Optimistic UI update so active model badge changes instantly without network lag
    setSettings((prev) => ({ ...prev, selectedModel: modelId }));
    try {
      localStorage.setItem('korero_selected_model_id', modelId);
    } catch (e) {}

    try {
      const res = await fetch('/api/settings/model', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({ model: modelId }),
      });
      if (!res.ok) throw new Error('Failed to update model');
      const data = await res.json();
      setSettings((prev) => ({ ...prev, selectedModel: data.selectedModel }));
      showToast(`Active model: ${data.modelName || modelId}`);
    } catch (err: any) {
      console.error(err);
      showToast('Error changing model');
    }
  };

  // Device-local API Key management handlers (private to this device)
  const handleSaveKeyDirect = async (
    provider: 'groq' | 'openrouter' | 'nvidia' | 'cloudflare' | 'tavily' | 'e2b',
    key: string,
    name?: string
  ) => {
    const cleanKey = key.trim();
    if (!cleanKey) return;
    const provLabel =
      provider === 'tavily'
        ? 'Tavily Search'
        : provider === 'e2b'
        ? 'E2B Sandbox'
        : provider === 'groq'
        ? 'Groq LPU'
        : provider === 'cloudflare'
        ? 'Cloudflare AI'
        : provider === 'nvidia'
        ? 'NVIDIA NIM'
        : 'OpenRouter';

    const newItem: ApiKeyItem = {
      id: `key-${provider}-${Date.now()}`,
      provider,
      name: name?.trim() || `${provLabel} (This Device)`,
      maskedKey: maskKey(cleanKey),
      rawKey: cleanKey,
      key: cleanKey,
      isActive: true,
      addedAt: 'This Device',
    };

    setDeviceKeys((prev) => {
      // Replace existing active key of same provider or append
      const filtered = prev.filter((k) => k.provider !== provider);
      return [...filtered, newItem];
    });

    showToast(`${provLabel} key saved privately to this device`);
  };

  const handleToggleKey = async (id: string) => {
    setDeviceKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, isActive: !k.isActive } : k))
    );
    showToast('Key status updated for this device');
  };

  const handleDeleteKey = async (id: string) => {
    setDeviceKeys((prev) => prev.filter((k) => k.id !== id));
    showToast('Key removed from this device');
  };

  const handleTestConnection = async (modelId?: string) => {
    setIsTestingKey(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({ modelId: modelId || settings.selectedModel }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, message: data.error || 'Connection failed' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setIsTestingKey(false);
    }
  };

  const [isRefreshingModels, setIsRefreshingModels] = useState<boolean>(false);
  const handleRefreshModels = async () => {
    setIsRefreshingModels(true);
    try {
      const res = await fetch('/api/models/refresh', {
        method: 'POST',
        headers: getClientAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.availableModels) {
        setSettings((prev) => ({
          ...prev,
          availableModels: data.availableModels,
          modelsMetadata: data.modelsMetadata,
        }));
        const count = data.modelsMetadata?.openRouterCount || data.refreshedCount || data.availableModels.filter((m: any) => m.provider === 'openrouter').length;
        showToast(`✓ Refreshed ${count} live OpenRouter models (weekly sync)!`);
      } else {
        throw new Error(data.error || 'Failed to refresh models');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to refresh models');
    } finally {
      setIsRefreshingModels(false);
    }
  };

  // Send human message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = inputText.trim();
    if (!raw) return;

    // Check for slash commands
    if (raw.startsWith('/')) {
      const parts = raw.split(' ');
      const cmd = parts[0].toLowerCase();
      const arg = parts.slice(1).join(' ').trim();

      if (cmd === '/hearme') {
        if (!arg) {
          showToast('Usage: /hearme <instruction/question for all bots>');
          return;
        }
        await handleSendHearMe(arg);
        return;
      }

      if (cmd === '/image' || cmd === '/imagine') {
        if (!arg) {
          setShowImageGenerateModal(true);
          setInputText('');
          return;
        }
        setInputText('');
        try {
          await handleGenerateImage(arg);
        } catch (err: any) {
          // Toast handled in handleGenerateImage
        }
        return;
      }

      if (cmd === '/dismisshearme' || cmd === '/unhearme') {
        setInputText('');
        await handleDismissDirective();
        return;
      }

      if (cmd === '/poll') {
        if (!arg) {
          setShowCreatePollModal(true);
          setInputText('');
          return;
        }
        const matches = [...arg.matchAll(/"([^"]+)"|(\S+)/g)].map((m) => m[1] || m[2]);
        if (matches.length >= 3) {
          const q = matches[0];
          const opts = matches.slice(1);
          setInputText('');
          await handleCreatePoll(q, opts);
          return;
        } else {
          showToast('Usage: /poll "Question" "Option 1" "Option 2"');
          return;
        }
      }

      if (cmd === '/vote') {
        const voteIndex = parseInt(arg, 10) - 1;
        if (!isNaN(voteIndex) && voteIndex >= 0) {
          setInputText('');
          await handleVotePoll(voteIndex);
          return;
        } else {
          showToast('Usage: /vote <option_number>');
          return;
        }
      }

      if (cmd === '/closepoll') {
        setInputText('');
        await handleClosePoll();
        return;
      }

      if (cmd === '/newtopic' || cmd === '/new') {
        setInputText('');
        setShowNewChatModal(true);
        return;
      }

      if (cmd === '/pause') {
        clearFollowUpTimer();
        setIsPaused(true);
        setInputText('');
        showToast('Chat paused');
        return;
      }

      if (cmd === '/resume' || cmd === '/run') {
        clearFollowUpTimer();
        unansweredBotTurnsRef.current = 0;
        setUnansweredBotTurns(0);
        setIsPaused(false);
        setInputText('');
        showToast('Chat resumed');
        executeTurn();
        return;
      }

      if (cmd === '/models' || cmd === '/settings' || cmd === '/keys') {
        setShowSideMenu(true);
        setInputText('');
        return;
      }
    }

    clearFollowUpTimer();
    unansweredBotTurnsRef.current = 0;
    setUnansweredBotTurns(0);
    setIsPaused(false);
    setIsSendingMessage(true);

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({ text: raw, speaker: userName }),
      });

      if (!res.ok) throw new Error('Failed to send message');
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setInputText('');
      if (data.nextSpeaker) {
        setNextSpeaker(data.nextSpeaker);
        executeTurn(data.nextSpeaker);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to post message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendSticker = async (character: KoreroCharacter, expression: ExpressionType) => {
    setShowStickerModal(false);
    clearFollowUpTimer();
    unansweredBotTurnsRef.current = 0;
    setUnansweredBotTurns(0);
    setIsPaused(false);

    const stickerData = {
      characterId: character.id,
      expression,
      catchphrase: character.catchphrase,
    };
    const stickerText = `[Sticker: ${character.name}]`;

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({
          text: stickerText,
          speaker: userName,
          sticker: stickerData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        if (data.nextSpeaker) {
          setNextSpeaker(data.nextSpeaker);
          setTimeout(() => executeTurn(data.nextSpeaker), 300);
        } else {
          setTimeout(() => executeTurn(), 300);
        }
      } else {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const localMsg: ChatMessage = {
          id: Date.now(),
          speaker: userName || 'You',
          text: stickerText,
          timestamp: timeStr,
          session_id: 'session-' + Date.now(),
          context_id: currentContextId,
          sticker: stickerData,
        };
        setMessages((prev) => [...prev, localMsg]);
        executeTurn();
      }
    } catch (e) {
      console.error('Sticker send error:', e);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const localMsg: ChatMessage = {
        id: Date.now(),
        speaker: userName || 'You',
        text: stickerText,
        timestamp: timeStr,
        session_id: 'session-' + Date.now(),
        context_id: currentContextId,
        sticker: stickerData,
      };
      setMessages((prev) => [...prev, localMsg]);
      executeTurn();
    }
    scrollToBottom('smooth');
  };

  const handleSelectUserAvatar = (character: KoreroCharacter, defaultExpr: ExpressionType) => {
    setMyAvatar(character);
    setMyDefaultExpr(defaultExpr);
    localStorage.setItem('korero_user_avatar_id', character.id);
    showToast(`Avatar updated to ${character.name} (${defaultExpr})`);
  };

  const handleChangeName = () => {
    const name = prompt('Enter your name:', userName);
    if (name && name.trim()) {
      setUserName(name.trim());
      showToast(`Speaking as ${name.trim()}`);
    }
  };

  const currentContext = contexts.find((c) => c.context_id === currentContextId);

  // Filter allowed bots in this conversation
  const allowedBotsInThisChat = currentContext?.allowed_persona_ids && currentContext.allowed_persona_ids.length > 0
    ? personas.filter((p) => currentContext.allowed_persona_ids?.includes(p.id) || currentContext.allowed_persona_ids?.includes(p.name))
    : personas;

  // Active model display helper
  const selectedModelObj = settings.availableModels.find(
    (m) => m.id === settings.selectedModel
  );
  const activeModelShortName = selectedModelObj
    ? selectedModelObj.name.replace(/^[^:]+:\s*/, '')
    : 'GPT-OSS 120B / Llama';

  // @Mention Autocomplete Logic
  const mentionMatch = inputText.match(/@([a-zA-Z0-9_\u00C0-\u017F]*)$/);
  const showBotSuggestions = Boolean(mentionMatch);
  const botQuery = mentionMatch ? mentionMatch[1].toLowerCase() : '';
  const matchingBots = showBotSuggestions
    ? allowedBotsInThisChat.filter(
        (p) =>
          p.name.toLowerCase().includes(botQuery) ||
          p.id.toLowerCase().includes(botQuery)
      )
    : [];

  // Slash Command (/) Autocomplete Logic (hearme, image, imagine)
  const slashMatch = !showBotSuggestions ? inputText.match(/^\/([a-zA-Z0-9_-]*)$/) : null;
  const showSlashSuggestions = Boolean(slashMatch);
  const slashQuery = slashMatch ? slashMatch[1].toLowerCase() : '';

  const ALL_SLASH_COMMANDS = [
    {
      command: '/image',
      template: '/image ',
      label: '/image <prompt>',
      description: 'Generate high-quality AI artwork',
      badge: 'Image',
      badgeColor: '#F97316',
      type: 'image',
    },
    {
      command: '/hearme',
      template: '/hearme ',
      label: '/hearme <instruction>',
      description: 'Room directive: commands all bots in the room to listen and focus on this instruction',
      badge: 'Directive',
      badgeColor: '#F59E0B',
      type: 'directive',
    },
    {
      command: '/imagine',
      template: '/imagine ',
      label: '/imagine <prompt>',
      description: 'AI text-to-image generator alias',
      badge: 'Alias',
      badgeColor: '#EC4899',
      type: 'image',
    },
  ];

  const matchingSlashCommands = showSlashSuggestions
    ? ALL_SLASH_COMMANDS.filter((cmd) =>
        cmd.command.slice(1).toLowerCase().startsWith(slashQuery)
      )
    : [];

  const handleSelectSlashCommand = (cmd: typeof ALL_SLASH_COMMANDS[0]) => {
    setInputText(cmd.template);
    setSuggestionIndex(0);
    textareaRef.current?.focus();
    if (textareaRef.current) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
        }
      }, 50);
    }
  };

  const handleSelectBotSuggestion = (botName: string) => {
    const updated = inputText.replace(/@([a-zA-Z0-9_\u00C0-\u017F]*)$/, `@${botName} `);
    setInputText(updated);
    setSuggestionIndex(0);
    textareaRef.current?.focus();
    if (textareaRef.current) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
        }
      }, 50);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashSuggestions && matchingSlashCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev + 1) % matchingSlashCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev - 1 + matchingSlashCommands.length) % matchingSlashCommands.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = matchingSlashCommands[suggestionIndex] || matchingSlashCommands[0];
        if (selected) {
          handleSelectSlashCommand(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        return;
      }
    }

    if (showBotSuggestions && matchingBots.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev + 1) % matchingBots.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev - 1 + matchingBots.length) % matchingBots.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = matchingBots[suggestionIndex] || matchingBots[0];
        if (selected) {
          handleSelectBotSuggestion(selected.name);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        return;
      }
    }

    // Modern fluid LLM input behavior (like ChatGPT / Gemini):
    // Enter sends message, Shift+Enter creates a new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isSendingMessage || isGeneratingImage) {
        return; // Disabled until current generation completes
      }
      if (inputText.trim()) {
        handleSendMessage();
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-black text-neutral-100 flex flex-col font-sans selection:bg-neutral-800 overflow-hidden">
      {/* Top Header */}
      <header className="border-b border-neutral-900 bg-black/95 sticky top-0 z-20 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Left: Round Icon Logo inside Burger Button, clean Title (One logo only!) */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setShowSideMenu(!showSideMenu)}
            className="p-1.5 rounded hover:bg-neutral-900 transition flex items-center justify-center shrink-0 group"
            aria-label="Open Side Menu"
            title="Open side menu"
          >
            <img
              src="/korero_symbol.svg"
              alt="Menu"
              className="w-5 h-5 object-contain group-hover:scale-105 transition-transform"
            />
          </button>

          <span className="font-bold text-white tracking-tight text-sm sm:text-base shrink-0">
            Kōrero
          </span>

          <span className="text-neutral-700 hidden sm:inline">·</span>

          {/* Active Topic & Allowed Bots Display */}
          <div className="flex items-center gap-2 min-w-0 truncate">
            <button
              onClick={() => setShowSideMenu(true)}
              className="text-left text-xs truncate max-w-[140px] sm:max-w-xs text-neutral-300 hover:text-white transition"
              title="Click to view conversation threads in side menu"
            >
              <span className="text-neutral-500 mr-1 hidden sm:inline">Topic:</span>
              <span className="font-medium text-white truncate">
                {currentContext?.topic_label || 'General Discussion'}
              </span>
            </button>

            {/* Allowed Bots In This Chat Tag / Change Button */}
            <button
              onClick={() => setShowChangeChatBotsModal(true)}
              className="text-[11px] text-neutral-400 hover:text-white transition flex items-center gap-1 shrink-0"
              title="Click to adjust which bots participate in this conversation"
            >
              <span className="text-neutral-600 hidden xs:inline">·</span>
              <span className="underline underline-offset-2">
                Bots ({allowedBotsInThisChat.length})
              </span>
            </button>
          </div>
        </div>

        {/* Right side of header: Clean unobtrusive controls & metadata */}
        <div className="flex items-center gap-2 shrink-0">
          {/* User Mascot Avatar Customizer Button */}
          <button
            onClick={() => setShowAvatarPickerModal(true)}
            className="flex items-center gap-1.5 p-1 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition group"
            title="Customize your Kōrero avatar mascot and expression"
          >
            <KoreroCharacterSvg
              character={myAvatar}
              expression={myDefaultExpr}
              size={24}
              className="rounded-full"
              animate={false}
            />
            <span className="text-[11px] font-medium text-neutral-300 pr-1.5 hidden md:inline">
              {myAvatar.name}
            </span>
          </button>

          {/* In-App PWA Install Button */}
          <PWAInstallButton variant="header" />

          {/* Pause / Resume Button */}
          <button
            onClick={() => {
              if (isPaused) {
                clearFollowUpTimer();
                unansweredBotTurnsRef.current = 0;
                setUnansweredBotTurns(0);
                setIsPaused(false);
                executeTurn();
              } else {
                clearFollowUpTimer();
                setIsPaused(true);
              }
            }}
            className="text-[11px] text-neutral-300 hover:text-white px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            title={isPaused ? 'Resume turns' : 'Pause turns'}
          >
            {isPaused ? (
              <>
                <Play size={12} className="fill-current text-emerald-400" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause size={12} className="text-neutral-400" />
                <span>Pause</span>
              </>
            )}
          </button>

          {/* Model indicator */}
          <button
            onClick={() => setShowSideMenu(true)}
            className="text-[11px] text-neutral-500 hover:text-neutral-300 transition py-1 px-1.5 rounded hover:bg-neutral-900 truncate max-w-[120px] sm:max-w-none"
            title="Open models and keys in menu"
          >
            {activeModelShortName}
          </button>
        </div>
      </header>

      {/* Sub-Header: Status line */}
      <div className="bg-neutral-950 border-b border-neutral-900 px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs flex items-center justify-between text-neutral-400 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                !isPaused &&
                unansweredBotTurns < (allowedBotsInThisChat.length <= 1 ? 1 : 2)
                  ? 'bg-emerald-400'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-neutral-300 font-medium">
              {!isPaused
                ? unansweredBotTurns >= (allowedBotsInThisChat.length <= 1 ? 1 : 2)
                  ? 'Waiting for your reply'
                  : allowedBotsInThisChat.length <= 1
                  ? '1-on-1 Chat · Waiting for your reply'
                  : 'Active · Waiting for reply'
                : 'Paused'}
            </span>
          </div>

          <span className="text-neutral-700 shrink-0">·</span>

          <span className="truncate flex items-center gap-1">
            Next: <strong className="text-neutral-200 font-medium">{nextSpeaker}</strong>
          </span>

          <span className="text-neutral-700 hidden sm:inline shrink-0">·</span>

          {/* Active Bots Preview row */}
          <div className="hidden sm:flex items-center gap-1.5 truncate text-neutral-400">
            <span>Room Cast:</span>
            <span className="text-neutral-300 font-medium">
              {allowedBotsInThisChat.map((b) => b.name).join(', ')}
            </span>
          </div>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-neutral-500 text-[10px] sm:text-xs mr-0.5">Pacing:</span>
          {(['fast', 'normal', 'relaxed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs transition ${
                speed === s
                  ? 'bg-neutral-800 text-white font-medium'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {s === 'fast' ? '2.8s' : s === 'normal' ? '4s' : '6.5s'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Thread */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 max-w-4xl w-full mx-auto flex flex-col space-y-4 sm:space-y-5">
        {/* Active Importance Directive (/hearme) Banner */}
        {activeDirective && (
          <div className="bg-amber-950/40 border border-amber-800/60 rounded-lg p-3 text-xs flex items-start justify-between gap-3 text-amber-200 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="shrink-0 font-bold uppercase tracking-wider text-[10px] bg-amber-500/25 text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1 mt-0.5">
                <Zap size={10} className="fill-current" /> HEAR ME DIRECTIVE
              </span>
              <div className="min-w-0">
                <p className="italic font-medium leading-relaxed text-amber-100">
                  "{activeDirective.directive}"
                </p>
                <span className="text-[10px] text-amber-400/80 block mt-0.5">
                  Set by {activeDirective.setBy} — All bots are instructed to address this instruction seriously.
                </span>
              </div>
            </div>
            <button
              onClick={handleDismissDirective}
              className="text-[11px] text-amber-400 hover:text-white underline shrink-0 mt-0.5"
              title="Dismiss directive"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active Pixel task.md Banner */}
        {activePixelTask && (
          <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-lg p-2.5 text-xs flex items-center justify-between gap-2 text-emerald-200 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 font-bold uppercase tracking-wider text-[10px] bg-emerald-500/25 text-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                <FileText size={10} /> task.md
              </span>
              <div className="min-w-0">
                <p className="font-medium truncate text-emerald-100">
                  "{activePixelTask.description}"
                </p>
                <span className="text-[10px] text-emerald-400/80 block truncate">
                  Assigned by @{activePixelTask.requested_by} · Status: {activePixelTask.status === 'completed' ? '✓ Completed (Pixel finished task & stopped auto-replying)' : 'In Progress (Pixel analyzing)'}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedTask(activePixelTask);
                setShowPixelTaskModal(true);
              }}
              className="text-[11px] text-emerald-300 hover:text-white underline shrink-0 font-semibold"
            >
              View task.md
            </button>
          </div>
        )}

        {/* Active Poll Card pinned at top of chat thread if active */}
        {activePoll && (
          <ActivePollCard
            poll={activePoll}
            currentUserName={userName}
            onVote={handleVotePoll}
            onClosePoll={handleClosePoll}
            canClose={activePoll.created_by === userName || userName === 'You'}
          />
        )}

        {/* Empty State: Kō Brand Mascot */}
        {messages.length === 0 ? (
          <div className="my-auto text-center py-10 px-4 flex flex-col items-center justify-center animate-in fade-in duration-300">
            {/* Kō Mascot with floating catchphrase */}
            <div className="relative mb-3 flex items-center justify-center">
              <KoreroCharacterSvg
                character={getCharacterByPersonaName('ko')}
                expression="happy"
                size={88}
                animate={true}
              />
              <div className="absolute -top-2.5 -right-8 bg-white text-black font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-lg border border-neutral-300 animate-bounce">
                Say something! 💬
              </div>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-white mb-1">
              Kōrero Group Room
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto mb-5 leading-relaxed">
              Tui, Mira, Hana, Manu, Ari, Koa, and Rook are here. Click a starter or say anything to start the discussion!
            </p>

            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {[
                "Wait, wait, you won't BELIEVE this.",
                'Are humans naturally cooperative or competitive?',
                'What is the true bottleneck in artificial intelligence?',
                "One more message and then I'll sleep.",
              ].map((seed) => (
                <button
                  key={seed}
                  onClick={() => {
                    setInputText(seed);
                    inputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-xs text-neutral-300 transition text-left border border-neutral-800 hover:border-neutral-700 hover:scale-102"
                >
                  "{seed}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isSystem = msg.speaker.toLowerCase() === 'system';
            const isHuman = msg.speaker.toLowerCase() === 'you' || msg.speaker === userName;
            const isDirective = Boolean(msg.is_priority_directive);

            if (isSystem) {
              return (
                <div
                  key={msg.id}
                  className="py-1 text-center text-xs text-neutral-500 italic my-1.5"
                >
                  {msg.text}
                </div>
              );
            }

            const personaObj = personas.find(
              (p) => p.name.toLowerCase() === msg.speaker.toLowerCase()
            );

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 sm:gap-3 group transition-opacity ${
                  isHuman ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isHuman && (
                  <button
                    onClick={() => {
                      if (personaObj) setEditingPersona(personaObj);
                    }}
                    className="hover:opacity-90 transition mt-0.5"
                    title={`Click to edit ${msg.speaker}'s name or profile picture`}
                  >
                    <PersonaAvatar
                      name={msg.speaker}
                      avatarUrl={personaObj?.avatarUrl}
                      avatarLetter={personaObj?.avatarLetter || msg.speaker[0]}
                      badgeColor={personaObj?.badgeColor || '#71717a'}
                      size="sm"
                      allowNsfw={personaObj?.allowNsfw}
                    />
                  </button>
                )}

                <div
                  className={`w-full max-w-[88%] sm:max-w-2xl md:max-w-3xl min-w-0 flex flex-col ${
                    isHuman ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 px-0.5 flex-wrap">
                    {isDirective ? (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                        <Zap size={10} className="fill-current" /> HEAR ME DIRECTIVE
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          if (personaObj) setEditingPersona(personaObj);
                        }}
                        className="text-xs font-semibold tracking-tight hover:underline transition"
                        style={{ color: personaObj?.badgeColor || (isHuman ? '#ffffff' : '#a3a3a3') }}
                        title={!isHuman ? 'Click to edit bot' : undefined}
                      >
                        {msg.speaker}
                      </button>
                    )}
                    <span className="text-[10px] text-neutral-600">{msg.timestamp}</span>
                    {!isHuman && msg.model_used && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 font-mono inline-flex items-center gap-1 hover:border-neutral-700 transition"
                        title={`Verified model used: ${msg.model_used}`}
                      >
                        <Cpu size={10} className="text-neutral-500 shrink-0" />
                        <span className="truncate max-w-[150px] sm:max-w-[220px]">
                          {msg.model_used.replace(/ \((?:OpenRouter|Groq|Cloudflare Workers AI|NVIDIA NIM)\)/, '')}
                        </span>
                      </span>
                    )}
                    {msg.recalled_topic && (
                      <span className="text-[10px] text-neutral-400">
                        · Recalled: {msg.recalled_topic}
                      </span>
                    )}
                    {msg.search_query && (
                      <span className="text-[10px] text-neutral-500 font-mono">
                        · [Searched: "{msg.search_query}"]
                      </span>
                    )}
                    {msg.exec_code && (
                      <span className="text-[10px] text-amber-400 font-mono">
                        · [⚡ Python Executed]
                      </span>
                    )}
                  </div>

                  {/* Message Bubble or Sticker Card */}
                  {msg.sticker ? (
                    <div className="p-3 bg-neutral-900/90 rounded-2xl border border-neutral-800 flex flex-col items-center text-center shadow-lg animate-in zoom-in-95 duration-150">
                      <KoreroCharacterSvg
                        character={getCharacterByPersonaName(msg.sticker.characterId)}
                        expression={msg.sticker.expression as any}
                        size={80}
                        animate={true}
                      />
                      <span className="text-xs font-bold text-white mt-1.5">
                        {getCharacterByPersonaName(msg.sticker.characterId).name}
                      </span>
                      {msg.sticker.catchphrase && (
                        <span className="text-[11px] text-neutral-400 italic mt-0.5">
                          "{msg.sticker.catchphrase}"
                        </span>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`rounded-xl px-4 py-3 sm:px-4.5 sm:py-3.5 text-xs sm:text-sm md:text-[15px] leading-relaxed shadow-xs w-full max-w-full break-words overflow-hidden box-border ${
                        isDirective
                          ? 'bg-amber-950/40 border border-amber-800/60 text-amber-100 font-medium'
                          : isHuman
                          ? 'bg-neutral-800 text-white'
                          : 'bg-neutral-900/80 text-neutral-100 border border-neutral-800/80'
                      }`}
                    >
                      <div className="break-words overflow-hidden">
                        {renderTextWithTags(msg.text, personas)}
                      </div>

                      {/* Cloudflare Flux 1 Schnell Generated Image Attachment */}
                      {msg.generated_image && (
                        <div className="mt-2.5 rounded-xl overflow-hidden border border-neutral-750/90 shadow-xl bg-neutral-950 p-2 space-y-2 animate-in zoom-in-95 duration-200 group/img w-full max-w-full box-border">
                          <div
                            onClick={() => setPreviewImage(msg.generated_image || null)}
                            className="relative rounded-lg overflow-hidden cursor-zoom-in bg-black/80 flex items-center justify-center max-h-[380px] w-full max-w-full"
                          >
                            <img
                              src={msg.generated_image.image_url}
                              alt={msg.generated_image.prompt}
                              className="w-full max-w-full h-auto max-h-[380px] object-contain rounded-lg transition-transform duration-300 group-hover/img:scale-[1.01]"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <span className="bg-neutral-900/90 text-white text-xs px-2.5 py-1 rounded-full font-medium shadow-lg backdrop-blur-xs flex items-center gap-1">
                                <Sparkles size={12} className="text-orange-400" /> Click to zoom
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 px-1 text-[11px] min-w-0">
                            <span className="text-neutral-400 truncate text-[11px] block flex-1" title={msg.generated_image.prompt}>
                              "{msg.generated_image.prompt}"
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const a = document.createElement('a');
                                a.href = msg.generated_image!.image_url;
                                a.download = `image_${Date.now()}.png`;
                                a.click();
                              }}
                              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition shrink-0 cursor-pointer"
                              title="Download Image"
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        </div>
                      )}

                      {(msg.pixel_task || (msg.speaker.toLowerCase() === 'pixel' && activePixelTask)) && (
                        <div className="mt-2 pt-1 border-t border-neutral-800/80">
                          <button
                            onClick={() => {
                              setSelectedTask(msg.pixel_task || activePixelTask);
                              setShowPixelTaskModal(true);
                            }}
                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 font-mono font-bold hover:bg-emerald-900 transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <FileText size={10} /> 📄 task.md ({(msg.pixel_task?.status || activePixelTask?.status) === 'completed' ? '✓ Completed' : 'In Progress'})
                          </button>
                        </div>
                      )}

                      {msg.visual_graph && (
                        <div className="mt-2.5 rounded-xl overflow-hidden border border-neutral-800/90 shadow-md bg-black/80 p-1 animate-in zoom-in-95 duration-200">
                          <img
                            src={msg.visual_graph}
                            alt="Agent Generated Data Visualization"
                            className="rounded-lg w-full h-auto max-h-[500px] object-contain block"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {msg.exec_code && (
                        <details className="mt-2 w-full bg-black/60 border border-amber-900/50 rounded p-2 text-[11px] font-mono text-amber-200/90">
                          <summary className="cursor-pointer text-[10px] font-semibold text-amber-400 select-none hover:underline">
                            ⚡ Python Code Executed ({msg.exec_success ? 'Success' : 'Failed'})
                          </summary>
                          <pre className="mt-1 text-[10px] text-neutral-300 overflow-x-auto whitespace-pre-wrap">
                            {msg.exec_code}
                          </pre>
                          {msg.exec_output && (
                            <div className="mt-1 pt-1 border-t border-neutral-800 text-[10px] text-neutral-400">
                              <span className="text-neutral-500 font-semibold">Output:</span> {msg.exec_output}
                            </div>
                          )}
                        </details>
                      )}
                    </div>
                  )}
                </div>

                {isHuman && (
                  <button
                    onClick={() => setShowAvatarPickerModal(true)}
                    className="hover:scale-105 transition mt-0.5 shrink-0"
                    title="Click to customize your avatar"
                  >
                    <KoreroCharacterSvg
                      character={myAvatar}
                      expression={myDefaultExpr}
                      size={32}
                      className="rounded-full"
                      animate={false}
                    />
                  </button>
                )}
              </div>
            );
          })
        )}

        {/* Live Typing & Mascot Thinking Indicator with Persona Pacing Context */}
        {isThinking && (
          <div className="flex gap-2.5 sm:gap-3 items-center animate-in fade-in duration-200">
            <PersonaAvatar
              name={nextSpeaker}
              avatarUrl={personas.find((p) => p.name.toLowerCase() === nextSpeaker.toLowerCase())?.avatarUrl}
              avatarLetter={nextSpeaker[0] || 'A'}
              badgeColor={personas.find((p) => p.name.toLowerCase() === nextSpeaker.toLowerCase())?.badgeColor || '#71717a'}
              size="sm"
              expression="thinking"
            />
            <div className="bg-neutral-900/80 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs text-neutral-300 flex items-center gap-2 border border-neutral-800 shadow-md">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>
                {thinkingPersona?.thoughtfulness === 'scholarly'
                  ? `${nextSpeaker} is verifying primary citations...`
                  : thinkingPersona?.thoughtfulness === 'thoughtful' || (thinkingPersona?.intellect && thinkingPersona.intellect >= 8)
                  ? `${nextSpeaker} is contemplating a thoughtful argument...`
                  : `${nextSpeaker} is typing a response...`}
              </span>
              {thinkingPersona && (thinkingPersona.intellect || thinkingPersona.thoughtfulness) && (
                <span className="text-[10px] text-cyan-400 font-mono px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/60 hidden sm:inline">
                  {thinkingPersona.thoughtfulness ? `${thinkingPersona.thoughtfulness} pacing` : `Intellect ${thinkingPersona.intellect}/10`}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Live Image Generating Feedback Banner */}
        {isGeneratingImage && (
          <div className="flex items-center gap-3 p-3 bg-neutral-900/90 border border-neutral-750 rounded-xl text-xs text-neutral-200 animate-in fade-in slide-in-from-bottom-2 shadow-lg">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 font-mono font-bold text-sm shrink-0">
              {ASCII_SPINNER_FRAMES[asciiSpinnerIdx % ASCII_SPINNER_FRAMES.length]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-white flex items-center gap-2">
                <span>Generating Image...</span>
                <span className="text-[10px] font-mono text-neutral-400">
                  [{ASCII_SPINNER_FRAMES[asciiSpinnerIdx % ASCII_SPINNER_FRAMES.length]}]
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 truncate">
                {imageGeneratingPrompt ? `Prompt: "${imageGeneratingPrompt}"` : 'Rendering high-resolution visuals in parallel...'}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Modern Fluid Input Footer (Gemini / ChatGPT Style) */}
      <footer className="border-t border-neutral-900/90 bg-neutral-950/95 backdrop-blur-md p-2 sm:p-3 sticky bottom-0 z-20">
        <div className="max-w-4xl mx-auto relative space-y-1.5">
          {/* Slash Command (/) Autocomplete Popup Dropdown */}
          {showSlashSuggestions && matchingSlashCommands.length > 0 && (
            <div className="fixed sm:absolute bottom-[84px] sm:bottom-full mb-2 left-3 right-3 sm:left-0 sm:right-0 z-30 bg-neutral-900/98 backdrop-blur-md border border-neutral-750 rounded-2xl shadow-2xl p-1.5 max-h-60 overflow-y-auto font-sans animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 px-3 py-1.5 border-b border-neutral-800/80 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <Sparkles size={11} className="text-orange-400" />
                  Commands (/)
                </span>
                <span className="text-[9px] text-neutral-500 font-mono hidden sm:inline">
                  ↑↓ to navigate · Enter / Tab to select
                </span>
              </div>
              <div className="space-y-0.5">
                {matchingSlashCommands.map((cmd, idx) => {
                  const isSelected = idx === suggestionIndex;
                  return (
                    <button
                      key={cmd.command}
                      type="button"
                      onClick={() => handleSelectSlashCommand(cmd)}
                      onMouseEnter={() => setSuggestionIndex(idx)}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-800 text-white shadow-xs'
                          : 'hover:bg-neutral-800/60 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border"
                          style={{
                            backgroundColor: `${cmd.badgeColor}18`,
                            color: cmd.badgeColor,
                            borderColor: `${cmd.badgeColor}40`,
                          }}
                        >
                          {cmd.command === '/hearme' ? (
                            <Zap size={13} className="fill-current" />
                          ) : (
                            <Sparkles size={13} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs text-white truncate block">
                            {cmd.label}
                          </span>
                          <span className="text-[10px] text-neutral-400 truncate block">
                            {cmd.description}
                          </span>
                        </div>
                      </div>

                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 font-mono border"
                        style={{
                          backgroundColor: `${cmd.badgeColor}18`,
                          color: cmd.badgeColor,
                          borderColor: `${cmd.badgeColor}40`,
                        }}
                      >
                        {cmd.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* @ Mention Autocomplete Popup Dropdown */}
          {showBotSuggestions && matchingBots.length > 0 && (
            <div className="fixed sm:absolute bottom-[84px] sm:bottom-full mb-2 left-3 right-3 sm:left-0 sm:right-0 z-30 bg-neutral-900/98 backdrop-blur-md border border-neutral-750 rounded-2xl shadow-2xl p-1.5 max-h-60 overflow-y-auto font-sans animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 px-3 py-1.5 border-b border-neutral-800/80 mb-1 flex items-center justify-between">
                <span>Direct message to bot (@)</span>
                <span className="text-[9px] text-neutral-500 font-mono hidden sm:inline">↑↓ to navigate · Enter to select</span>
              </div>
              <div className="space-y-0.5">
                {matchingBots.map((b, idx) => {
                  const isSelected = idx === suggestionIndex;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectBotSuggestion(b.name)}
                      onMouseEnter={() => setSuggestionIndex(idx)}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                        isSelected ? 'bg-neutral-800 text-white shadow-xs' : 'hover:bg-neutral-800/60 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <PersonaAvatar
                          name={b.name}
                          avatarUrl={b.avatarUrl}
                          avatarLetter={b.avatarLetter}
                          badgeColor={b.badgeColor}
                          size="xs"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs text-white truncate block">
                            {b.name}
                          </span>
                          <span className="text-[10px] text-neutral-400 truncate block">
                            {b.description}
                          </span>
                        </div>
                      </div>

                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 font-mono border"
                        style={{
                          backgroundColor: `${b.badgeColor}18`,
                          color: b.badgeColor,
                          borderColor: `${b.badgeColor}40`,
                        }}
                      >
                        @{b.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fluid LLM Input Container - NO overflow-hidden so popover menu floats unrestricted */}
          <form
            onSubmit={handleSendMessage}
            className="relative rounded-2xl bg-neutral-900/95 border border-neutral-700/70 focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500/30 shadow-2xl backdrop-blur-md transition-all"
          >
            {/* Multi-line Auto-Expanding Textarea */}
            <div className="px-3 pt-2.5 pb-1">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  setSuggestionIndex(0);
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
                  }
                }}
                onKeyDown={handleTextareaKeyDown}
                onFocus={() => {
                  setTimeout(() => scrollToBottom('smooth'), 180);
                }}
                placeholder="Message Kōrero, type @bot to direct, or Shift+Enter for new line..."
                className="w-full bg-transparent text-white text-xs sm:text-sm placeholder-neutral-500 focus:outline-none resize-none leading-relaxed min-h-[26px] max-h-44 overflow-y-auto block"
              />
            </div>

            {/* Bottom Bar: Plus Menu & Controls on Left, Modern Send Button on Right */}
            <div className="flex items-center justify-between px-2 pb-2 pt-1 gap-2 border-t border-neutral-800/60 relative">
              <div className="flex items-center gap-1.5 relative">
                {/* Plus (+) Tool Button */}
                <button
                  type="button"
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition cursor-pointer shrink-0 z-10 ${
                    showPlusMenu
                      ? 'bg-neutral-700 text-white rotate-45'
                      : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white'
                  }`}
                  title="Open tools & actions (+)"
                  aria-label="Add options"
                >
                  <Plus size={16} className="transition-transform duration-200" />
                </button>

                {/* Hear Me Quick Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!inputText.trim()) {
                      setInputText('/hearme ');
                    } else {
                      handleSendHearMe(inputText.trim());
                    }
                    textareaRef.current?.focus();
                  }}
                  className="h-7 px-2 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-300 hover:bg-amber-900/40 hover:text-amber-100 text-[11px] font-medium transition flex items-center gap-1 cursor-pointer shrink-0"
                  title="Issue /hearme priority instruction"
                >
                  <Zap size={11} className="fill-current" />
                  <span className="hidden sm:inline">Hear Me</span>
                </button>

                {/* Poll Quick Button */}
                <button
                  type="button"
                  onClick={() => setShowCreatePollModal(true)}
                  className="h-7 px-2 rounded-lg bg-neutral-800/70 hover:bg-neutral-800 text-neutral-300 hover:text-white text-[11px] font-medium transition flex items-center gap-1 cursor-pointer shrink-0"
                  title="Create group poll"
                >
                  <BarChart2 size={12} />
                  <span className="hidden sm:inline">Poll</span>
                </button>

                {/* Sticker Quick Button */}
                <button
                  type="button"
                  onClick={() => setShowStickerModal(true)}
                  className="h-7 px-2 rounded-lg bg-neutral-800/70 hover:bg-neutral-800 text-neutral-300 hover:text-white text-[11px] font-medium transition flex items-center gap-1 cursor-pointer shrink-0"
                  title="Send mascot sticker or emoji"
                >
                  <Smile size={13} />
                  <span className="hidden sm:inline">Stickers</span>
                </button>

                {/* Plus popover dropdown menu - High Elevation Shadow, positioned cleanly */}
                {showPlusMenu && (
                  <div
                    ref={plusMenuRef}
                    className="absolute bottom-[calc(100%+12px)] left-0 w-64 sm:w-72 max-w-[calc(100vw-2rem)] bg-neutral-900/98 backdrop-blur-2xl border border-neutral-700/90 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] p-2 z-30 animate-in fade-in slide-in-from-bottom-3 duration-150"
                  >
                    <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Quick Tools & Actions
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPlusMenu(false);
                          setInputText('/image ');
                          textareaRef.current?.focus();
                        }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-neutral-800 text-neutral-200 hover:text-white transition cursor-pointer text-xs group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-orange-950/60 border border-orange-800/60 flex items-center justify-center text-orange-400 group-hover:scale-105 transition shrink-0">
                          <ImageIcon size={14} />
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-white">Generate Image (/image)</div>
                          <div className="text-[10px] text-neutral-400">AI text-to-image artwork generator</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowPlusMenu(false);
                          if (!inputText.trim()) {
                            setInputText('/hearme ');
                          } else {
                            handleSendHearMe(inputText.trim());
                          }
                          textareaRef.current?.focus();
                        }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-neutral-800 text-neutral-200 hover:text-white transition cursor-pointer text-xs group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400 group-hover:scale-105 transition shrink-0">
                          <Zap size={14} className="fill-current" />
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-white">Hear Me (/hearme)</div>
                          <div className="text-[10px] text-neutral-400">Direct all bots to focus on this instruction</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowPlusMenu(false);
                          setShowCreatePollModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-neutral-800 text-neutral-200 hover:text-white transition cursor-pointer text-xs group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition shrink-0">
                          <BarChart2 size={14} />
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-white">Create Group Poll</div>
                          <div className="text-[10px] text-neutral-400">Launch a multi-option vote for everyone</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowPlusMenu(false);
                          setShowStickerModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-neutral-800 text-neutral-200 hover:text-white transition cursor-pointer text-xs group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition shrink-0">
                          <Smile size={14} />
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-white">Custom Stickers & Emojis</div>
                          <div className="text-[10px] text-neutral-400">Send Kōrero mascot expressions & art</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowPlusMenu(false);
                          setInputText((prev) => `@Pixel please analyze this and create a chart: `);
                          textareaRef.current?.focus();
                        }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-neutral-800 text-neutral-200 hover:text-white transition cursor-pointer text-xs group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400 group-hover:scale-105 transition shrink-0">
                          <Code2 size={14} />
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-white">Python Chart / Math</div>
                          <div className="text-[10px] text-neutral-400">Pixel sandbox calculations & visualizations</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modern Fluid Send Button (ArrowUp style with ASCII spinner feedback during generation) */}
              <button
                type="submit"
                disabled={!inputText.trim() || isSendingMessage || isGeneratingImage}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition shrink-0 ${
                  isGeneratingImage || isSendingMessage
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50 shadow-lg cursor-wait'
                    : inputText.trim()
                    ? 'bg-white text-black hover:bg-neutral-200 shadow-md cursor-pointer active:scale-95'
                    : 'bg-neutral-800/60 text-neutral-500 cursor-not-allowed'
                }`}
                title={
                  isGeneratingImage
                    ? 'Generating image with Cloudflare Flux 1 Schnell...'
                    : isSendingMessage
                    ? 'Sending message...'
                    : 'Send message (Enter)'
                }
                aria-label="Send message"
              >
                {isGeneratingImage || isSendingMessage ? (
                  <span className="font-mono text-sm font-bold text-orange-400 select-none animate-pulse">
                    {ASCII_SPINNER_FRAMES[asciiSpinnerIdx % ASCII_SPINNER_FRAMES.length]}
                  </span>
                ) : (
                  <ArrowUp size={16} className="stroke-[2.5]" />
                )}
              </button>
            </div>
          </form>
        </div>
      </footer>

      {/* Retractable Side Menu Drawer */}
      <SideMenuDrawer
        isOpen={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        onNewChat={() => setShowNewChatModal(true)}
        nsfwMode={nsfwMode}
        onToggleNsfw={handleToggleNsfw}
        personas={personas}
        onOpenCreatePersona={() => setShowCreatePersonaModal(true)}
        onEditPersona={(p) => setEditingPersona(p)}
        onDeletePersona={handleDeletePersona}
        onSelectPersonaForTurn={(name) => {
          setNextSpeaker(name);
          executeTurn(name);
        }}
        contexts={contexts}
        currentContextId={currentContextId}
        onSwitchContext={handleSwitchContext}
        settings={{
          ...settings,
          keys: deviceKeys,
          hasGroqKey: deviceKeys.some((k) => k.provider === 'groq' && k.isActive && !!(k.rawKey || k.key)),
          hasCloudflareKey: deviceKeys.some((k) => k.provider === 'cloudflare' && k.isActive && !!(k.rawKey || k.key)),
          hasOpenRouterKey: deviceKeys.some((k) => k.provider === 'openrouter' && k.isActive && !!(k.rawKey || k.key)),
          hasNvidiaKey: deviceKeys.some((k) => k.provider === 'nvidia' && k.isActive && !!(k.rawKey || k.key)),
          hasTavilyKey: deviceKeys.some((k) => k.provider === 'tavily' && k.isActive && !!(k.rawKey || k.key)),
          hasApiKey: deviceKeys.some((k) => k.isActive && !!(k.rawKey || k.key)),
        }}
        onSelectModel={handleSelectModel}
        onRefreshModels={handleRefreshModels}
        isRefreshingModels={isRefreshingModels}
        onSaveKey={handleSaveKeyDirect}
        onToggleKey={handleToggleKey}
        onDeleteKey={handleDeleteKey}
        onTestModel={handleTestConnection}
        isTestingModel={isTestingKey}
        testResult={testResult}
      />

      {/* Mascot Sticker Picker Modal */}
      <StickerPickerModal
        isOpen={showStickerModal}
        onClose={() => setShowStickerModal(false)}
        onSelectSticker={handleSendSticker}
      />

      {/* Avatar Picker / Customization Modal */}
      <AvatarPickerModal
        isOpen={showAvatarPickerModal}
        onClose={() => setShowAvatarPickerModal(false)}
        currentAvatarName={myAvatar.name}
        onSelectAvatar={handleSelectUserAvatar}
      />

      {/* Start New Conversation Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        personas={personas}
        onStartChat={handleStartNewChat}
        nsfwMode={nsfwMode}
      />

      {/* Modify Bots in Existing Conversation Modal */}
      {showChangeChatBotsModal && (
        <NewChatModal
          isOpen={showChangeChatBotsModal}
          onClose={() => setShowChangeChatBotsModal(false)}
          personas={personas}
          onStartChat={async (_unusedTitle, selectedIds) => {
            await handleUpdateCurrentContextBots(selectedIds);
          }}
          nsfwMode={nsfwMode}
        />
      )}

      {/* Create Bot Persona Modal */}
      <CreatePersonaModal
        isOpen={showCreatePersonaModal}
        onClose={() => setShowCreatePersonaModal(false)}
        onSave={handleCreatePersona}
        globalNsfwEnabled={nsfwMode}
        availableModels={settings.availableModels}
      />

      {/* Edit Bot Persona Modal */}
      <EditPersonaModal
        isOpen={!!editingPersona}
        onClose={() => setEditingPersona(null)}
        persona={editingPersona}
        onSave={handleUpdatePersona}
        globalNsfwEnabled={nsfwMode}
        availableModels={settings.availableModels}
      />

      {/* Create Group Poll Modal */}
      <CreatePollModal
        isOpen={showCreatePollModal}
        onClose={() => setShowCreatePollModal(false)}
        onCreatePoll={handleCreatePoll}
      />

      {/* Pixel task.md Modal */}
      <PixelTaskModal
        isOpen={showPixelTaskModal}
        onClose={() => setShowPixelTaskModal(false)}
        task={selectedTask || activePixelTask}
        onClearTask={() => {
          setActivePixelTask(null);
          setSelectedTask(null);
          setShowPixelTaskModal(false);
          fetch(`/api/pixel/task/${currentContextId}/clear`, {
            method: 'POST',
            headers: getClientAuthHeaders(),
          }).catch(() => {});
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 border border-neutral-800 text-white text-xs px-3.5 py-1.5 rounded shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toastMessage}
        </div>
      )}

      {/* PWA Offline Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}
