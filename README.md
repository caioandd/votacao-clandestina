# Votação · 3ª Copa Clandestina de Futsal

Sistema de votação da 3ª Copa Clandestina. Cada pessoa entra com a conta Google
institucional (`@ifba.edu.br`), informa o nome completo e dá uma nota de 1 a 5
estrelas — ou marca **“Não sei”** — para cada jogador da lista.

A organização usa as notas para montar **6 times equilibrados**. O ranking é
interno: nenhum votante vê a nota do outro.

| | |
|---|---|
| Site | GitHub Pages (estático) |
| Login e banco | Supabase (Postgres + Google OAuth) |
| Prazo padrão | 25/11/2026 às 23:59 (America/Bahia) |
| Votação | 1 cédula por conta, editável até o prazo |
| Resultado | Só no painel da organização (`#/admin`) |

---

## 1. Rodar local (modo demonstração)

Sem nenhuma configuração, o app roda com dados falsos no próprio navegador —
útil para testar o fluxo inteiro.

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. O rodapé mostra **MODO DEMONSTRAÇÃO** enquanto não
existir `.env.local`.

Para testar o painel com dados: `#/admin` → aba **Cédulas** → *Gerar 24 cédulas de
teste* → aba **Times** → *Gerar 6 times*.

---

## 2. Criar o banco no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (região **South America
   (São Paulo)** se aparecer).
2. No menu **SQL Editor**, cole todo o conteúdo de
   [`supabase/migrations/20261122000100_init.sql`](supabase/migrations/20261122000100_init.sql)
   e clique em **Run**. Isso cria as tabelas, as regras de acesso (RLS), as funções
   de votação e a lista dos 30 jogadores.
   - Pode rodar de novo sem medo: não duplica jogadores nem apaga votos.
3. Em **Project Settings → API**, copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - a chave pública → `VITE_SUPABASE_ANON_KEY` (no projeto novo ela aparece como
     **publishable key**, `sb_publishable_...`; é a antiga *anon key* renomeada:
     vai no site, pode ser pública)

Crie o `.env.local` na raiz:

```bash
cp .env.example .env.local
# preencha as duas variáveis
```

