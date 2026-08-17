import NoteField from './NoteField';
import { sevMap } from '../lib/format';
import type { ClientFeedback, Report } from '../types';

interface Props {
  report: Report;
  feedback: ClientFeedback;
  noteToggles: Record<string, boolean>;
  onToggleNote: (noteKey: string) => void;
  onNote: (noteKey: string, text: string) => void;
}

export default function Anomalies({
  report,
  feedback,
  noteToggles,
  onToggleNote,
  onNote,
}: Props) {
  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">Anomalies</div>
        <span className="card__hint">
          Add a note to teach the AI — false positive, known cause, threshold too tight …
        </span>
      </div>
      <div className="anom-wrap">
        {report.anomalies.length === 0 ? (
          <div className="card__empty" style={{ padding: '4px 0 12px' }}>
            No anomalies in this report.
          </div>
        ) : (
          report.anomalies.map((a, i) => {
            const sev = sevMap(a.sev);
            // Index-basierter Key — so definiert das Pipeline-Schema die item_id.
            const noteKey = `a:${report.date}:${i}`;
            return (
              <div
                className="anom"
                key={noteKey}
                style={{ borderLeft: `3px solid ${sev.color}`, background: sev.bg }}
              >
                <div className="anom__head">
                  <span className="anom__tag" style={{ color: sev.color }}>
                    {sev.label}
                  </span>
                  <div className="anom__title">{a.title}</div>
                </div>
                <div className="anom__desc">{a.desc}</div>
                <div className="anom__note">
                  <NoteField
                    note={feedback.notes[noteKey] ?? ''}
                    toggled={!!noteToggles[noteKey]}
                    onToggle={() => onToggleNote(noteKey)}
                    onChange={(text) => onNote(noteKey, text)}
                    placeholder="Note for the AI — stored with the next export"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
