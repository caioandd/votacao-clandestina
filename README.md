# Votação · 3ª Copa Clandestina de Futsal

Sistema de votação da 3ª Copa Clandestina. Quem vota **não faz login**: na entrada,
escreve o nome completo, que fica salvo num **cookie do aparelho**, e dá uma nota de
1 a 5 estrelas — ou marca **“Não sei”** — para cada jogador da lista.

A organização usa as notas para montar **6 times equilibrados**. O ranking é
interno: nenhum votante vê a nota do outro. O logar com Google é só da
organização, para abrir o painel (`/admin`).

Depois dos times definidos, a página **`/copa`** mostra o campeonato ao vivo: os
seis times **com seus integrantes**, dois grupos de três, semifinais cruzadas,
final e disputa de 3º lugar — com os placares preenchidos pela organização
(logada).

| | |
|---|---|
| Site | GitHub Pages (estático) |
| Banco | Supabase (Postgres) |
| Login | Só a organização (Google). Votantes usam cookie do aparelho |
| Prazo padrão | 25/11/2026 às 23:59 (America/Bahia) |
| Votação | 1 cédula por aparelho, editável até o prazo |
| Resultado | Só no painel da organização (`/admin`) |
| Campeonato | Times e tabela pública em `/copa` (só a organização edita) |

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

Para testar o painel com dados: `/admin` → aba **Cédulas** → *Gerar 24 cédulas de
teste* → aba **Times** → *Gerar 6 times*. A página `/copa` roda no mesmo modo,
com a chave inteira editável (placares, nomes e integrantes).

---

## 2. Criar o banco no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (região **South America
   (São Paulo)** se aparecer).
2. No menu **SQL Editor**, cole todo o conteúdo de
   [`supabase/migrations/20261122000100_init.sql`](supabase/migrations/20261122000100_init.sql)
   e clique em **Run**. Isso cria as tabelas, as regras de acesso (RLS), as funções
   de votação e a lista dos 30 jogadores.
   - Pode rodar de novo sem medo: não duplica jogadores nem apaga votos.
   - Depois da inicial, rode também (na ordem) o
     [`20261122000200_admin_limpar_votos_nota.sql`](supabase/migrations/20261122000200_admin_limpar_votos_nota.sql)
     (coluna *nota* do painel + limpar votos), o
     [`20261124000100_admin_desativar_jogador.sql`](supabase/migrations/20261124000100_admin_desativar_jogador.sql)
     (desativar/reativar jogador), o
     [`20261124000200_voto_por_cookie.sql`](supabase/migrations/20261124000200_voto_por_cookie.sql)
     (voto por cookie, sem login para quem vota), o
     [`20261125000100_campeonato.sql`](supabase/migrations/20261125000100_campeonato.sql)
     (chave do campeonato da página `/copa`) e o
     [`20261125000200_times_do_campeonato.sql`](supabase/migrations/20261125000200_times_do_campeonato.sql)
     (os seis times da 3ª Copa e a tabela oficial dos jogos) e o
     [`20261125000300_integrantes_dos_times.sql`](supabase/migrations/20261125000300_integrantes_dos_times.sql)
     (integrantes dos times na seção *Times e integrantes* da `/copa`). Todos
     são idempotentes.
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

## 3. Ligar o login do Google (só para a organização)

Quem vota não passa por aqui. O Google é usado apenas pelas contas da
organização, para abrir o painel `/admin` (e editar a chave em `/copa`).

### 3.1 No Google Cloud Console

