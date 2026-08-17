import { notesCount, openSteps } from '../lib/derive';
import { plural, sparkPath, statusMap } from '../lib/format';
import type { ClientFeedback, CockpitClient } from '../types';

interface Props {
  client: CockpitClient;
  feedback: ClientFeedback;
  onOpen: () => void;
}

/** Kosten-Delta des letzten Tages gegen den Vortag. */
function spendDelta(cost: number[]): { label: string; color: string } {
  const last = cost[cost.length - 1];
  const prev = cost[cost.length - 2];
  if (last === undefined || prev === undefined || prev === 0) {
    return { label: 'no comparison day', color: '#64748B' };
  }
  const d = Math.round(((last - prev) / prev) * 100);
  return {
    label: `${d > 0 ? '+' : ''}${d} % vs. prev. day`,
    color: d > 25 ? '#DC2626' : d < -25 ? '#B45309' : '#64748B',
  };
}

export default function ClientCard({ client, feedback, onOpen }: Props) {
  const status = statusMap(client.status);
  const os = openSteps(client, feedback);
  const notes = notesCount(feedback);
  const cost = client.series.cost ?? [];
  const last = cost[cost.length - 1];
  const delta = spendDelta(cost);

  return (
    <div
      className="client-card client-card--clickable"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="client-card__top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="client-card__name">
            {client.name}
            {client.mock && <span className="demo-badge">DEMO DATA</span>}
          </div>
          <div className="client-card__meta">
            {client.domain} · {client.account}
          </div>
        </div>
        <span
          className="status-pill"
          style={{ color: status.color, background: status.bg }}
        >
          {status.label}
        </span>
      </div>

      <div className="client-card__mid">
        <div>
          <div className="client-card__spendlabel">Spend yesterday</div>
          <div className="client-card__spend">
            {last === undefined ? '—' : `${last.toLocaleString('de-AT')} €`}
          </div>
          <div className="client-card__delta" style={{ color: delta.color }}>
            {delta.label}
          </div>
        </div>
        <svg viewBox="0 0 140 40" className="spark" aria-hidden="true">
          <path
            d={sparkPath(cost)}
            fill="none"
            stroke={status.color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="client-card__foot">
        <span style={{ fontWeight: 600, color: os.n ? '#0F172A' : '#94A3B8' }}>
          {os.n === 0
            ? 'No open actions'
            : `${plural(os.n, 'open action')}${os.oldest > 0 ? ` · oldest ${os.oldest}d` : ''}`}
        </span>
        {notes > 0 && (
          <span className="notes-badge">{plural(notes, 'note')} for AI</span>
        )}
        <span className="client-card__reports">
          {plural(client.reports.length, 'report')} →
        </span>
      </div>
    </div>
  );
}

/** Kunde aus der `clients`-Tabelle, der noch auf seinen ersten Report wartet. */
export function PendingClientCard({
  name,
  domain,
  account,
}: {
  name: string;
  domain: string | null;
  account: string | null;
}) {
  return (
    <div className="client-card">
      <div className="client-card__top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="client-card__name">{name}</div>
          <div className="client-card__meta">
            {domain || '—'} · {account ?? ''}
          </div>
        </div>
        <span
          className="status-pill"
          style={{ color: '#64748B', background: '#F1F5F9' }}
        >
          PENDING
        </span>
      </div>

      <div className="client-card__mid">
        <div>
          <div className="client-card__spendlabel">Spend yesterday</div>
          <div className="client-card__spend">—</div>
          <div className="client-card__delta" style={{ color: '#94A3B8' }}>
            awaiting first daily run
          </div>
        </div>
        <svg viewBox="0 0 140 40" className="spark" aria-hidden="true">
          <path
            d={sparkPath([0, 0])}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="client-card__foot">
        <span style={{ fontWeight: 600, color: '#94A3B8' }}>No reports yet</span>
        <span className="client-card__reports">0 reports</span>
      </div>
    </div>
  );
}
