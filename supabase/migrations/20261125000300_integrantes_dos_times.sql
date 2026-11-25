-- ============================================================================
-- 007 — Integrantes dos times na página /copa
-- ----------------------------------------------------------------------------
-- Rodar DEPOIS das migrations 001, 002, 003, 004, 005 e 006.
-- Como aplicar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- É idempotente: pode rodar de novo sem duplicar nem apagar edições.
--
-- O que entra: a seção "Times e integrantes" da página /copa. Cada um dos seis
-- times ganha a lista de quem joga nele, e a organização edita essa lista —
-- e o nome do time — direto pela página, logada com o Google (a função
-- admin_set_team_members exige is_admin()).
--
-- A lista oficial sobe pronta com este arquivo; a seed só preenche time que
-- ainda estiver sem integrantes, então rodar de novo não desfaz edições feitas
-- no site.
-- ============================================================================

-- -------------------------------------------------------------------- COLUNA

alter table public.tournament_teams
  add column if not exists members text[] not null default '{}'::text[];

-- --------------------------------------------------------------------- SEED

-- Divisão oficial (a mesma que foi divulgada com a chave):
--   Time 1: Guilherme Giovani · Rian 77 · Welington · Riquelme · Patrick Lima
--   Time 2: Gabriel · João · Max Gabriel · Iago · Sávio
--   Time 3: Guilherme Morais · Luis Elétrica · Jean · Jorge · Peu Alves
--   Time 4: Pedro CP · Arlei · Guilherme Magalhães · Lazaro · Rian Civil
--   Time 5: Caio Andrade · Igor Bruno · Álvaro · Manoel · Gustavo Carvalho
--   Time 6: Fellipe · Joaquim · Luiz Augusto · Duarte · Arthur
update public.tournament_teams t
   set members = v.members,
       updated_at = now()
  from (values
    ('a1', array['Caio Andrade', 'Igor Bruno', 'Álvaro', 'Manoel', 'Gustavo Carvalho']),
    ('a2', array['Gabriel', 'João', 'Max Gabriel', 'Iago', 'Sávio']),
    ('a3', array['Guilherme Giovani', 'Rian 77', 'Welington', 'Riquelme', 'Patrick Lima']),
    ('b1', array['Guilherme Morais', 'Luis Elétrica', 'Jean', 'Jorge', 'Peu Alves']),
    ('b2', array['Pedro CP', 'Arlei', 'Guilherme Magalhães', 'Lazaro', 'Rian Civil']),
    ('b3', array['Fellipe', 'Joaquim', 'Luiz Augusto', 'Duarte', 'Arthur'])
  ) as v (id, members)
 where t.id = v.id
   and t.members = '{}'::text[];

-- ------------------------------------------------------------------ LEITURA

-- get_tournament agora devolve os integrantes de cada time.
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
          'sort_order', t.sort_order,
          'members', coalesce(t.members, '{}'::text[])
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

-- -------------------------------------------------------------------- ADMIN

-- Lista de integrantes do time: um nome por item, de 1 a 40 caracteres,
-- no máximo 15 por time. Lista vazia limpa a seção (volta a "a definir").
create or replace function public.admin_set_team_members(p_team_id text, p_members text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_members text[] := '{}'::text[];
  v_member text;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  if p_members is null then
    raise exception 'invalid_members';
  end if;
  if array_length(p_members, 1) > 15 then
    raise exception 'invalid_members';
  end if;

  foreach v_member in array p_members loop
    v_member := btrim(regexp_replace(coalesce(v_member, ''), '\s+', ' ', 'g'));
    if char_length(v_member) < 1 or char_length(v_member) > 40 then
      raise exception 'invalid_members';
    end if;
    v_members := v_members || v_member;
  end loop;

  update public.tournament_teams
     set members = v_members,
         updated_at = now()
   where id = p_team_id;

  if not found then
    raise exception 'team_not_found';
  end if;
end;
$$;

revoke all on function public.admin_set_team_members(text, text[]) from public, anon;
grant execute on function public.admin_set_team_members(text, text[]) to authenticated;
