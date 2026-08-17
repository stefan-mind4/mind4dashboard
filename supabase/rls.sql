-- ============================================================================
--  Ads Cockpit — Zugriff auf Google-Konten @mind4.at beschraenken
--  Ausfuehren im Supabase SQL Editor. Idempotent, kann wiederholt laufen.
-- ============================================================================
--
--  ⚠️  VORHER LESEN — dieses Skript entzieht der Rolle `anon` jeden Zugriff.
--
--  Die taegliche Claude-Pipeline (google-ads-daily-alarm.md) schreibt derzeit
--  mit dem anon-Key. Nach diesem Skript schlaegt das fehl (HTTP 401/403) und
--  es kommen keine neuen Reports mehr an.
--
--  Reihenfolge:
--    1. Google-Provider in Supabase aktivieren (Authentication → Providers)
--    2. Im Pipeline-Prompt SUPABASE_KEY auf den service_role-Key umstellen
--       — der umgeht RLS und darf ausschliesslich serverseitig liegen,
--         nie in diesem Repo und nie in einer VITE_*-Variable
--    3. Dieses Skript ausfuehren
--    4. Login im Cockpit testen, dann einen Pipeline-Run testen
--
--  Rollback: siehe Abschnitt 6 am Ende.
-- ============================================================================


-- 1 ---------------------------------------------------------------- Praedikat
-- Prueft zwei Dinge gemeinsam, beide aus dem JWT und nicht vom Client setzbar:
--   a) Die Identitaet kommt von Google (app_metadata.provider wird von Supabase
--      gesetzt, nicht von user_metadata, das der Nutzer selbst beschreiben kann)
--   b) Die E-Mail endet auf @mind4.at
--
-- Punkt (a) ist wesentlich: waeren E-Mail-Registrierungen offen, koennte sich
-- sonst jemand selbst mit einer erfundenen @mind4.at-Adresse anmelden.

create or replace function public.is_mind4_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
      or coalesce(auth.jwt() -> 'app_metadata' -> 'providers', '[]'::jsonb) ? 'google'
    )
    and lower(coalesce(auth.jwt() ->> 'email', '')) like '%@mind4.at'
$$;

comment on function public.is_mind4_user() is
  'True fuer per Google authentifizierte Nutzer mit @mind4.at-Adresse. Basis aller RLS-Policies des Ads Cockpit.';


-- 2 ------------------------------------------------- Alte Policies entfernen
-- Die bestehenden offenen anon-Policies (using (true)) heissen je nach
-- Entstehung unterschiedlich — deshalb dynamisch statt namentlich.

do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('clients', 'reports', 'feedback', 'adjustments')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
    raise notice 'Policy entfernt: % auf %', pol.policyname, pol.tablename;
  end loop;
end $$;


-- 3 -------------------------------------------------------- RLS einschalten
-- force row level security gilt auch fuer den Tabellen-Owner.

alter table public.clients      enable row level security;
alter table public.reports      enable row level security;
alter table public.feedback     enable row level security;
alter table public.adjustments  enable row level security;


-- 4 ------------------------------------------------------- Neue Policies
-- Vollzugriff fuer mind4-Konten, sonst nichts. Deckt zugleich den offenen
-- Roadmap-Punkt ab, dass `reports` update/delete fehlten.

create policy "mind4 users full access" on public.clients
  for all to authenticated
  using (public.is_mind4_user())
  with check (public.is_mind4_user());

create policy "mind4 users full access" on public.reports
  for all to authenticated
  using (public.is_mind4_user())
  with check (public.is_mind4_user());

create policy "mind4 users full access" on public.feedback
  for all to authenticated
  using (public.is_mind4_user())
  with check (public.is_mind4_user());

create policy "mind4 users full access" on public.adjustments
  for all to authenticated
  using (public.is_mind4_user())
  with check (public.is_mind4_user());


-- 5 --------------------------------------------------- Rechte auf Rollenebene
-- Zweiter Riegel unabhaengig von den Policies: ohne Tabellenrechte kommt `anon`
-- selbst dann nicht durch, wenn spaeter versehentlich eine offene Policy
-- angelegt wird. `service_role` umgeht RLS und bleibt davon unberuehrt.

revoke all on public.clients     from anon;
revoke all on public.reports     from anon;
revoke all on public.feedback    from anon;
revoke all on public.adjustments from anon;
revoke all on all sequences in schema public from anon;

grant select, insert, update, delete on public.clients     to authenticated;
grant select, insert, update, delete on public.reports     to authenticated;
grant select, insert, update, delete on public.feedback    to authenticated;
grant select, insert, update, delete on public.adjustments to authenticated;
-- adjustments.id laeuft ueber eine Sequenz — ohne dieses Recht schlagen Inserts fehl.
grant usage, select on all sequences in schema public to authenticated;


-- 6 ------------------------------------------------------------- Verifikation
-- Erwartet: 4 Zeilen, je Tabelle eine Policy fuer die Rolle {authenticated}.

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('clients', 'reports', 'feedback', 'adjustments')
order by tablename;

-- Erwartet: rowsecurity = true fuer alle vier Tabellen.
select relname, relrowsecurity as rowsecurity
from pg_class
where relname in ('clients', 'reports', 'feedback', 'adjustments')
order by relname;

-- Gegenprobe der Domain-Logik (unabhaengig von einer echten Session):
--   erwartet: true, false, false, false
select
  lower('Stefan.Kuntner@mind4.at') like '%@mind4.at' as soll_true,
  lower('someone@gmail.com')       like '%@mind4.at' as soll_false_fremd,
  lower('angreifer@evilmind4.at')  like '%@mind4.at' as soll_false_aehnlich,
  lower('user@sub.mind4.at')       like '%@mind4.at' as soll_false_subdomain;


-- ============================================================================
--  ROLLBACK — stellt den offenen Zustand von vorher wieder her.
--  Nur nutzen, wenn die Pipeline noch mit dem anon-Key laeuft und es klemmt.
-- ============================================================================
--
--  do $$
--  declare pol record;
--  begin
--    for pol in select policyname, tablename from pg_policies
--      where schemaname = 'public'
--        and tablename in ('clients','reports','feedback','adjustments')
--    loop
--      execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
--    end loop;
--  end $$;
--
--  grant select, insert, update, delete on public.clients, public.reports,
--    public.feedback, public.adjustments to anon;
--  grant usage, select on all sequences in schema public to anon;
--
--  create policy "open anon access" on public.clients
--    for all to anon using (true) with check (true);
--  -- ... analog fuer reports, feedback, adjustments
-- ============================================================================
