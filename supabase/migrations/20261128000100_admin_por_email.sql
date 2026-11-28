-- ============================================================================
-- 008 — Promover a organização a admin (por e-mail)
-- ----------------------------------------------------------------------------
-- Rodar depois das migrations anteriores (só depende da 001).
-- Como aplicar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- É idempotente: pode rodar de novo sem efeito colateral.
--
-- Adiciona o e-mail 202011130028@ifba.edu.br como admin — acesso ao painel
-- (/admin) e à edição da chave (/copa).
--
-- Atenção: a conta precisa ter feito o PRIMEIRO LOGIN com o Google antes — é
-- o login que cria a linha em auth.users, e a promoção liga pelo id real
-- dessa linha. Se a conta ainda não existir, este arquivo não faz nada e
-- avisa: faça o primeiro login e rode de novo.
--
-- Confira depois com:  select * from public.admins;
-- ============================================================================

do $$
declare
  v_email constant text := '202011130028@ifba.edu.br';
  v_users integer;
begin
  select count(*) into v_users
    from auth.users u
   where lower(u.email) = lower(v_email);

  if v_users = 0 then
    raise notice 'Nenhuma conta % em auth.users: faça o primeiro login com o Google e rode este arquivo de novo.', v_email;
  else
    insert into public.admins (user_id, email)
    select u.id, u.email
      from auth.users u
     where lower(u.email) = lower(v_email)
    on conflict (user_id) do nothing;

    raise notice 'Admin garantido para % (% conta(s) com esse e-mail).', v_email, v_users;
  end if;
end;
$$;
