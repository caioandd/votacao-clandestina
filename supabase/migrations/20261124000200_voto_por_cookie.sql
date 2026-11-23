-- ============================================================================
-- 004 — Voto por cookie (sem login para quem vota)
-- ----------------------------------------------------------------------------
-- Rodar DEPOIS das migrations 001, 002 e 003.
-- Como aplicar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- É idempotente: pode rodar de novo sem efeito colateral.
--
-- O que muda: quem vota não entra mais com o Google. Na primeira votação o
-- aparelho recebe um identificador aleatório (UUID) guardado num cookie, e o
-- nome completo é digitado na entrada. O painel da organização continua com
-- login Google (as funções admin_* seguem exigindo is_admin()).
--
-- Cédulas antigas (feitas com login) continuam válidas: o campo voter_id passa
-- a aceitar tanto o id de uma conta quanto o identificador do aparelho.
-- ============================================================================

-- 1) A cédula deixa de estar amarrada a uma conta do Supabase Auth.
--    (o índice único de voter_id permanece — é ele que garante uma cédula
--    por aparelho e sustenta o "on conflict (voter_id)" dos envios)
alter table public.ballots alter column voter_id drop not null;
alter table public.ballots drop constraint if exists ballots_voter_id_fkey;

-- 2) Lista pública de jogadores ativos (antes exigia login).
create or replace function public.get_players()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'nickname', p.nickname,
        'is_goalkeeper', p.is_goalkeeper,
        'sort_order', p.sort_order
      )
      order by p.full_name asc
    ),
    '[]'::jsonb)
    from public.players p
   where p.active;
$$;

revoke all on function public.get_players() from public;
grant execute on function public.get_players() to anon, authenticated;

-- 3) Leitura da própria cédula pelo identificador do aparelho.
create or replace function public.voter_get_ballot(p_voter_id uuid)
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
     where b.voter_id = p_voter_id
  );
$$;

revoke all on function public.voter_get_ballot(uuid) from public;
grant execute on function public.voter_get_ballot(uuid) to anon, authenticated;

-- 4) Envio/edição da cédula pelo identificador do aparelho.
--    Mesmas validações e janela do submit_ballot autenticado; o trigger da
--    janela de votação continua valendo para qualquer escrita.
create or replace function public.voter_submit_ballot(
  p_voter_id uuid,
  p_full_name text,
  p_scores jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_ballot_id uuid;
  v_revision integer;
  v_missing integer;
  r record;
  v_score smallint;
begin
  if p_voter_id is null then
    raise exception 'not_identified';
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
  values (p_voter_id, v_name, 1, now(), now())
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

revoke all on function public.voter_submit_ballot(uuid, text, jsonb) from public;
grant execute on function public.voter_submit_ballot(uuid, text, jsonb) to anon, authenticated;

-- 5) Painel: cédulas sem conta Google (identificador do aparelho) aparecem na
--    lista com o voter_id, em vez de sumirem por causa do inner join.
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
        'voter_id', b.voter_id,
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
    left join auth.users u on u.id = b.voter_id
   where public.is_admin();
$$;

revoke all on function public.admin_ballots() from public, anon;
grant execute on function public.admin_ballots() to authenticated;

-- 6) Matriz completa: mesma correção (não perder as cédulas por aparelho).
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
        'voter_id', b.voter_id,
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
    left join auth.users u on u.id = b.voter_id
   where public.is_admin();
$$;

revoke all on function public.admin_matrix() from public, anon;
grant execute on function public.admin_matrix() to authenticated;
