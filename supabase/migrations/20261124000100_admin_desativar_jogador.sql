-- ============================================================================
-- 003 — Painel: desativar/reativar jogador
-- ----------------------------------------------------------------------------
-- Rodar DEPOIS das migrations 001 e 002.
-- Como aplicar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- É idempotente (create or replace): pode rodar de novo sem efeito colateral.
--
-- Para quando alguém desistir da copa:
--   admin_set_player_active(id, false)  → sai da votação e do ranking.
--   admin_set_player_active(id, true)   → volta; quem já votou passa a ver
--   o jogador como "não sei" e pode completar o voto até o prazo.
--
-- As notas já recebidas NÃO são apagadas: ficam guardadas e voltam a contar
-- se o jogador for reativado. (Quem reeditar a cédula durante a ausência
-- reenvia só os jogadores ativos — o voto do ausente sai daquela cédula,
-- como esperado.)
-- ============================================================================

-- Lista TODOS os jogadores para o painel, inclusive os desativados.
create or replace function public.admin_players()
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
        'active', p.active,
        'sort_order', p.sort_order
      )
      order by p.full_name asc
    ),
    '[]'::jsonb)
    from public.players p
   where public.is_admin();
$$;

revoke all on function public.admin_players() from public, anon;
grant execute on function public.admin_players() to authenticated;

create or replace function public.admin_set_player_active(p_player_id uuid, p_value boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active boolean := coalesce(p_value, true);
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  update public.players set active = v_active where id = p_player_id;
  if not found then
    raise exception 'player_not_found';
  end if;

  -- Reativação: quem já votou passa a ter "não sei" no jogador (e pode
  -- completar o voto até o prazo) — mesmo padrão do admin_add_player.
  -- Fora da janela de votação ninguém consegue reenviar mesmo, então a linha
  -- de abstenção é dispensável (e o trigger da janela recusaria o insert).
  if v_active
     and now() >= coalesce(public._setting('opens_at')::timestamptz, now())
     and now() < coalesce(public._setting('closes_at')::timestamptz, now()) then
    insert into public.ratings (ballot_id, player_id, score)
    select b.id, p_player_id, null from public.ballots b
    on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.admin_set_player_active(uuid, boolean) from public, anon;
grant execute on function public.admin_set_player_active(uuid, boolean) to authenticated;
