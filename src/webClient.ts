import { tavily } from '@tavily/core';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchLogEntry {
  id: number;
  query: string;
  result_count: number;
  timestamp: string;
}

export interface CrawlLogEntry {
  id: number;
  url: string;
  success: number;
  char_count: number;
  timestamp: string;
}

// In-memory caches & rate limits
const _search_cache: Record<string, [number, SearchResult[]]> = {};
const _crawl_cache: Record<string, [number, string]> = {};
const _CACHE_TTL = 3600 * 1000; // 1 hour in ms
let _search_count = 0;
let _crawl_count = 0;
const _MAX_SEARCHES = 50;
const _MAX_CRAWLS = 20;

// Logs stored in-memory
export const search_log: SearchLogEntry[] = [];
export const crawl_log: CrawlLogEntry[] = [];
let logAutoId = 1;

function getClient(overrideKey?: string) {
  const key = overrideKey?.trim();
  if (!key) return null;
  try {
    return tavily({ apiKey: key });
  } catch (err) {
    console.warn('[WebClient] Failed to initialize Tavily client:', err);
    return null;
  }
}

/**
 * Fetch web search results via Tavily intermediary
 */
export async function fetch_web_results(
  query: string,
  max_results: number = 5,
  customApiKey?: string
): Promise<SearchResult[]> {
  const key = query.trim().toLowerCase();
  const now = Date.now();

  // Check cache
  if (_search_cache[key] && now - _search_cache[key][0] < _CACHE_TTL) {
    return _search_cache[key][1];
  }

  // Rate limit
  if (_search_count >= _MAX_SEARCHES) {
    console.warn(`[WebClient] Session search limit reached (${_MAX_SEARCHES})`);
    return [];
  }

  const client = getClient(customApiKey);
  if (!client) {
    console.warn('[WebClient] Tavily client is not configured for this device/request.');
    return [];
  }

  try {
    const resp = await client.search(query, {
      searchDepth: 'advanced',
      maxResults: max_results,
      includeAnswer: false,
    });

    const rawResults = resp?.results || [];
    const results: SearchResult[] = rawResults.map((r: any) => ({
      title: String(r.title || ''),
      url: String(r.url || ''),
      snippet: String(r.content || '').slice(0, 500),
    }));

    _search_cache[key] = [now, results];
    _search_count++;

    search_log.push({
      id: logAutoId++,
      query,
      result_count: results.length,
      timestamp: new Date().toISOString(),
    });

    return results;
  } catch (err: any) {
    console.error(`[WebClient] Tavily search error on "${query}":`, err?.message || err);
    return [];
  }
}

/**
 * Fetch full page markdown / text via Tavily extraction or fallback
 */
export async function fetch_full_page(
  url: string,
  max_chars: number = 3000,
  customApiKey?: string
): Promise<string> {
  const now = Date.now();

  if (_crawl_cache[url] && now - _crawl_cache[url][0] < _CACHE_TTL) {
    return _crawl_cache[url][1];
  }

  if (_crawl_count >= _MAX_CRAWLS) {
    console.warn(`[WebClient] Session crawl limit reached (${_MAX_CRAWLS})`);
    return '';
  }

  let content = '';
  const client = getClient(customApiKey);

  try {
    if (client && typeof client.extract === 'function') {
      const resp = await client.extract([url]);
      const raw = resp?.results?.[0]?.rawContent || '';
      content = String(raw).slice(0, max_chars);
    }

    // Fallback: standard fetch if Tavily extraction didn't return content
    if (!content) {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KoreroBot/1.0)' },
      });
      if (res.ok) {
        const text = await res.text();
        // Simple HTML tag strip
        const clean = text
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        content = clean.slice(0, max_chars);
      }
    }

    const success = content.length > 0 ? 1 : 0;
    _crawl_cache[url] = [now, content];
    _crawl_count++;

    crawl_log.push({
      id: logAutoId++,
      url,
      success,
      char_count: content.length,
      timestamp: new Date().toISOString(),
    });

    return content;
  } catch (err: any) {
    crawl_log.push({
      id: logAutoId++,
      url,
      success: 0,
      char_count: 0,
      timestamp: new Date().toISOString(),
    });
    return '';
  }
}

/**
 * Format search results into a clean markdown block for prompt injection
 */
export function format_search_results(results: SearchResult[]): string {
  if (!results || results.length === 0) {
    return 'No search results available.';
  }
  return (
    'Search results:\n' +
    results.map((r) => `- ${r.title}: ${r.snippet} (${r.url})`).join('\n')
  );
}

/**
 * Format crawl result into a clean markdown block for prompt injection
 */
export function format_crawl_result(url: string, content: string): string {
  return content
    ? `Full content from ${url}:\n${content}`
    : `Could not retrieve content from ${url}.`;
}
