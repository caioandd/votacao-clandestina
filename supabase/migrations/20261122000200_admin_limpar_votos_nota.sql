-- ---------------------------------------------------------------
-- 002 — Painel: "nota" (estrela mais votada) e limpeza de votos
--
-- Rodar DEPOIS da migration inicial (20261122000100_init.sql).
-- Substitui o antigo índice bayesiano:
--   nota = estrela inteira mais frequente nas notas do jogador.
--          Empate: vale a estrela MAIS ALTA.
--          Quem não recebeu nenhuma nota fica com nota nula.
-- A ordenação do ranking passa a ser: nota desc, depois média desc
-- (desempate da nota), depois nome.
-- ---------------------------------------------------------------

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
           count(*) filter (where r.score is null) as abstentions,
           (select rr.score
              from public.ratings rr
             where rr.player_id = p.id
               and rr.score is not null
             group by rr.score
             order by count(*) desc, rr.score desc
             limit 1) as nota
      from public.players p
      left join public.ratings r on r.player_id = p.id
     where p.active
     group by p.id, p.full_name, p.nickname, p.is_goalkeeper
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
        'nota', b.nota,
        'distribution', coalesce(d.dist, '{}'::jsonb)
      )
      order by b.nota desc nulls last,
               b.mean desc nulls last,
               b.full_name asc
    ),
    '[]'::jsonb)
    from base b
    left join distrib d on d.pid = b.id::text
   where public.is_admin();
$$;

revoke all on function public.admin_ranking() from public, anon;
grant execute on function public.admin_ranking() to authenticated;

create or replace function public.admin_clear_ballots()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  -- As notas caem junto por cascade (ratings.ballot_id).
  delete from public.ballots;
  get diagnostics v_total = row_count;

  return v_total;
end;
$$;

revoke all on function public.admin_clear_ballots() from public, anon;
grant execute on function public.admin_clear_ballots() to authenticated;
