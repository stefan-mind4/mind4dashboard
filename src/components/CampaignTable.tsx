import { dirColor, sevMap } from '../lib/format';
import type { Report } from '../types';

interface Props {
  report: Report;
  expandedKey: string | null;
  onToggle: (key: string | null) => void;
}

const COLUMNS = [
  'Cost',
  'Δ vs Ø7',
  '% Budget',
  'Impr.',
  'Clicks',
  'Ø CPC',
  'Conv.',
  'Impr. Share',
];

export default function CampaignTable({ report, expandedKey, onToggle }: Props) {
  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">Campaigns on {report.label}</div>
        <span className="card__hint">▸ rows with keyword findings expand</span>
      </div>
      <div className="table-scroll">
        <div className="table-inner">
          <div className="trow thead">
            <div>Campaign</div>
            {COLUMNS.map((c) => (
              <div key={c}>{c}</div>
            ))}
          </div>

          {report.campaigns.map((cp, i) => {
            const key = `c:${report.date}:${i}`;
            const hasKw = !!cp.kw?.length;
            const isOpen = expandedKey === key;
            return (
              <div className="tgroup" key={key}>
                <button
                  type="button"
                  className={`trow tbody-row${hasKw ? ' tbody-row--clickable' : ''}`}
                  style={{ cursor: hasKw ? 'pointer' : 'default' }}
                  onClick={() => hasKw && onToggle(isOpen ? null : key)}
                  aria-expanded={hasKw ? isOpen : undefined}
                >
                  <div className="tcampaign">
                    <span
                      className="dot"
                      style={{ background: cp.sev ? sevMap(cp.sev).color : '#CBD5E1' }}
                    />
                    <span className="tcampaign__name">{cp.name}</span>
                    {hasKw && (
                      <span className="tcampaign__chev">{isOpen ? '▾' : '▸'}</span>
                    )}
                  </div>
                  <div className="tnum tnum--cost">{cp.cost}</div>
                  <div
                    className="tnum tnum--dev"
                    style={{ color: dirColor(cp.dir) }}
                  >
                    {cp.dev}
                  </div>
                  <div className="tnum">{cp.pct}</div>
                  <div className="tnum">{cp.impr}</div>
                  <div className="tnum">{cp.clicks}</div>
                  <div className="tnum">{cp.cpc}</div>
                  <div className="tnum">{cp.conv}</div>
                  <div className="tnum">{cp.share}</div>
                </button>

                {isOpen && (
                  <div className="kw-panel">
                    <div className="kw-panel__title">Keyword findings</div>
                    {cp.kw?.map((k, ki) => (
                      <div className="kw-row" key={`${k.k}-${ki}`}>
                        <span className="kw-row__k">{k.k}</span>
                        <span className="mono">{k.cost}</span>
                        <span className="mono" style={{ color: '#64748B' }}>
                          {k.clicks} clicks
                        </span>
                        <span className="kw-row__cpc">CPC {k.cpc}</span>
                        <span className="kw-row__note">{k.note}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
