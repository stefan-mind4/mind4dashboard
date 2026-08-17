import { useState } from 'react';
import { ALLOWED_DOMAIN } from '../hooks/useAuth';

interface Props {
  error: string | null;
  onSignIn: () => Promise<void>;
}

/** Google-Logo als Inline-SVG — externe Assets sind hier nicht erwuenscht. */
function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.1c4.16-3.83 6.57-9.47 6.57-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.1-5.52c-1.97 1.32-4.49 2.1-7.46 2.1-5.74 0-10.6-3.87-12.34-9.08H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.66 28.17c-.44-1.32-.69-2.73-.69-4.17s.25-2.85.69-4.17v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.87l7.32-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.3-6.3C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.13l7.32 5.7c1.74-5.21 6.6-9.08 12.34-9.08z"
      />
    </svg>
  );
}

export default function Login({ error, onSignIn }: Props) {
  const [busy, setBusy] = useState(false);

  async function click() {
    setBusy(true);
    try {
      await onSignIn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <div className="hdr-logo">m4</div>
          <div>
            <div className="login__title">Ads Cockpit</div>
            <div className="login__sub">Daily AI alarm reports · all clients</div>
          </div>
        </div>

        <div className="login__body">
          Internes Dashboard. Zugriff nur mit Google-Konto auf{' '}
          <span className="mono">@{ALLOWED_DOMAIN}</span>.
        </div>

        {error && <div className="login__error">{error}</div>}

        <button type="button" className="login__btn" onClick={click} disabled={busy}>
          <GoogleMark />
          {busy ? 'Weiterleitung …' : 'Mit Google anmelden'}
        </button>
      </div>
    </div>
  );
}
