import NoteField from './NoteField';
import { daysOpen } from '../lib/format';
import type { ClientFeedback, Report } from '../types';

interface Props {
  report: Report;
  feedback: ClientFeedback;
  noteToggles: Record<string, boolean>;
  onToggleStep: (stepId: string, done: boolean) => void;
  onToggleNote: (noteKey: string) => void;
  onNote: (noteKey: string, text: string) => void;
}

export default function RecommendedActions({
  report,
  feedback,
  noteToggles,
  onToggleStep,
  onToggleNote,
  onNote,
}: Props) {
  const doneCount = report.steps.filter((s) => feedback.steps[s.id]?.done).length;
  const age = daysOpen(report.date);

  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">Recommended actions</div>
        <span className="card__progress">
          {doneCount}/{report.steps.length} done
        </span>
        <span className="card__hint">
          Check off what you've done — synced live to the AI pipeline
        </span>
      </div>

      {report.steps.length === 0 ? (
        <div className="card__empty">No recommended actions in this report.</div>
      ) : (
        report.steps.map((s) => {
          const fb = feedback.steps[s.id];
          const done = !!fb?.done;
          const noteKey = `s:${s.id}`;
          return (
            <div className="step" key={s.id}>
              <input
                type="checkbox"
                className="step__box"
                checked={done}
                onChange={(e) => onToggleStep(s.id, e.target.checked)}
              />
              <div className="step__body">
                <div
                  className="step__text"
                  style={{
                    color: done ? '#94A3B8' : '#0F172A',
                    textDecoration: done ? 'line-through' : 'none',
                  }}
                >
                  {s.text}
                </div>
                <div className="step__meta">
                  <span
                    className="step__metapill"
                    style={{
                      color: done ? '#047857' : '#B45309',
                      background: done ? '#EAF7F1' : '#FDF6E7',
                    }}
                  >
                    {done
                      ? `done${fb?.doneAt ? ` ${new Date(fb.doneAt).toLocaleDateString('de-AT')}` : ''}`
                      : `open · ${age}d`}
                  </span>
                  <NoteField
                    note={feedback.notes[noteKey] ?? ''}
                    toggled={!!noteToggles[noteKey]}
                    onToggle={() => onToggleNote(noteKey)}
                    onChange={(text) => onNote(noteKey, text)}
                    placeholder="Context for the AI — e.g. 'Set tCPA to 80 € on 07.08, re-check in 3 days'"
                  />
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
