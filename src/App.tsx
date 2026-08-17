import { useState } from 'react';
import ClientDetail from './components/ClientDetail';
import Header from './components/Header';
import Login from './components/Login';
import Overview from './components/Overview';
import { computeTotals } from './lib/derive';
import { useCockpit } from './hooks/useCockpit';
import { useAuth } from './hooks/useAuth';
import type { Auth } from './hooks/useAuth';

export default function App() {
  const auth = useAuth();

  if (auth.status === 'loading') {
    return (
      <div className="app">
        <Header critCount={0} openTotal={0} sync="connecting" showStats={false} />
        <div className="loading">Checking session …</div>
      </div>
    );
  }

  if (auth.status === 'signed-out') {
    return (
      <div className="app">
        <Header critCount={0} openTotal={0} sync="connecting" showStats={false} />
        <Login error={auth.error} onSignIn={auth.signIn} />
      </div>
    );
  }

  // Erst ab hier laedt useCockpit — ohne Session gibt es keine Daten zu holen.
  return <Cockpit auth={auth} />;
}

function Cockpit({ auth }: { auth: Auth }) {
  const cockpit = useCockpit();
  const [clientId, setClientId] = useState<string | null>(null);

  const { clients, profiles, feedbackFor, sync } = cockpit;
  const loading = clients === null;
  const totals = loading
    ? { clientCount: 0, critCount: 0, openTotal: 0, notesTotal: 0 }
    : computeTotals(clients, profiles, feedbackFor);

  const active = clients?.find((c) => c.id === clientId) ?? null;

  return (
    <div className="app">
      <Header
        critCount={totals.critCount}
        openTotal={totals.openTotal}
        sync={sync}
        email={auth.email}
        onSignOut={auth.signOut}
      />

      {loading ? (
        <div className="loading">Loading reports …</div>
      ) : active ? (
        <ClientDetail
          key={active.id}
          client={active}
          profile={profiles[active.id]}
          feedback={feedbackFor(active.id)}
          adjustments={cockpit.adjustments}
          descStatus={cockpit.descStatus[active.id]}
          onBack={() => setClientId(null)}
          onDescription={(text) => cockpit.saveDescription(active.id, text)}
          onLogAdjustment={(date, text) => cockpit.logAdjustment(active.id, date, text)}
          onToggleStep={(reportDate, stepId, done) =>
            cockpit.toggleStep(active.id, reportDate, stepId, done)
          }
          onNote={(reportDate, noteKey, text) =>
            cockpit.setNote(active.id, reportDate, noteKey, text)
          }
        />
      ) : (
        <Overview
          clients={clients}
          profiles={profiles}
          totals={totals}
          feedbackFor={feedbackFor}
          onOpenClient={setClientId}
          onAddClient={cockpit.addClient}
        />
      )}
    </div>
  );
}
