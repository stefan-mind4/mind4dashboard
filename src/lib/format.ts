import type { ClientStatus, Direction, Severity } from '../types';

/** Farbpaare der Design-Tokens. */
export const STATUS_MAP: Record<
  ClientStatus,
  { color: string; bg: string; label: string }
> = {
  critical: { color: '#DC2626', bg: '#FEE2E2', label: 'CRITICAL' },
  warning: { color: '#B45309', bg: '#FEF3C7', label: 'WARNING' },
  ok: { color: '#047857', bg: '#D1FAE5', label: 'OK' },
};

export const SEVERITY_MAP: Record<
  Severity,
  { color: string; bg: string; label: string }
> = {
  crit: { color: '#DC2626', bg: '#FEF1F1', label: 'Critical' },
  warn: { color: '#D97706', bg: '#FDF6E7', label: 'Warning' },
  info: { color: '#4F46E5', bg: '#EEF1FE', label: 'Info' },
  ok: { color: '#059669', bg: '#EAF7F1', label: 'OK' },
};

const NEUTRAL = { color: '#64748B', bg: '#F8FAFC', label: '—' };

export function statusMap(s: ClientStatus | string | undefined) {
  return STATUS_MAP[(s ?? 'ok') as ClientStatus] ?? STATUS_MAP.ok;
}

export function sevMap(s: Severity | null | undefined) {
  if (!s) return NEUTRAL;
  return SEVERITY_MAP[s] ?? NEUTRAL;
}

export function dirColor(d: Direction | string | undefined): string {
  const map: Record<string, string> = {
    up: '#DC2626',
    down: '#B45309',
    flat: '#64748B',
    good: '#047857',
  };
  return map[d ?? ''] ?? '#64748B';
}

/** SVG-Pfad der Kosten-Sparkline (140x40 Viewbox, 4px Innenabstand). */
export function sparkPath(vals: number[]): string {
  const clean = vals.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return '';
  if (clean.length === 1) return `M4 20 L136 20`;
  const w = 140;
  const h = 40;
  const mn = Math.min(...clean);
  const mx = Math.max(...clean);
  const range = mx - mn || 1;
  return clean
    .map((v, i) => {
      const x = 4 + (i * (w - 8)) / (clean.length - 1);
      const y = h - 5 - ((v - mn) / range) * (h - 10);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Heute als YYYY-MM-DD in lokaler Zeit (nicht UTC — sonst kippt der Tag abends). */
export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Alter eines Reports in Tagen, gemessen an heute. Nie negativ. */
export function daysOpen(reportDate: string): number {
  const diff = Date.parse(todayISO()) - Date.parse(reportDate);
  if (Number.isNaN(diff)) return 0;
  return Math.max(0, Math.round(diff / 864e5));
}

/** `2026-08-16` → `16.08.2026` */
export function formatDMY(iso: string | null | undefined): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

/** Kopfzeilen-Datum, z.B. `Mon, 17 Aug 2026`. */
export function headerDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function plural(n: number, singular: string, pluralForm = singular + 's') {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/** Slug fuer die `clients.id` aus dem Kundennamen. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
