// Datenmodell des Ads Cockpit.
//
// `ReportPayload` spiegelt das verbindliche JSON-Schema, das die taegliche
// Claude-Pipeline nach Supabase schreibt (google-ads-daily-alarm.md, Schritt 5b).
// Aenderungen hier muessen mit der Pipeline abgestimmt werden.

export type Severity = 'crit' | 'warn' | 'info' | 'ok';
export type ClientStatus = 'critical' | 'warning' | 'ok';
export type Direction = 'up' | 'down' | 'flat' | 'good';
export type SyncState = 'connecting' | 'live' | 'offline';

export interface Kpi {
  label: string;
  val: string;
  ref: string;
  delta: string;
  dir: Direction;
}

export interface Anomaly {
  sev: Severity;
  title: string;
  desc: string;
}

export interface Step {
  /** Stabil ueber Tage hinweg — offene Schritte wiederholen sich mit Original-ID. */
  id: string;
  text: string;
}

export interface KeywordFinding {
  k: string;
  cost: string;
  clicks: string;
  cpc: string;
  note: string;
}

export interface Campaign {
  name: string;
  cost: string;
  dev: string;
  dir: Direction;
  pct: string;
  impr: string;
  clicks: string;
  cpc: string;
  conv: string;
  share: string;
  sev: Severity | null;
  kw?: KeywordFinding[];
}

export interface Report {
  date: string;
  label: string;
  weekday: string;
  ref: string;
  status: ClientStatus;
  headline: string;
  kpis: Kpi[];
  anomalies: Anomaly[];
  steps: Step[];
  campaigns: Campaign[];
}

export interface ReportSeries {
  cost: number[];
  labels?: string[];
  cpc?: number[];
  conv?: number[];
}

export interface ReportMeta {
  name: string;
  domain: string;
  account: string;
  mock: boolean;
  status: ClientStatus;
  series: ReportSeries;
}

export interface ReportPayload {
  meta: ReportMeta;
  report: Report;
}

// --- Supabase-Zeilen ---

export interface ReportRow {
  client: string;
  report_date: string;
  payload: ReportPayload;
}

export interface ClientRow {
  id: string;
  name: string;
  domain: string | null;
  account: string | null;
  description: string | null;
  mock: boolean | null;
  active: boolean | null;
  updated_at?: string | null;
}

export interface FeedbackRow {
  client: string;
  report_date: string;
  /** Step-ID, oder `a:{date}:{index}` fuer Anomalie-Notizen. */
  item_id: string;
  done: boolean | null;
  note: string | null;
  updated_at?: string | null;
}

export interface AdjustmentRow {
  id?: number;
  client: string;
  adj_date: string;
  text: string;
  created_at?: string;
}

// --- Abgeleitetes Frontend-Modell ---

/** Ein Kunde mit allen seinen Reports, aus den `reports`-Zeilen zusammengesetzt. */
export interface CockpitClient {
  id: string;
  name: string;
  domain: string;
  account: string;
  mock: boolean;
  status: ClientStatus;
  series: ReportSeries;
  reports: Report[];
}

export interface StepFeedback {
  done: boolean;
  doneAt: string | null;
}

/** Feedback eines Kunden. Notes-Keys: `s:{stepId}` bzw. `a:{date}:{index}`. */
export interface ClientFeedback {
  steps: Record<string, StepFeedback>;
  notes: Record<string, string>;
}

export type FeedbackMap = Record<string, ClientFeedback>;
export type ProfileMap = Record<string, ClientRow>;
