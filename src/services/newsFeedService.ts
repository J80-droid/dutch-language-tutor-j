import { logEvent } from '../utils/logger';

export interface NewsFeedEntry {
    id: string;
    title: string;
    summary: string;
    publishedAt: string | null;
    sourceUrl: string;
    sourceName: string;
    headlineUrl?: string;
}

type FeedKind = 'rss' | 'json';

interface FeedConfig {
    id: string;
    sourceName: string;
    url: string;
    kind: FeedKind;
    homepage: string;
    itemPath?: string;
    titlePath?: string;
    bodyPath?: string;
    datePath?: string;
    linkPath?: string;
}

interface FeedCache {
    timestamp: number;
    entries: NewsFeedEntry[];
}

const CACHE_KEY = 'newsFeedCache:v1';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minuten
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const FEEDS: FeedConfig[] = [
    {
        id: 'nos',
        sourceName: 'NOS',
        url: 'https://feeds.nos.nl/nosnieuwsalgemeen',
        kind: 'rss',
        homepage: 'https://nos.nl',
    },
    {
        id: 'nu',
        sourceName: 'NU.nl',
        url: 'https://www.nu.nl/rss/Algemeen',
        kind: 'rss',
        homepage: 'https://www.nu.nl',
    },
    {
        id: 'wikinews',
        sourceName: 'Wikinews',
        url: 'https://nl.wikinews.org/w/index.php?title=Speciaal:NieuwePaginas&feed=rss',
        kind: 'rss',
        homepage: 'https://nl.wikinews.org',
    },
];

const appendProxyParam = (base: string, target: string) =>
    `${base}${base.includes('?') ? '&' : '?'}url=${encodeURIComponent(target)}`;

const buildRequestUrl = (url: string) => {
    const proxy = import.meta.env.VITE_NEWS_PROXY_URL?.trim();
    if (proxy && proxy.length > 0) {
        const trimmed = proxy.endsWith('/') ? proxy.slice(0, -1) : proxy;
        return appendProxyParam(trimmed, url);
    }
  return appendProxyParam('/api/news-proxy', url);
};

const readCache = (): FeedCache | null => {
    if (!isBrowser) {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as FeedCache;
        if (parsed.timestamp && parsed.entries && Array.isArray(parsed.entries)) {
            const age = Date.now() - parsed.timestamp;
            if (age < CACHE_TTL_MS) {
                return parsed;
            }
        }
    } catch (error) {
        console.warn('[news] kon cache niet lezen', error);
    }
    return null;
};

const writeCache = (entries: NewsFeedEntry[]) => {
    if (!isBrowser) {
        return;
    }
    try {
        const payload: FeedCache = {
            timestamp: Date.now(),
            entries,
        };
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch (error) {
        console.warn('[news] kon cache niet schrijven', error);
    }
};

const stripHtml = (input: string | null | undefined) => {
    if (!input) return '';
    return input
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const normaliseDate = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed.toISOString();
};

const parseRssFeed = (xmlText: string, config: FeedConfig): NewsFeedEntry[] => {
    try {
        const parser = new DOMParser();
        const document = parser.parseFromString(xmlText, 'application/xml');
        const items = Array.from(document.querySelectorAll('item'));
        return items.map((item, index) => {
            const title = item.querySelector('title')?.textContent ?? 'Onbekend nieuws';
            const description = item.querySelector('description')?.textContent ?? '';
            const pubDate =
                item.querySelector('pubDate')?.textContent ??
                item.querySelector('date')?.textContent ??
                null;
            const link =
                item.querySelector('link')?.textContent ??
                item.querySelector('guid')?.textContent ??
                config.homepage;

            return {
                id: `${config.id}-${index}-${title.slice(0, 20)}`,
                title: stripHtml(title),
                summary: stripHtml(description),
                publishedAt: normaliseDate(pubDate),
                sourceUrl: config.homepage,
                sourceName: config.sourceName,
                headlineUrl: link ?? config.homepage,
            };
        });
    } catch (error) {
        console.warn(`[news] kon RSS niet parsen voor ${config.sourceName}`, error);
        return [];
    }
};

const fetchFeed = async (config: FeedConfig): Promise<NewsFeedEntry[]> => {
    const requestUrl = buildRequestUrl(config.url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(requestUrl, {
            method: 'GET',
            headers: {
                Accept: 'application/rss+xml, application/xml, text/xml, application/json, text/plain, */*',
            },
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const text = await response.text();
        return parseRssFeed(text, config);
    } finally {
        clearTimeout(timeout);
    }
};

const dedupeAndSort = (entries: NewsFeedEntry[]): NewsFeedEntry[] => {
    const seen = new Map<string, NewsFeedEntry>();
    for (const entry of entries) {
        const key = entry.title.toLowerCase();
        if (!seen.has(key)) {
            seen.set(key, entry);
        } else {
            const existing = seen.get(key)!;
            if (!existing.publishedAt && entry.publishedAt) {
                seen.set(key, entry);
            }
        }
    }
    return Array.from(seen.values()).sort((a, b) => {
        if (!a.publishedAt && !b.publishedAt) return 0;
        if (!a.publishedAt) return 1;
        if (!b.publishedAt) return -1;
        return b.publishedAt.localeCompare(a.publishedAt);
    });
};

export const fetchNewsHeadlines = async (forceRefresh = false): Promise<NewsFeedEntry[]> => {
    if (!isBrowser) {
        return [];
    }
    if (!forceRefresh) {
        const cached = readCache();
        if (cached) {
            return cached.entries;
        }
    }

    const settled = await Promise.allSettled(FEEDS.map(feed => fetchFeed(feed)));
    const aggregated: NewsFeedEntry[] = [];
    const errors: Array<{ source: string; error: string }> = [];

    settled.forEach((result, index) => {
        const feed = FEEDS[index];
        if (result.status === 'fulfilled') {
            aggregated.push(...result.value);
        } else {
            const message =
                result.reason instanceof Error ? result.reason.message : String(result.reason);
            errors.push({ source: feed.sourceName, error: message });
            logEvent('news', 'Feed fetch failed', {
                level: 'warn',
                data: {
                    source: feed.sourceName,
                    message,
                },
            });
        }
    });

    const deduped = dedupeAndSort(aggregated).slice(0, 30);
    if (deduped.length > 0) {
        writeCache(deduped);
    }

    if (errors.length > 0 && deduped.length === 0) {
        throw new Error(
            `Kon geen nieuwsitems laden: ${errors.map(e => `${e.source} (${e.error})`).join(', ')}`,
        );
    }

    return deduped;
};

export const clearNewsCache = () => {
    if (!isBrowser) {
        return;
    }
    try {
        window.localStorage.removeItem(CACHE_KEY);
    } catch (error) {
        console.warn('[news] kon cache niet leegmaken', error);
    }
};

