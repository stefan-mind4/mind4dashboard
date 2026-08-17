import { useState } from 'react';
import { formatDMY, todayISO } from '../lib/format';
import type { AdjustmentRow } from '../types';

const DESC_STATUS: Record<string, string> = {
  saving: 'Saving …',
  saved: '✓ Saved to Supabase — the pipeline reads this on the next run',
  error: '⚠ Could not save — check connection / run the clients-table SQL',
};

interface Props {
  description: string;
  descStatus: 'saving' | 'saved' | 'error' | undefined;
  onDescription: (text: string) => void;
  adjustments: AdjustmentRow[];
  onLog: (date: string, text: string) => void;
}

export default function ClientSettings({
  description,
  descStatus,
  onDescription,
  adjustments,
  onLog,
}: Props) {
  const [date, setDate] = useState(todayISO());
  const [draft, setDraft] = useState('');

  const sorted = [...adjustments].sort((a, b) =>
    (b.adj_date || '') < (a.adj_date || '') ? -1 : 1,
  );

  function submit() {
    if (!draft.trim()) return;
    onLog(date, draft);
    setDraft('');
  }

  return (
    <div className="settings">
      <div className="settings__col">
        <div className="settings__title">Client profile — context for the AI</div>
        <div className="settings__hint">
          Business model, goals, known quirks — the daily pipeline reads this before
          interpreting the data.
        </div>
        <textarea
          className="desc-area"
          value={description}
          onChange={(e) => onDescription(e.target.value)}
          placeholder="e.g. Immobilien-Teilverkauf, Zielgruppe 60+, tCPA-Ziel 80 €, Brand-Kampagne nie pausieren, Saisonalität: Sommer schwach …"
        />
        <div className="desc-status">
          {descStatus
            ? DESC_STATUS[descStatus]
            : 'Stored in Supabase table “clients”'}
        </div>
      </div>

      <div className="settings__col">
        <div className="settings__title">Campaign adjustments</div>
        <div className="settings__hint">
          Log manual changes you made in Google Ads — so the AI explains spikes instead
          of flagging them.
        </div>
        <div className="adj-row">
          <input
            type="date"
            className="adj-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            type="text"
            className="adj-text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="e.g. Budget 'Search Brand' 50 → 80 €/Tag erhöht"
          />
          <button type="button" className="adj-log" onClick={submit}>
            Log
          </button>
        </div>
        <div className="adj-list">
          {sorted.length === 0 ? (
            <div className="adj-empty">Nothing logged yet.</div>
          ) : (
            sorted.map((a, i) => (
              <div className="adj-item" key={a.id ?? `${a.adj_date}-${i}`}>
                <span className="adj-item__date">{formatDMY(a.adj_date)}</span>
                <span className="adj-item__text">{a.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