> A chave pública (anon/publishable) é pública por design: quem protege os votos
> são as políticas de RLS. A **secret**/**service_role** nunca entra no site —
> só em scripts locais.

---

## 3. Ligar o login do Google

### 3.1 No Google Cloud Console

1. Crie um projeto em [console.cloud.google.com](https://console.cloud.google.com).
2. **APIs e serviços → Tela de permissão OAuth**:
   - Tipo: **Externo** · Nome do app: `Votação 3ª Copa Clandestina`
   - E-mail de suporte e de contato: o seu
   - Escopos: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`
   - Usuários de teste: adicione o seu e-mail e o da organização
   - **Publique o app** (botão *Publicar aplicativo*). Os escopos acima são
     básicos: não exigem revisão do Google e liberam o login para qualquer conta.
3. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo: **Aplicativo da Web**
   - Origens JavaScript autorizadas: `https://SEU-USUARIO.github.io`
   - URIs de redirecionamento autorizados:
     `https://SEU-PROJETO.supabase.co/auth/v1/callback`
4. Copie **Client ID** e **Client Secret**.

### 3.2 No Supabase

1. **Authentication → Providers → Google**: ative e cole Client ID e Secret.
2. **Authentication → URL Configuration**:
   - **Site URL**: `https://SEU-USUARIO.github.io/NOME-DO-REPO/`
   - **Redirect URLs**: adicione a mesma URL e também
     `http://localhost:5173/` (e `http://localhost:5180/` se usar essa porta).
3. **Authentication → Sign In / Providers → Email**: pode desativar, deixando só
   Google.

---

## 4. Publicar no GitHub Pages

1. Crie um repositório **público** (ex.: `votacao-clandestina`).
2. Envie o código:

```bash
git init
git add .
git commit -m "Votação da 3ª Copa Clandestina"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPO.git
git push -u origin main
```

3. No repositório: **Settings → Pages → Source: GitHub Actions**.
4. **Settings → Secrets and variables → Actions → Variables**: crie
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do Supabase.
5. Cada push na `main` publica o site. O endereço aparece em **Actions → Deploy
   no GitHub Pages**.

O `base` do build é calculado sozinho (`/<nome-do-repo>/`). Se um dia usar domínio
próprio, ajuste `VITE_BASE` para `/` no workflow.

---

## 5. Promover a organização a admin

Depois do primeiro login da conta da organização:

```sql
insert into public.admins (user_id, email)
select id, email from auth.users where email = 'seuemail@ifba.edu.br'
on conflict (user_id) do nothing;
```

Pronto: essa conta passa a ver o painel em `#/admin`.

---

## 6. Como operar no dia

Tudo em `#/admin`:

| Aba | Para que serve |
|---|---|
| **Ranking** | Índice, média, mediana, votos e “não sei” de cada jogador. CSV para planilha. |
| **Times** | Gera 6 times equilibrados, permite trocas manuais e exporta texto para WhatsApp + CSV. |
| **Cédulas** | Quem já votou (nome, e-mail, versão, horário). Permite apagar uma cédula. |
| **Ajustes** | Prazo final, marcar goleiros, adicionar jogador. |

**Marcar goleiros** (Ajustes): goleiros votam normalmente, mas ficam fora da
divisão dos times. Marque cada um antes de gerar.

**Adicionar o 30º jogador** (Ajustes): quem já votou passa a ver o jogador novo
como “não sei” e pode editar o voto até o prazo.

**Prazo**: vale sempre o horário do servidor. Depois dele, envio e edição são
recusados no banco, mesmo que alguém tente burlar o site.

**Encerrar antes**: mude o prazo para agora e salve.

**Antes de divulgar os times**: baixe os CSVs (Ranking, Cédulas e Times) como
backup.

---

## 7. Banco de dados (resumo)

```
players   (id, full_name, nickname, is_goalkeeper, sort_order, active)
ballots   (id, voter_id único, full_name, revision, submitted_at, updated_at)
ratings   (ballot_id, player_id, score 1..5 ou null)   -- null = "não sei"
settings  (opens_at, closes_at, results_public)
admins    (user_id)
```

Regras garantidas pelo banco:

- Só e-mail `@ifba.edu.br` verificado no Google lê a lista ou vota.
- Uma cédula por conta; cada envio incrementa `revision`.
- Escrita das notas **só** pela função `submit_ballot`, que valida janela de
  votação, nome, lista completa e intervalo das notas.
- Trigger de defesa bloqueia escrita fora do prazo mesmo em chamadas diretas.
- Ranking exposto apenas para quem está em `admins`.

### Índice usado nos times

`índice = (média × nº de votos + 5 × média geral) / (nº de votos + 5)`

Isso puxa quem tem poucos votos para perto da média geral, evitando que 2 votos
de 5 superem 20 votos de 4,5. As médias e medianas ficam ao lado, no painel.

---

## 8. Problemas comuns

**“Acesso restrito ao e-mail institucional”** — a conta usada não é
`@ifba.edu.br`. Use *Trocar de conta*.

**Login não abre no WhatsApp** — o navegador interno do WhatsApp bloqueia o
Google. A capa detecta isso e mostra o botão *Abrir no Chrome* (Android) ou a
instrução de abrir no Safari (iPhone).

**Supabase pausa o projeto** — planos gratuitos pausam após cerca de 7 dias sem
uso. Com a votação correndo isso não acontece; depois da copa, exporte os dados.

**Quero mudar a lista de jogadores** — só pelo painel (Ajustes) e só antes de
fechar. Depois do prazo, a lista deve ficar congelada.

---

## 9. Desenvolvimento

```bash
npm run dev       # servidor local
npm run build     # build de produção (tsc + vite)
npm run preview   # serve o build
npm run lint      # oxlint
```

- `src/lib/data/` — camada de dados com dois adaptadores: `demo` (localStorage) e
  `supabase`. O modo é escolhido pelas variáveis de ambiente.
- `src/lib/teams.ts` — gerador dos times (snake draft + busca local determinística).
- `src/lib/validation.ts` — mesmas regras de nome e nota que o banco aplica.
- `supabase/migrations/` — o SQL aplicado no projeto.
- `scripts/shoot-app.mjs` — tira fotos das telas internas no modo demonstração
  (Chrome headless), para conferir o visual em 390px e 1440px:

```bash
node scripts/shoot-app.mjs --route votar   --w 390
node scripts/shoot-app.mjs --route times   --w 390
node scripts/shoot-app.mjs --route ranking --w 1440
node scripts/shoot-app.mjs --route times   --w 390 --clip header
```

  Rotas: `identificar, votar, revisar, enviado, encerrada, regulamento, privacidade,
  admin, ranking, times, cedulas, ajustes`. `--clip <seletor>` recorta um elemento.
  As imagens vão para `shots/app/` (fora do git).
