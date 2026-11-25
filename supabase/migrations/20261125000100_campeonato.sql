-- ============================================================================
-- 005 — Campeonato: times, grupos e partidas com placar editável
-- ----------------------------------------------------------------------------
-- Rodar DEPOIS das migrations 001, 002, 003 e 004.
-- Como aplicar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- É idempotente: pode rodar de novo sem duplicar times nem apagar placares.
--
-- O que entra: a página pública /copa do site. Dois grupos de três times
-- (todos se enfrentam dentro do grupo), semifinais cruzadas — 1º do A x 2º do
-- B e 2º do A x 1º do B —, final e disputa de 3º/4º lugar.
--
-- A organização edita os nomes dos times e os placares pelo próprio site
-- (logada com o Google; as funções admin_* exigem is_admin()). As tabelas de
-- grupo são calculadas na hora, no cliente, a partir dos placares.
-- ============================================================================

-- ----------------------------------------------------------------- TABELAS

-- Slots fixos da chave: a1..a3 (grupo A) e b1..b3 (grupo B).
-- A organização renomeia cada slot com o time real.
create table if not exists public.tournament_teams (
  id text primary key,
  name text not null,
  group_key text not null,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint tournament_teams_group check (group_key in ('A', 'B')),
  constraint tournament_teams_name_len check (char_length(name) between 1 and 40)
);

-- Partidas: grupo (home/away fixos), semi, final e third (lados definidos
-- pela tabela calculada — por isso home_team_id fica nulo nas eliminatórias).
-- Os pênaltis (home_pens/away_pens) só existem em jogo de mata-mata empatado.
create table if not exists public.tournament_matches (
  id text primary key,
  stage text not null,
  group_key text,
  home_team_id text references public.tournament_teams (id) on delete cascade,
  away_team_id text references public.tournament_teams (id) on delete cascade,
  home_score smallint,
  away_score smallint,
  home_pens smallint,
  away_pens smallint,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint tournament_matches_stage check (stage in ('group', 'semi', 'final', 'third')),
  constraint tournament_matches_group check (group_key is null or group_key in ('A', 'B')),
  constraint tournament_matches_scores check (
    (home_score is null and away_score is null)
    or (home_score is not null and away_score is not null
        and home_score between 0 and 99 and away_score between 0 and 99)
  ),
  constraint tournament_matches_pens check (
    (home_pens is null and away_pens is null)
    or (home_pens is not null and away_pens is not null
        and home_pens between 0 and 99 and away_pens between 0 and 99)
  )
);

-- ------------------------------------------------------------------- SEEDS

insert into public.tournament_teams (id, name, group_key, sort_order)
values
  ('a1', 'Time A1', 'A', 1),
  ('a2', 'Time A2', 'A', 2),
  ('a3', 'Time A3', 'A', 3),
  ('b1', 'Time B1', 'B', 1),
  ('b2', 'Time B2', 'B', 2),
  ('b3', 'Time B3', 'B', 3)
on conflict (id) do nothing;

insert into public.tournament_matches
  (id, stage, group_key, home_team_id, away_team_id, sort_order)
values
  ('ga1', 'group', 'A', 'a1', 'a2', 1),
  ('ga2', 'group', 'A', 'a1', 'a3', 2),
  ('ga3', 'group', 'A', 'a2', 'a3', 3),
  ('gb1', 'group', 'B', 'b1', 'b2', 4),
  ('gb2', 'group', 'B', 'b1', 'b3', 5),
  ('gb3', 'group', 'B', 'b2', 'b3', 6),
  ('sf1', 'semi', null, null, null, 7),
  ('sf2', 'semi', null, null, null, 8),
  ('final', 'final', null, null, null, 9),
  ('third', 'third', null, null, null, 10)
on conflict (id) do nothing;

-- --------------------------------------------------------------- LEITURA

-- Chave completa (times + partidas). Pública: a página /copa não pede login.
create or replace function public.get_tournament()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'teams', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'group_key', t.group_key,
          'sort_order', t.sort_order
        )
        order by t.group_key asc, t.sort_order asc, t.id asc
      )
      from public.tournament_teams t
    ), '[]'::jsonb),
    'matches', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'stage', m.stage,
          'group_key', m.group_key,
          'home_team_id', m.home_team_id,
          'away_team_id', m.away_team_id,
          'home_score', m.home_score,
          'away_score', m.away_score,
          'home_pens', m.home_pens,
          'away_pens', m.away_pens,
          'sort_order', m.sort_order
        )
        order by m.sort_order asc, m.id asc
      )
      from public.tournament_matches m
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_tournament() from public;
grant execute on function public.get_tournament() to anon, authenticated;

-- --------------------------------------------------------------- ADMIN

create or replace function public.admin_set_team_name(p_team_id text, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  v_name := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    raise exception 'invalid_team_name';
  end if;

  update public.tournament_teams
     set name = v_name, updated_at = now()
   where id = p_team_id;

  if not found then
    raise exception 'team_not_found';
  end if;
end;
$$;

revoke all on function public.admin_set_team_name(text, text) from public, anon;
grant execute on function public.admin_set_team_name(text, text) to authenticated;

-- Placar da partida. Os dois placares nulos limpam o resultado.
-- Pênaltis: só em mata-mata, só com placar normal empatado, e um time tem
-- que ter vencido a disputa.
create or replace function public.admin_set_match_score(
  p_match_id text,
  p_home_score smallint,
  p_away_score smallint,
  p_home_pens smallint,
  p_away_pens smallint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage text;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  if (p_home_score is null) <> (p_away_score is null) then
    raise exception 'invalid_match_score';
  end if;
  if p_home_score is not null
     and (p_home_score < 0 or p_home_score > 99
          or p_away_score < 0 or p_away_score > 99) then
    raise exception 'invalid_match_score';
  end if;

  if (p_home_pens is null) <> (p_away_pens is null) then
    raise exception 'invalid_match_score';
  end if;
  if p_home_pens is not null
     and (p_home_pens < 0 or p_home_pens > 99
          or p_away_pens < 0 or p_away_pens > 99) then
    raise exception 'invalid_match_score';
  end if;
  if p_home_pens is not null then
    if p_home_score is null or p_home_score <> p_away_score then
      raise exception 'invalid_match_score';
    end if;
    if p_home_pens = p_away_pens then
      raise exception 'invalid_match_score';
    end if;
  end if;

  select m.stage into v_stage
    from public.tournament_matches m
   where m.id = p_match_id;

  if v_stage is null then
    raise exception 'match_not_found';
  end if;
  if v_stage = 'group' and p_home_pens is not null then
    raise exception 'invalid_match_score';
  end if;

  update public.tournament_matches
     set home_score = p_home_score,
         away_score = p_away_score,
         home_pens = p_home_pens,
         away_pens = p_away_pens,
         updated_at = now()
   where id = p_match_id;
end;
$$;

revoke all on function public.admin_set_match_score(text, smallint, smallint, smallint, smallint)
  from public, anon;
grant execute on function public.admin_set_match_score(text, smallint, smallint, smallint, smallint)
  to authenticated;

-- -------------------------------------------------------------------- RLS

-- Ninguém lê nem escreve direto: só pelas funções acima (a de leitura é
-- security definer e atende ao anon).
alter table public.tournament_teams enable row level security;
alter table public.tournament_matches enable row level security;

revoke all on public.tournament_teams, public.tournament_matches from anon, authenticated;
