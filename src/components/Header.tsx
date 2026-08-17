import { headerDate } from '../lib/format';
import type { SyncState } from '../types';

const SYNC_LABEL: Record<SyncState, string> = {
  live: 'Supabase live',
  offline: 'Offline · local data',
  connecting: 'Connecting …',
};

const SYNC_COLOR: Record<SyncState, string> = {
  live: '#10B981',
  offline: '#F59E0B',
  connecting: '#64748B',
};

interface Props {
  critCount: number;
  openTotal: number;
  sync: SyncState;
}

export default function Header({ critCount, openTotal, sync }: Props) {
  return (
    <div className="hdr">
      <div className="hdr-brand">
        <div className="hdr-logo">m4</div>
        <div className="hdr-title">Ads Cockpit</div>
        <div className="hdr-sub">Daily AI alarm reports · all clients</div>
      </div>
      <div className="hdr-right">
        <div className="hdr-pill">
          <span className="dot" style={{ background: '#EF4444' }} />
          <span className="mono" style={{ fontWeight: 600 }}>
            {critCount}
          </span>{' '}
          critical
        </div>
        <div className="hdr-pill">
          <span className="mono" style={{ fontWeight: 600 }}>
            {openTotal}
          </span>{' '}
          open actions
        </div>
        <div className="hdr-pill">
          <span className="dot" style={{ background: SYNC_COLOR[sync] }} />
          {SYNC_LABEL[sync]}
        </div>
        <div className="hdr-date">{headerDate()}</div>
      </div>
    </div>
  );
}
