# mind4 Ads Cockpit

Internes Dashboard für die täglichen KI-generierten Google-Ads-Alarm-Reports aller Kunden.

**Kern-Loop:** Eine tägliche Claude-Pipeline analysiert Google-Ads-Daten über den mind4-MCP-Server
und schreibt pro Kunde einen JSON-Report nach Supabase.
Dieses Cockpit zeigt die Reports an; Nutzer haken empfohlene Schritte ab und hinterlassen Notizen.
Die Pipeline liest dieses Feedback vor dem nächsten Run.

## Stack

React 18 · TypeScript · Vite · `@supabase/supabase-js` · reines CSS (keine UI-Library).
Navigation ist clientseitig, ohne Router.

## Setup

```bash
npm install
cp .env.example .env   # VITE_SUPABASE_ANON_KEY eintragen
npm run dev
```

| Skript | Zweck |
|---|---|
| `npm run dev` | Dev-Server auf http://localhost:5173 |
| `npm run build` | Typecheck + Production-Build nach `dist/` |
| `npm run typecheck` | Nur `tsc --noEmit` |
| `npm run preview` | Gebautes `dist/` lokal ausliefern |

## Backend

Bestehendes, produktives Supabase-Projekt. **Nicht neu anlegen.** Projekt-Ref, URL und anon-Key
stehen in der Supabase-Console bzw. in den Netlify-Environment-Variablen — dieses Repo ist
öffentlich und enthält sie deshalb nicht.

| Tabelle | Zweck | Schlüssel |
|---|---|---|
| `clients` | Kundenstamm inkl. `description` (KI-Kontext) | `id` (Slug) |
| `reports` | 1 JSON-Report pro Kunde/Tag | `client` + `report_date` |
| `feedback` | Abgehakte Schritte und Notizen | `client` + `report_date` + `item_id` |
| `adjustments` | Protokollierte manuelle Kampagnen-Änderungen | `id` |

`item_id` in `feedback` ist die Step-ID, bzw. `a:{report_date}:{index}` für Anomalie-Notizen.
Das `payload`-Schema von `reports` definiert der Pipeline-Prompt `google-ads-daily-alarm.md` in
Abschnitt 5b verbindlich; es ist in [src/types.ts](src/types.ts) als `ReportPayload` abgebildet —
Änderungen müssen mit der Pipeline abgestimmt werden.

Der anon-Key landet bauartbedingt im Client-Bundle. **Der `service_role`-Key darf nie in dieses
Repo oder in eine `VITE_*`-Variable.**

## Architektur

```
src/
  App.tsx              View-Umschaltung Overview ↔ Client-Detail
  hooks/useCockpit.ts  Laden, Sync-State, alle Schreibvorgänge (optimistisch)
  lib/supabase.ts      Supabase-Queries und Upserts
  lib/cache.ts         localStorage: Feedback-Spiegel + Offline-Cache
  lib/derive.ts        Offene Schritte, Notizzähler, Summen
  lib/format.ts        Design-Token-Maps, Sparkline, Datums-/Zahlenformate
  components/          Views und Bausteine
  types.ts             Datenmodell inkl. Pipeline-Payload-Schema
```

Die Design-Referenz von Claude Design liegt lokal unter `design-handoff/` und ist **bewusst nicht
eingecheckt** (`.gitignore`): `data.js` enthält echte Kundendaten, `supabase.js` und
`google-ads-daily-alarm.md` den anon-Key im Klartext. Dieses Repo ist öffentlich.

Alle Schreibvorgänge sind optimistisch: Der lokale State wird sofort aktualisiert, der Upsert
läuft im Hintergrund. Schlägt er fehl, kippt die Sync-Pille im Header auf „Offline".
Notizen und die Client-Description werden 900 ms debounced.

## Abweichungen von der Design-Referenz

Bewusste Entscheidungen beim Nachbau — die Optik ist unverändert:

1. **Kein Erst-Seeding.** Der Prototyp lud Beispieldaten hoch, wenn `reports` leer war. Gegen ein
   produktives Backend würde das Mock-Daten schreiben.
2. **Offline-Fallback aus echtem Cache** statt aus `data.js`. Gespiegelt wird der letzte
   erfolgreiche Ladevorgang (localStorage) — im Offline-Fall stehen also nie erfundene Zahlen im
   Cockpit. Copy und Sync-Pille bleiben wie entworfen.
3. **Offene Schritte werden nach ID dedupliziert.** Offene Schritte wiederholen sich an Folgetagen
   mit ihrer Original-ID; die Referenz zählte sie pro Report und damit mehrfach. Das Badge im
   Report-Archiv zählt weiterhin pro Report — dort ist das die richtige Semantik.
4. **`daysOpen` rechnet gegen das echte heutige Datum**, nicht gegen die Konstante `TODAY` aus `data.js`.
5. **Slug-Bildung transliteriert Umlaute** (`Müller` → `mueller` statt `m-ller`).
6. **Kosten-Delta ohne Vergleichstag** zeigt „no comparison day" statt `NaN %`.
7. **`support.js` nicht portiert** (Runtime des Prototyp-Formats).

## Deploy (Netlify)

`netlify.toml` ist eingerichtet: Build `npm run build`, Publish `dist`, SPA-Rewrite auf
`index.html`, `noindex`-Header. In den Netlify-Site-Settings müssen
`VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` als Environment-Variablen gesetzt werden.

## Offene Punkte

1. **Google-Login — dringend.** Supabase Auth mit Google-Provider, Login-Screen vor dem Cockpit,
   RLS von `using (true)` auf `authenticated` umstellen, optional Domain-Restriktion
   `auth.jwt()->>'email' like '%@mind4.at'`. Solange die anon-Policies offen stehen, kann jeder
   mit URL und anon-Key alle Kundendaten lesen **und schreiben**.
2. **RLS vervollständigen** — `reports` fehlen update/delete-Policies; nach der Auth-Umstellung
   ohnehin das komplette Policy-Set neu.
3. **Pipeline auf `service_role` umstellen** (nur serverseitig) nach der Auth-Umstellung.
4. **URL-Routing** ergänzen, damit Client-Ansichten verlinkbar sind.

Verifiziert: Lesepfade und der Feedback-Schreibpfad (Checkbox → Upsert in `feedback`) gegen das
Live-Backend. Noch nicht praktisch getestet: Notiz, Client-Description, Adjustment, Add-Client.
