import { statusMap } from '../lib/format';
import type { ClientFeedback, Report } from '../types';

interface Props {
  reports: Report[];
  activeIdx: number;
  feedback: ClientFeedback;
  onSelect: (idx: number) => void;
}

export default function ReportArchive({ reports, activeIdx, feedback, onSelect }: Props) {
  return (
    <div className="archive">
      <div className="archive__title">Report archive</div>
      {reports.map((r, i) => {
        const open = r.steps.filter((s) => !feedback.steps[s.id]?.done).length;
        const active = i === activeIdx;
        return (
          <button
            type="button"
            key={`${r.date}-${i}`}
            className="archive__row"
            onClick={() => onSelect(i)}
            style={{
              background: active ? '#F0FDFA' : 'transparent',
              border: `1px solid ${active ? '#99F6E4' : 'transparent'}`,
            }}
          >
            <span
              className="archive__dot"
              style={{ background: statusMap(r.status).color }}
            />
            <div style={{ flex: 1 }}>
              <div className="archive__label">{r.label}</div>
              <div className="archive__weekday">{r.weekday}</div>
            </div>
            {open > 0 && <span className="archive__badge">{open}</span>}
          </button>
        );
      })}
      <div className="archive__hint">Badge = open actions in that report.</div>
    </div>
  );
}