1. Crie um projeto em [console.cloud.google.com](https://console.cloud.google.com).
2. **APIs e serviços → Tela de permissão OAuth**:
   - Tipo: **Externo** · Nome do app: `Votação 3ª Copa Clandestina`
   - E-mail de suporte e de contato: o seu
   - Escopos: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`
   - Usuários de teste: adicione o seu e-mail e o da organização (só essas
     contas conseguem logar enquanto o app não estiver publicado)
   - **Publique o app** (botão *Publicar aplicativo*) para liberar de vez. Os
     escopos acima são básicos: não exigem revisão do Google.
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

> **Links diretos** (ex.: `.../votacao-clandestina/copa`): o build copia o
> `index.html` para `404.html` (`scripts/copy-404.mjs`), e o GitHub Pages serve
> essa cópia para qualquer caminho desconhecido — o app sobe e o router encontra
> a rota. Funciona para `/copa`, `/admin` etc.

---

## 5. Promover a organização a admin

Depois do primeiro login da conta da organização:

```sql
insert into public.admins (user_id, email)
select id, email from auth.users where email = 'seuemail@ifba.edu.br'
on conflict (user_id) do nothing;
```

Pronto: essa conta passa a ver o painel em `/admin` (e a editar a chave em `/copa`).

---

## 6. Como operar no dia

Tudo em `/admin`:

| Aba | Para que serve |
|---|---|
| **Ranking** | Nota (estrela mais votada), média, mediana, votos e “não sei” de cada jogador. Toque no nome para abrir a tabela por estrela. CSV para planilha. |
| **Times** | Gera 6 times equilibrados, permite trocas manuais e exporta texto para WhatsApp + CSV. |
| **Cédulas** | Quem já votou (nome, aparelho, versão, horário), apagar uma cédula e a caixa **Limpar votos** (apaga todas, pedindo confirmação). |
| **Ajustes** | Prazo final, marcar goleiros, ativar/desativar jogadores, adicionar jogador. |

**Marcar goleiros** (Ajustes): goleiros votam normalmente, mas ficam fora da
divisão dos times. Marque cada um antes de gerar.

**Desativar jogador** (Ajustes): use quando alguém desistir. O jogador sai da
votação e do ranking, mas os votos já recebidos ficam guardados; se ele voltar,
basta marcar de novo — quem já votou passa a vê-lo como “não sei” e pode
completar até o prazo.

**Adicionar o 30º jogador** (Ajustes): quem já votou passa a ver o jogador novo
como “não sei” e pode editar o voto até o prazo.

**Prazo**: vale sempre o horário do servidor. Depois dele, envio e edição são
recusados no banco, mesmo que alguém tente burlar o site.

**Encerrar a votação** (Ajustes → *Encerrar agora*): fecha na hora. A partir daí
o site avisa “resultados em breve”: ninguém vota, edita ou entra na votação —
só a tela de encerramento (e regulamento/privacidade) continua acessível. Para
reabrir, mude o prazo para uma data futura e salve.

**Antes de divulgar os times**: baixe os CSVs (Ranking, Cédulas e Times) como
backup.

### Campeonato (`/copa`)

A tabela do campeonato fica numa página pública própria: `.../votacao-clandestina/copa`.
Qualquer pessoa abre e acompanha sem login; a página se atualiza sozinha a cada
15 segundos (e ao voltar para a aba), sem precisar recarregar.

Com a **conta da organização logada**, a mesma página libera a edição:

1. **Times e integrantes** — na seção *Times e integrantes*, no fim da página,
   edite o nome de cada time e a lista de quem joga nele — **um integrante por
   linha** — e toque em **Salvar**. O grupo de cada slot é fixo.
2. **Placares** — toque nos campos de gols da partida, preencha e **Salvar**. A
   tabela do grupo e o chaveamento recalculam na hora, para todos.
3. **Mata-mata empatado** — se o jogo terminar empatado, aparecem os campos de
   **pênaltis**: preencha (um time precisa ter mais) para definir quem avança.
   Sem isso o vencedor não é definido.
4. **Limpar um resultado** — deixe os dois campos vazios e salve.

Regras da tabela: vitória 3 pontos, empate 1. Os dois primeiros de cada grupo
avançam; o desempate é pontos → saldo de gols → gols pró → confronto direto. Se
ainda empatar em tudo, a página avisa e a organização decide no sorteio.

O chaveamento é cruzado: **1º do A × 2º do B** e **2º do A × 1º do B** nas
semifinais; vencedores fazem a final, perdedores disputam o 3º lugar.

> Os slots da `/copa` são separados dos 6 times de treino gerados na aba
> **Times** do painel: a organização copia os nomes (e a lista de integrantes)
> para a seção *Times e integrantes* da `/copa` quando quiser.

---

## 7. Banco de dados (resumo)

```
players   (id, full_name, nickname, is_goalkeeper, sort_order, active)
ballots   (id, voter_id único, full_name, revision, submitted_at, updated_at)
          -- voter_id = identificador do aparelho (cookie) ou da conta antiga
ratings   (ballot_id, player_id, score 1..5 ou null)   -- null = "não sei"
settings  (opens_at, closes_at, results_public)
admins    (user_id)
tournament_teams    (id a1..b3, name, group_key A/B, sort_order, members text[])
                    -- os slots da página /copa (nome e integrantes editáveis pela org)
tournament_matches  (id, stage group/semi/final/third, home/away_team_id,
                     home/away_score, home/away_pens, sort_order)
                    -- placar + pênaltis; nulos = jogo sem resultado
```

Regras garantidas pelo banco:

- Quem vota não precisa de conta: o cookie do aparelho identifica a cédula.
- Uma cédula por aparelho; cada envio incrementa `revision`.
- Escrita das notas **só** pelas funções `voter_submit_ballot` (cookie) e
  `submit_ballot` (conta antiga, para as cédulas de antes), que validam janela
  de votação, nome, lista completa e intervalo das notas.
- Trigger de defesa bloqueia escrita fora do prazo mesmo em chamadas diretas.
- Ranking exposto apenas para quem está em `admins`.
- A chave do campeonato é lida por `get_tournament` (pública, serve o anon) e
  escrita só por `admin_set_team_name`, `admin_set_team_members` e
  `admin_set_match_score`, que exigem `is_admin()`. As tabelas têm RLS e não
  aceitam escrita direta.
- A tabela de grupo e o chaveamento **não ficam salvos**: são calculados no
  cliente a partir dos placares, então nunca ficam defasados.

### Nota usada nos times

`nota = estrela inteira (1–5) que mais aparece nas notas do jogador` — empate
resolve pela estrela mais alta; quem não recebeu nenhuma nota fica sem nota e
vai para o fim do ranking.

Ex.: 4 votos de 3★ + 2 votos de 4★ → nota 3★. A nota ordena o ranking e o
snake draft dos times; empate na nota desempata pela média. Média e mediana
continuam no painel como informação, e a tabela por estrela abre ao tocar no
nome do jogador.

---

## 8. Problemas comuns

**“Painel restrito”** — a conta Google usada não está na lista da organização.
Use *Trocar de conta* (ou *Entrar com Google*, se ninguém entrou ainda).

**Alguém já votou neste aparelho e outra pessoa quer votar** — na entrada (ou no
botão *Trocar de pessoa* dentro da votação), confirme *Trocar de pessoa*. A
cédula anterior continua registrada; a nova pessoa começa uma cédula nova.

**Trocar de aparelho ou limpar o navegador** — o cookie se perde e a pessoa
passa a votar como cédula nova (a antiga fica guardada). Se aparecer cédula
repetida no painel, apague a que não interessa em **Cédulas**.

**Supabase pausa o projeto** — planos gratuitos pausam após cerca de 7 dias sem
uso. Com a votação correndo isso não acontece; depois da copa, exporte os dados.

**Quero mudar a lista de jogadores** — só pelo painel (Ajustes) e só antes de
fechar. Jogador que desistir: desmarque em **Ativos na votação** (os votos dele
ficam guardados). Depois do prazo, a lista deve ficar congelada.

**A tabela da `/copa` não carrega, o placar não salva ou os integrantes não
editam** — faltam rodar as migrations do campeonato no Supabase
([`20261125000100_campeonato.sql`](supabase/migrations/20261125000100_campeonato.sql),
[`20261125000200_times_do_campeonato.sql`](supabase/migrations/20261125000200_times_do_campeonato.sql)
e [`20261125000300_integrantes_dos_times.sql`](supabase/migrations/20261125000300_integrantes_dos_times.sql)).
A própria página avisa quando o banco não tem a função.

---

## 9. Desenvolvimento

```bash
npm run dev       # servidor local
npm run build     # build de produção (tsc + vite + cópia do 404.html)
npm run preview   # serve o build
npm run lint      # oxlint
```

- `src/lib/data/` — camada de dados com dois adaptadores: `demo` (localStorage) e
  `supabase`. O modo é escolhido pelas variáveis de ambiente.
- `src/lib/teams.ts` — gerador dos times (snake draft + busca local determinística).
- `src/lib/tournament.ts` — tabelas de grupo (com desempates), chaveamento e pódio
  da página `/copa`, tudo derivado dos placares.
- `src/lib/validation.ts` — mesmas regras de nome e nota que o banco aplica.
- `supabase/migrations/` — o SQL aplicado no projeto.
- `scripts/copy-404.mjs` — copia o `index.html` do build para `404.html`
  (fallback dos links diretos no GitHub Pages).
- `scripts/shoot-app.mjs` — tira fotos das telas internas no modo demonstração
  (Chrome headless), para conferir o visual em 390px e 1440px:

```bash
node scripts/shoot-app.mjs --route votar   --w 390
node scripts/shoot-app.mjs --route times   --w 390
node scripts/shoot-app.mjs --route ranking --w 1440
node scripts/shoot-app.mjs --route copa-cheia --w 390
node scripts/shoot-app.mjs --route times   --w 390 --clip header
```

  Rotas: `identificar, votar, revisar, enviado, encerrada, regulamento, privacidade,
  admin, ranking, times, cedulas, ajustes` e as da chave: `copa` (vazia, logado),
  `copa-publica` (visão pública), `copa-cheia` (grupos e mata-mata completos) e
  `copa-nomes` (área de renomear times aberta). `--clip <seletor>` recorta um
  elemento. As imagens vão para `shots/app/` (fora do git).
