-- ============================================================================
-- 3ª COPA CLANDESTINA · Votação oficial
-- ----------------------------------------------------------------------------
-- Schema, políticas de acesso (RLS) e funções.
-- Como aplicar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- É idempotente: pode rodar de novo sem duplicar jogadores nem apagar votos.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------- TABELAS

create table if not exists public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  nickname text,
  is_goalkeeper boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint players_full_name_len check (char_length(full_name) between 2 and 80)
);

create table if not exists public.ballots (
  id uuid primary key default gen_random_uuid(),
  voter_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null,
  revision integer not null default 1,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ballots_revision_range check (revision between 1 and 1000),
  constraint ballots_full_name_len check (char_length(full_name) between 5 and 60)
);

create table if not exists public.ratings (
  ballot_id uuid not null references public.ballots (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  score smallint,
  created_at timestamptz not null default now(),
  primary key (ballot_id, player_id),
  constraint ratings_score_range check (score is null or (score between 1 and 5))
);

create index if not exists ratings_player_idx on public.ratings (player_id);

create table if not exists public.team_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  params jsonb not null default '{}'::jsonb,
  teams jsonb not null
);

-- ----------------------------------------------------------------- AJUSTES

-- O prazo é conferido sempre no servidor. Depois de closes_at nada é aceito.
insert into public.settings (key, value)
values
  ('opens_at', '2026-11-22T00:00:00-03:00'),
  ('closes_at', '2026-11-25T23:59:00-03:00'),
  ('results_public', 'false')
on conflict (key) do nothing;

-- ----------------------------------------------------------------- HELPERS

-- Leitura interna de settings. Não é exposta para anon/authenticated.
create or replace function public._setting(p_key text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select s.value from public.settings s where s.key = p_key
$$;

revoke all on function public._setting(text) from public, anon, authenticated;

-- Quem pode votar: e-mail institucional @ifba.edu.br confirmado.
-- Lê o registro real do usuário (não os claims do JWT): o Google sempre
-- entrega o e-mail verificado, e contas criadas por e-mail/senha só passam
-- depois de confirmar o endereço.
create or replace function public.is_allowed_voter()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
      from auth.users u
     where u.id = auth.uid()
       and u.email_confirmed_at is not null
       and lower(coalesce(u.email, '')) ~ '^[^@[:space:]]+@ifba\.edu\.br$'
  );
$$;

revoke all on function public.is_allowed_voter() from public, anon;
grant execute on function public.is_allowed_voter() to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid())
$$;

-- Defesa em profundidade: mesmo que alguém chame as tabelas direto,
-- a janela de votação é sempre respeitada.
create or replace function public.enforce_voting_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_opens timestamptz := public._setting('opens_at')::timestamptz;
  v_closes timestamptz := public._setting('closes_at')::timestamptz;
begin
  if v_opens is null or v_closes is null then
    raise exception 'voting_window_not_configured';
  end if;
  if now() < v_opens then
    raise exception 'voting_not_open';
  end if;
  if now() >= v_closes then
    raise exception 'voting_closed';
  end if;
  return new;
end;
$$;

drop trigger if exists ballots_window on public.ballots;
create trigger ballots_window
  before insert or update on public.ballots
  for each row execute function public.enforce_voting_window();

drop trigger if exists ratings_window on public.ratings;
create trigger ratings_window
  before insert or update on public.ratings
  for each row execute function public.enforce_voting_window();

-- --------------------------------------------------------------- ESCRITA

