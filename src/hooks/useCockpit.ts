import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../lib/supabase';
import { loadCache, loadFeedback, saveCache, saveFeedback } from '../lib/cache';
import { todayISO } from '../lib/format';
import type {
  AdjustmentRow,
  ClientFeedback,
  ClientRow,
  CockpitClient,
  FeedbackMap,
  FeedbackRow,
  ProfileMap,
  Report,
  ReportRow,
  SyncState,
} from '../types';

const EMPTY_FEEDBACK: ClientFeedback = { steps: {}, notes: {} };

/**
 * Baut aus den `reports`-Zeilen das Frontend-Modell. Die Zeilen kommen nach
 * report_date absteigend — die Meta des neuesten Reports gewinnt (Status,
 * Serie), die Kundenreihenfolge folgt dem juengsten Report.
 */
export function fromRows(rows: ReportRow[]): CockpitClient[] {
  const map = new Map<string, { meta: ReportRow['payload']['meta'] | null; reports: Report[] }>();
  for (const row of rows) {
    const payload = row.payload;
    if (!payload?.report) continue; // defekte Zeile ueberspringen statt crashen
    let entry = map.get(row.client);
    if (!entry) {
      entry = { meta: payload.meta ?? null, reports: [] };
      map.set(row.client, entry);
    }
    entry.reports.push(payload.report);
  }
  return [...map.entries()].map(([id, entry]) => {
    const meta = entry.meta;
    entry.reports.sort((a, b) => (a.date < b.date ? 1 : -1));
    return {
      id,
      name: meta?.name || id,
      domain: meta?.domain || '',
      account: meta?.account || '',
      mock: !!meta?.mock,
      status: meta?.status || 'ok',
      series: meta?.series?.cost?.length ? meta.series : { cost: [0, 0] },
      reports: entry.reports.map((r) => ({
        ...r,
        kpis: r.kpis ?? [],
        anomalies: r.anomalies ?? [],
        steps: r.steps ?? [],
        campaigns: r.campaigns ?? [],
      })),
    };
  });
}

/** Server-Feedback ueber den localStorage-Spiegel legen — der Server gewinnt. */
function mergeFeedback(base: FeedbackMap, rows: FeedbackRow[]): FeedbackMap {
  const fb: FeedbackMap = {};
  for (const [client, val] of Object.entries(base)) {
    fb[client] = { steps: { ...(val.steps ?? {}) }, notes: { ...(val.notes ?? {}) } };
  }
  for (const row of rows) {
    const cur = (fb[row.client] ??= { steps: {}, notes: {} });
    if (row.item_id.startsWith('a:')) {
      if (row.note) cur.notes[row.item_id] = row.note;
    } else {
      if (row.done) cur.steps[row.item_id] = { done: true, doneAt: row.updated_at ?? null };
      else delete cur.steps[row.item_id];
      if (row.note) cur.notes[`s:${row.item_id}`] = row.note;
    }
  }
  return fb;
}

export interface Cockpit {
  clients: CockpitClient[] | null;
  profiles: ProfileMap;
  adjustments: AdjustmentRow[];
  feedback: FeedbackMap;
  sync: SyncState;
  feedbackFor: (clientId: string) => ClientFeedback;
  toggleStep: (clientId: string, reportDate: string, stepId: string, done: boolean) => void;
  setNote: (clientId: string, reportDate: string, noteKey: string, text: string) => void;
  saveDescription: (clientId: string, text: string) => void;
  descStatus: Record<string, 'saving' | 'saved' | 'error'>;
  logAdjustment: (clientId: string, date: string, text: string) => void;
  addClient: (row: Omit<ClientRow, 'updated_at'>) => Promise<void>;
}

