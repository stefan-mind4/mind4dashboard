import { useState } from 'react';
import Anomalies from './Anomalies';
import CampaignTable from './CampaignTable';
import ClientSettings from './ClientSettings';
import RecommendedActions from './RecommendedActions';
import ReportArchive from './ReportArchive';
import { dirColor, statusMap } from '../lib/format';
import type {
  AdjustmentRow,
  ClientFeedback,
  ClientRow,
  CockpitClient,
} from '../types';

interface Props {
  client: CockpitClient;
  profile: ClientRow | undefined;
  feedback: ClientFeedback;
  adjustments: AdjustmentRow[];
  descStatus: 'saving' | 'saved' | 'error' | undefined;
  onBack: () => void;
  onDescription: (text: string) => void;
  onLogAdjustment: (date: string, text: string) => void;
  onToggleStep: (reportDate: string, stepId: string, done: boolean) => void;
  onNote: (reportDate: string, noteKey: string, text: string) => void;
}

export default function ClientDetail({
  client,
  profile,
  feedback,
  adjustments,
  descStatus,
  onBack,
  onDescription,
  onLogAdjustment,
  onToggleStep,
  onNote,
}: Props) {
  const [reportIdx, setReportIdx] = useState(0);
  const [expandedC, setExpandedC] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [noteToggles, setNoteToggles] = useState<Record<string, boolean>>({});

  const status = statusMap(client.status);
  const idx = Math.min(reportIdx, Math.max(0, client.reports.length - 1));
  const report = client.reports[idx];
  const repStatus = statusMap(report?.status);

  function toggleNote(key: string) {
    setNoteToggles((cur) => ({ ...cur, [key]: !cur[key] }));
  }

  return (
    <div className="page page--client">
      <div className="detail-head">
        <button type="button" className="btn-outline" onClick={onBack}>
          ← All clients
        </button>
        <div>
          <div className="detail-head__name">
            {client.name}
            <span
              className="status-pill"
              style={{ color: status.color, background: status.bg }}
            >
              {status.label}
            </span>
          </div>
          <div className="detail-head__meta">
            {client.domain} · Account {client.account}
          </div>
        </div>
        <button
          type="button"
          className="btn-settings"
          onClick={() => setSettingsOpen((o) => !o)}
          style={{
            background: settingsOpen ? '#F0FDFA' : '#fff',
            border: `1px solid ${settingsOpen ? '#99F6E4' : '#E5E7EB'}`,
            color: settingsOpen ? '#0F766E' : '#334155',
          }}
        >
          ⚙ Client settings
        </button>
      </div>

      {settingsOpen && (
        <ClientSettings
          description={profile?.description ?? ''}
          descStatus={descStatus}
          onDescription={onDescription}
          adjustments={adjustments.filter((a) => a.client === client.id)}
          onLog={onLogAdjustment}
        />
      )}

      <div className="detail-grid">
        <ReportArchive
          reports={client.reports}
          activeIdx={idx}
          feedback={feedback}
          onSelect={(i) => {
            setReportIdx(i);
            setExpandedC(null);
          }}
        />

        <div className="detail-main">
          {!report ? (
            <div className="card">
              <div className="card__empty">
                Für diesen Kunden liegt noch kein Report vor.
              </div>
            </div>
          ) : (
            <>
              <div
                className="rep-head"
                style={{ borderLeft: `5px solid ${repStatus.color}` }}
              >
                <div className="rep-head__title">Alarm report — {report.label}</div>
                <span
                  className="rep-head__pill"
                  style={{ color: repStatus.color, background: repStatus.bg }}
                >
                  {report.headline}
                </span>
                <span className="rep-head__ref">
                  {report.weekday} · Reference: {report.ref}
                </span>
              </div>

              <div className="kpi5">
                {report.kpis.map((k, i) => (
                  <div className="kpi5__card" key={`${k.label}-${i}`}>
                    <div className="kpi5__label">{k.label}</div>
                    <div className="kpi5__val">{k.val}</div>
                    <div className="kpi5__ref">
                      {k.ref} ·{' '}
                      <span style={{ fontWeight: 700, color: dirColor(k.dir) }}>
                        {k.delta}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <RecommendedActions
                report={report}
                feedback={feedback}
                noteToggles={noteToggles}
                onToggleStep={(stepId, done) => onToggleStep(report.date, stepId, done)}
                onToggleNote={toggleNote}
                onNote={(key, text) => onNote(report.date, key, text)}
              />

              <Anomalies
                report={report}
                feedback={feedback}
                noteToggles={noteToggles}
                onToggleNote={toggleNote}
                onNote={(key, text) => onNote(report.date, key, text)}
              />

              <CampaignTable
                report={report}
                expandedKey={expandedC}
                onToggle={setExpandedC}
              />

              <div className="footnote">
                Source: Google Ads API (GAQL) via mind4 MCP server · Reports load from
                Supabase (table “reports”), feedback syncs live to table “feedback” for
                the AI pipeline. Local cache as offline fallback.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