-- Cédula completa, atômica. É a única porta de escrita das notas.
create or replace function public.submit_ballot(p_full_name text, p_scores jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_ballot_id uuid;
  v_revision integer;
  v_missing integer;
  r record;
  v_score smallint;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_allowed_voter() then
    raise exception 'email_domain_not_allowed';
  end if;

  if p_scores is null or jsonb_typeof(p_scores) <> 'object' then
    raise exception 'incomplete_ballot';
  end if;

  v_name := btrim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g'));
  if char_length(v_name) < 5 or char_length(v_name) > 60 then
    raise exception 'invalid_name';
  end if;
  if v_name ~ '\d' then
    raise exception 'invalid_name';
  end if;
  if array_length(regexp_split_to_array(v_name, ' '), 1) < 2 then
    raise exception 'invalid_name';
  end if;

  -- todos os jogadores ativos precisam de resposta (nota ou "não sei")
  select count(*)
    into v_missing
    from public.players p
   where p.active
     and not (p_scores ? p.id::text);

  if v_missing > 0 then
    raise exception 'incomplete_ballot';
  end if;

  for r in
    select p.id, p_scores -> p.id::text as value
      from public.players p
     where p.active
  loop
    if r.value is null or r.value = 'null'::jsonb then
      continue; -- "não sei"
    end if;
    if jsonb_typeof(r.value) <> 'number' then
      raise exception 'invalid_score';
    end if;
    v_score := (r.value #>> '{}')::smallint;
    if v_score is null or v_score < 1 or v_score > 5 then
      raise exception 'invalid_score';
    end if;
  end loop;

  insert into public.ballots (voter_id, full_name, revision, submitted_at, updated_at)
  values (v_uid, v_name, 1, now(), now())
  on conflict (voter_id) do update
    set full_name = excluded.full_name,
        revision = public.ballots.revision + 1,
        updated_at = now()
  returning id, revision into v_ballot_id, v_revision;

  delete from public.ratings where ballot_id = v_ballot_id;

  insert into public.ratings (ballot_id, player_id, score)
  select v_ballot_id,
         p.id,
         case
           when (p_scores -> p.id::text) is null
             or (p_scores -> p.id::text) = 'null'::jsonb then null
           else ((p_scores -> p.id::text) #>> '{}')::smallint
         end
    from public.players p
   where p.active;

  return jsonb_build_object('revision', v_revision, 'updated_at', now());
end;
$$;

revoke all on function public.submit_ballot(text, jsonb) from public, anon;
grant execute on function public.submit_ballot(text, jsonb) to authenticated;

-- --------------------------------------------------------------- LEITURA

create or replace function public.get_my_ballot()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select (
    select jsonb_build_object(
             'full_name', b.full_name,
             'revision', b.revision,
             'submitted_at', b.submitted_at,
             'updated_at', b.updated_at,
             'scores', coalesce(
               (select jsonb_object_agg(r.player_id::text, r.score)
                  from public.ratings r
                 where r.ballot_id = b.id),
               '{}'::jsonb)
           )
      from public.ballots b
     where b.voter_id = auth.uid()
  );
$$;

revoke all on function public.get_my_ballot() from public, anon;
grant execute on function public.get_my_ballot() to authenticated;

-- Estado público: usado na capa antes do login.
create or replace function public.get_public_state()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'opens_at', public._setting('opens_at'),
    'closes_at', public._setting('closes_at'),
    'results_public', coalesce(public._setting('results_public'), 'false')::boolean,
    'player_count', (select count(*) from public.players p where p.active)
  );
$$;

revoke all on function public.get_public_state() from public;
grant execute on function public.get_public_state() to anon, authenticated;

-- --------------------------------------------------------------- ADMIN

create or replace function public.admin_ranking()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select p.id,
           p.full_name,
           p.nickname,
           p.is_goalkeeper,
           count(r.score) as n,
           avg(r.score) as mean,
           percentile_cont(0.5) within group (order by r.score) as median,
           count(*) filter (where r.score is null) as abstentions
      from public.players p
      left join public.ratings r on r.player_id = p.id
     where p.active
     group by p.id, p.full_name, p.nickname, p.is_goalkeeper
  ), geral as (
    select avg(mean) as gmean from base where n > 0
  ), distrib as (
    select r.player_id::text as pid,
           jsonb_object_agg(r.score::text, r.total) as dist
      from (select player_id, score, count(*) as total
              from public.ratings
             where score is not null
             group by player_id, score) r
     group by r.player_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'full_name', b.full_name,
        'nickname', b.nickname,
        'is_goalkeeper', b.is_goalkeeper,
        'n', b.n,
        'mean', b.mean,
        'median', b.median,
        'abstentions', b.abstentions,
        'bayes', case
                   when b.n = 0 then null
                   else (b.mean * b.n + 5 * coalesce(g.gmean, b.mean)) / (b.n + 5)
                 end,
        'distribution', coalesce(d.dist, '{}'::jsonb)
      )
      order by case when b.n = 0 then null
                    else (b.mean * b.n + 5 * coalesce(g.gmean, b.mean)) / (b.n + 5) end desc nulls last,
               b.full_name asc
    ),
    '[]'::jsonb)
    from base b
    cross join geral g
    left join distrib d on d.pid = b.id::text
   where public.is_admin();
$$;

revoke all on function public.admin_ranking() from public, anon;
grant execute on function public.admin_ranking() to authenticated;

create or replace function public.admin_ballots()
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'full_name', b.full_name,
        'email', u.email,
        'revision', b.revision,
        'submitted_at', b.submitted_at,
        'updated_at', b.updated_at
      )
      order by b.updated_at desc
    ),
    '[]'::jsonb)
    from public.ballots b
    join auth.users u on u.id = b.voter_id
   where public.is_admin();
$$;

revoke all on function public.admin_ballots() from public, anon;
grant execute on function public.admin_ballots() to authenticated;

-- Matriz completa (auditoria e reconstrução dos times).
create or replace function public.admin_matrix()
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'voter', b.full_name,
        'email', u.email,
        'player', p.full_name,
        'score', r.score,
        'updated_at', b.updated_at
      )
      order by b.updated_at desc, p.full_name asc
    ),
    '[]'::jsonb)
    from public.ratings r
    join public.ballots b on b.id = r.ballot_id
    join public.players p on p.id = r.player_id
    join auth.users u on u.id = b.voter_id
   where public.is_admin();
$$;

revoke all on function public.admin_matrix() from public, anon;
grant execute on function public.admin_matrix() to authenticated;