export function useCockpit(): Cockpit {
  const [clients, setClients] = useState<CockpitClient[] | null>(null);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackMap>({});
  const [sync, setSync] = useState<SyncState>('connecting');
  const [descStatus, setDescStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Immer der aktuellste Stand fuer debounced Writes, ohne Callback-Neuerzeugung.
  const feedbackRef = useRef<FeedbackMap>({});
  const profilesRef = useRef<ProfileMap>({});
  feedbackRef.current = feedback;
  profilesRef.current = profiles;

  useEffect(() => {
    let alive = true;
    const stored = loadFeedback();
    setFeedback(stored);

    (async () => {
      try {
        const [reportRows, feedbackRows, clientRows, adjRows] = await Promise.all([
          api.getReports(),
          api.getFeedback(),
          api.getClients(),
          api.getAdjustments(),
        ]);
        if (!alive) return;
        const merged = mergeFeedback(stored, feedbackRows);
        saveFeedback(merged);
        saveCache({ reports: reportRows, clients: clientRows, adjustments: adjRows });
        const profileMap: ProfileMap = {};
        for (const p of clientRows) profileMap[p.id] = p;
        setClients(fromRows(reportRows));
        setProfiles(profileMap);
        setAdjustments(adjRows);
        setFeedback(merged);
        setSync('live');
      } catch (err) {
        console.warn('Supabase nicht erreichbar — lokaler Cache wird verwendet.', err);
        if (!alive) return;
        const cached = loadCache();
        const profileMap: ProfileMap = {};
        for (const p of cached?.clients ?? []) profileMap[p.id] = p;
        setClients(fromRows(cached?.reports ?? []));
        setProfiles(profileMap);
        setAdjustments(cached?.adjustments ?? []);
        setSync('offline');
      }
    })();

    return () => {
      alive = false;
      for (const t of Object.values(timers.current)) clearTimeout(t);
    };
  }, []);

  const feedbackFor = useCallback(
    (clientId: string) => feedback[clientId] ?? EMPTY_FEEDBACK,
    [feedback],
  );

  const commit = useCallback((next: FeedbackMap) => {
    feedbackRef.current = next;
    saveFeedback(next);
    setFeedback(next);
  }, []);

  /** Kopie des Feedbacks eines Kunden, damit State nicht in-place mutiert wird. */
  const draft = useCallback((clientId: string): FeedbackMap => {
    const cur = feedbackRef.current;
    const entry = cur[clientId] ?? EMPTY_FEEDBACK;
    return {
      ...cur,
      [clientId]: { steps: { ...entry.steps }, notes: { ...entry.notes } },
    };
  }, []);

  /** Optimistisch schreiben; scheitert der Push, kippt die Sync-Pille auf offline. */
  const push = useCallback(
    (clientId: string, reportDate: string, itemId: string, done: boolean, note?: string) => {
      api
        .upsertFeedback({
          client: clientId,
          report_date: reportDate,
          item_id: itemId,
          done,
          note: (note ?? '').trim() || null,
        })
        .then(() => setSync((s) => (s === 'live' ? s : 'live')))
        .catch((err) => {
          console.warn('Feedback-Upsert fehlgeschlagen', err);
          setSync('offline');
        });
    },
    [],
  );

  const toggleStep = useCallback(
    (clientId: string, reportDate: string, stepId: string, done: boolean) => {
      const next = draft(clientId);
      const entry = next[clientId]!;
      if (done) entry.steps[stepId] = { done: true, doneAt: new Date().toISOString() };
      else delete entry.steps[stepId];
      commit(next);
      push(clientId, reportDate, stepId, done, entry.notes[`s:${stepId}`]);
    },
    [commit, draft, push],
  );

  const setNote = useCallback(
    (clientId: string, reportDate: string, noteKey: string, text: string) => {
      const next = draft(clientId);
      const entry = next[clientId]!;
      entry.notes[noteKey] = text;
      commit(next);

      const isStep = noteKey.startsWith('s:');
      const itemId = isStep ? noteKey.slice(2) : noteKey;
      const done = isStep ? !!entry.steps[itemId]?.done : false;
      clearTimeout(timers.current[noteKey]);
      timers.current[noteKey] = setTimeout(
        () => push(clientId, reportDate, itemId, done, text),
        900,
      );
    },
    [commit, draft, push],
  );

  const saveDescription = useCallback((clientId: string, text: string) => {
    const existing = profilesRef.current[clientId];
    const row: ClientRow = {
      id: clientId,
      name: existing?.name ?? clientId,
      domain: existing?.domain ?? null,
      account: existing?.account ?? null,
      mock: existing?.mock ?? false,
      active: existing?.active ?? true,
      description: text,
    };
    const nextProfiles = { ...profilesRef.current, [clientId]: row };
    profilesRef.current = nextProfiles;
    setProfiles(nextProfiles);
    setDescStatus((s) => ({ ...s, [clientId]: 'saving' }));

    const key = `desc:${clientId}`;
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => {
      api
        .upsertClient(row)
        .then(() => setDescStatus((s) => ({ ...s, [clientId]: 'saved' })))
        .catch((err) => {
          console.warn('Client-Description-Upsert fehlgeschlagen', err);
          setDescStatus((s) => ({ ...s, [clientId]: 'error' }));
        });
    }, 900);
  }, []);

  const logAdjustment = useCallback((clientId: string, date: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const row = { client: clientId, adj_date: date || todayISO(), text: trimmed };
    setAdjustments((cur) => [{ ...row, created_at: new Date().toISOString() }, ...cur]);
    api.addAdjustment(row).catch((err) => {
      console.warn('Adjustment-Insert fehlgeschlagen', err);
      setSync('offline');
    });
  }, []);

  const addClient = useCallback(async (row: Omit<ClientRow, 'updated_at'>) => {
    await api.upsertClient(row);
    setProfiles((cur) => ({ ...cur, [row.id]: row }));
  }, []);

  return {
    clients,
    profiles,
    adjustments,
    feedback,
    sync,
    feedbackFor,
    toggleStep,
    setNote,
    saveDescription,
    descStatus,
    logAdjustment,
    addClient,
  };
}
