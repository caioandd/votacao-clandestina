-- ============================================================================
-- 006 — Times da 3ª Copa na chave do campeonato
-- ----------------------------------------------------------------------------
-- Rodar DEPOIS das migrations 001, 002, 003, 004 e 005.
-- Como aplicar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- É idempotente: pode rodar de novo sem efeito colateral.
--
-- Fecha a chave com a divisão oficial da organização:
--   Grupo A: Time 5 · Time 2 · Time 1
--   Grupo B: Time 3 · Time 4 · Time 6
-- e com os jogos na ordem divulgada:
--   Grupo A: Time 5 × Time 2 · Time 5 × Time 1 · Time 2 × Time 1
--   Grupo B: Time 3 × Time 4 · Time 6 × Time 3 · Time 4 × Time 6
--
-- Os nomes continuam editáveis pela própria página /copa (área "Editar nomes
-- dos times"), mas a chave oficial já sobe pronta com este arquivo.
-- ============================================================================

update public.tournament_teams t
   set name = v.name,
       updated_at = now()
  from (values
    ('a1', 'Time 5'),
    ('a2', 'Time 2'),
    ('a3', 'Time 1'),
    ('b1', 'Time 3'),
    ('b2', 'Time 4'),
    ('b3', 'Time 6')
  ) as v (id, name)
 where t.id = v.id;

-- O jogo 2 do Grupo B fica com o Time 6 mandando (b3 × b1), exatamente como na
-- lista oficial; os outros cinco jogos já caem na ordem certa pelos slots.
update public.tournament_matches
   set home_team_id = 'b3',
       away_team_id = 'b1',
       updated_at = now()
 where id = 'gb2';
