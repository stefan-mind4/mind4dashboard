import type {
  AdjustmentRow,
  ClientRow,
  FeedbackMap,
  ReportRow,
} from '../types';

const FEEDBACK_KEY = 'm4-ads-cockpit-feedback-v1';
const CACHE_KEY = 'm4-ads-cockpit-cache-v1';

interface CachePayload {
  reports: ReportRow[];
  clients: ClientRow[];
  adjustments: AdjustmentRow[];
  savedAt: string;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota oder privater Modus — Offline-Spiegel ist optional.
  }
}

export function loadFeedback(): FeedbackMap {
  return read<FeedbackMap>(FEEDBACK_KEY) ?? {};
}

export function saveFeedback(fb: FeedbackMap): void {
  write(FEEDBACK_KEY, fb);
}

/**
 * Spiegel des letzten erfolgreichen Ladevorgangs. Dient als Offline-Fallback —
 * bewusst echte Daten und keine Beispieldaten, damit im Offline-Fall keine
 * erfundenen Zahlen im Cockpit stehen.
 */
export function loadCache(): CachePayload | null {
  return read<CachePayload>(CACHE_KEY);
}

export function saveCache(
  data: Omit<CachePayload, 'savedAt'>,
): void {
  write(CACHE_KEY, { ...data, savedAt: new Date().toISOString() });
}