create or replace function public.admin_set_goalkeeper(p_player_id uuid, p_value boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  update public.players set is_goalkeeper = coalesce(p_value, false) where id = p_player_id;
end;
$$;

revoke all on function public.admin_set_goalkeeper(uuid, boolean) from public, anon;
grant execute on function public.admin_set_goalkeeper(uuid, boolean) to authenticated;

create or replace function public.admin_add_player(
  p_full_name text,
  p_nickname text default null,
  p_is_goalkeeper boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  v_name := btrim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g'));
  if char_length(v_name) < 2 then
    raise exception 'invalid_name';
  end if;

  insert into public.players (full_name, nickname, is_goalkeeper, sort_order)
  values (
    v_name,
    nullif(btrim(coalesce(p_nickname, '')), ''),
    coalesce(p_is_goalkeeper, false),
    coalesce((select max(sort_order) + 1 from public.players), 1)
  )
  returning id into v_id;

  -- quem já votou passa a ter "não sei" no jogador novo (e pode editar até o prazo)
  insert into public.ratings (ballot_id, player_id, score)
  select b.id, v_id, null from public.ballots b
  on conflict do nothing;

  return v_id;
end;
$$;

revoke all on function public.admin_add_player(text, text, boolean) from public, anon;
grant execute on function public.admin_add_player(text, text, boolean) to authenticated;

create or replace function public.admin_set_setting(p_key text, p_value text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  if p_key not in ('opens_at', 'closes_at', 'results_public') then
    raise exception 'invalid_setting';
  end if;
  if p_key = 'closes_at' then
    perform (p_value)::timestamptz;
  end if;

  insert into public.settings (key, value, updated_at)
  values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$$;

revoke all on function public.admin_set_setting(text, text) from public, anon;
grant execute on function public.admin_set_setting(text, text) to authenticated;

create or replace function public.admin_delete_ballot(p_ballot_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  delete from public.ballots where id = p_ballot_id;
end;
$$;

revoke all on function public.admin_delete_ballot(uuid) from public, anon;
grant execute on function public.admin_delete_ballot(uuid) to authenticated;

-- -------------------------------------------------------------------- RLS

alter table public.settings enable row level security;
alter table public.admins enable row level security;
alter table public.players enable row level security;
alter table public.ballots enable row level security;
alter table public.ratings enable row level security;
alter table public.team_drafts enable row level security;

-- ninguém escreve direto nas tabelas: só pelas funções acima
revoke all on public.settings, public.admins, public.players, public.ballots,
                public.ratings, public.team_drafts
  from anon, authenticated;

grant select on public.players to authenticated;
grant select on public.ballots to authenticated;
grant select on public.ratings to authenticated;
grant select on public.admins to authenticated;
grant select, insert, update, delete on public.team_drafts to authenticated;

drop policy if exists players_read on public.players;
create policy players_read on public.players
  for select to authenticated
  using (public.is_allowed_voter() or public.is_admin());

drop policy if exists ballots_own_read on public.ballots;
create policy ballots_own_read on public.ballots
  for select to authenticated
  using (voter_id = auth.uid() or public.is_admin());

drop policy if exists ratings_own_read on public.ratings;
create policy ratings_own_read on public.ratings
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.ballots b
       where b.id = ratings.ballot_id and b.voter_id = auth.uid()
    )
  );

drop policy if exists admins_self_read on public.admins;
create policy admins_self_read on public.admins
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists team_drafts_admin on public.team_drafts;
create policy team_drafts_admin on public.team_drafts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------- LISTA SEED

-- 29 nomes enviados pela organização (o 30º entra pelo painel, em Ajustes).
do $$
begin
  if not exists (select 1 from public.players) then
    insert into public.players (full_name, nickname, sort_order) values
      ('Guilherme Magalhães', 'Guimag', 1),
      ('Caio Andrade', null, 2),
      ('Arthur', 'Cone', 3),
      ('Lazaro', null, 4),
      ('Fellipe', 'Fellipets', 5),
      ('Jorge', null, 6),
      ('Riquelme', null, 7),
      ('Álvaro', null, 8),
      ('Rian', 'Riih77', 9),
      ('Manoel', 'Nel', 10),
      ('Arlei', null, 11),
      ('Pedro', 'Peualves', 12),
      ('Guilherme Morais', null, 13),
      ('Guilherme Giovani', null, 14),
      ('Joaquim', null, 15),
      ('Max Gabriel', null, 16),
      ('Welington', 'Teto', 17),
      ('Gabriel', null, 18),
      ('Pedro', 'CP', 19),
      ('Luis', null, 20),
      ('Jean', null, 21),
      ('Duarte', null, 22),
      ('Gustavo Carvalho', null, 23),
      ('Iago', 'Iagosexo', 24),
      ('Igor Bruno', 'Cacique', 25),
      ('Iran', null, 26),
      ('Luiz', null, 27),
      ('Rian', 'Civil', 28),
      ('Sávio', null, 29);
  end if;
end;
$$;

-- ============================================================================
-- DEPOIS DO PRIMEIRO LOGIN, promova a organização a admin:
--
--   insert into public.admins (user_id, email)
--   select id, email from auth.users where email = 'seuemail@ifba.edu.br'
--   on conflict (user_id) do nothing;
--
-- ============================================================================
