import { daysOpen } from './format';
import type { ClientFeedback, ClientRow, CockpitClient, ProfileMap } from '../types';

/**
 * Offene Schritte eines Kunden.
 *
 * Schritt-IDs sind stabil und offene Schritte wiederholen sich an Folgetagen mit
 * ihrer Original-ID — deshalb wird nach ID dedupliziert, sonst zaehlt derselbe
 * offene Schritt pro Report mit. `oldest` ist das Alter des aeltesten Reports,
 * in dem noch ein offener Schritt steht.
 */
export function openSteps(
  client: CockpitClient,
  fb: ClientFeedback,
): { n: number; oldest: number } {
  const open = new Set<string>();
  let oldest = 0;
  for (const report of client.reports) {
    for (const step of report.steps) {
      if (fb.steps[step.id]?.done) continue;
      open.add(step.id);
      oldest = Math.max(oldest, daysOpen(report.date));
    }
  }
  return { n: open.size, oldest };
}

export function notesCount(fb: ClientFeedback): number {
  return Object.values(fb.notes).filter((t) => t && t.trim()).length;
}

/** Kunden aus der `clients`-Tabelle, die noch keinen Report haben. */
export function pendingClients(
  profiles: ProfileMap,
  clients: CockpitClient[],
): ClientRow[] {
  return Object.values(profiles).filter(
    (p) => p.active !== false && !clients.some((c) => c.id === p.id),
  );
}

export interface Totals {
  clientCount: number;
  critCount: number;
  openTotal: number;
  notesTotal: number;
}

export function computeTotals(
  clients: CockpitClient[],
  profiles: ProfileMap,
  feedbackFor: (id: string) => ClientFeedback,
): Totals {
  let critCount = 0;
  let openTotal = 0;
  let notesTotal = 0;
  for (const c of clients) {
    const fb = feedbackFor(c.id);
    if (c.status === 'critical') critCount++;
    openTotal += openSteps(c, fb).n;
    notesTotal += notesCount(fb);
  }
  return {
    clientCount: clients.length + pendingClients(profiles, clients).length,
    critCount,
    openTotal,
    notesTotal,
  };
}
