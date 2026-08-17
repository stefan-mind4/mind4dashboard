import AddClientTile from './AddClientTile';
import ClientCard, { PendingClientCard } from './ClientCard';
import { pendingClients } from '../lib/derive';
import type { Totals } from '../lib/derive';
import type { ClientFeedback, ClientRow, CockpitClient, ProfileMap } from '../types';

interface Props {
  clients: CockpitClient[];
  profiles: ProfileMap;
  totals: Totals;
  feedbackFor: (clientId: string) => ClientFeedback;
  onOpenClient: (clientId: string) => void;
  onAddClient: (row: Omit<ClientRow, 'updated_at'>) => Promise<void>;
}

export default function Overview({
  clients,
  profiles,
  totals,
  feedbackFor,
  onOpenClient,
  onAddClient,
}: Props) {
  const pending = pendingClients(profiles, clients);

  return (
    <div className="page">
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-card__label">Clients</div>
          <div className="kpi-card__val">{totals.clientCount}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__label">Critical today</div>
          <div className="kpi-card__val" style={{ color: '#DC2626' }}>
            {totals.critCount}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__label">Open actions</div>
          <div className="kpi-card__val">{totals.openTotal}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__label">Notes for AI</div>
          <div className="kpi-card__val" style={{ color: '#0F766E' }}>
            {totals.notesTotal}
          </div>
        </div>
      </div>

      <div className="cards-grid">
        {clients.map((c) => (
          <ClientCard
            key={c.id}
            client={c}
            feedback={feedbackFor(c.id)}
            onOpen={() => onOpenClient(c.id)}
          />
        ))}
        {pending.map((p) => (
          <PendingClientCard
            key={p.id}
            name={p.name}
            domain={p.domain}
            account={p.account}
          />
        ))}
        <AddClientTile
          profiles={profiles}
          existingIds={clients.map((c) => c.id)}
          onSave={onAddClient}
        />
      </div>
    </div>
  );
}
