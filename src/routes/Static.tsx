import { AppShell, PageContainer } from '../components/Layout'
import { Kicker } from '../components/ui'

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[16px] font-semibold text-paper">{title}</h2>
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-ash">{children}</div>
    </section>
  )
}

export function Regulamento() {
  return (
    <AppShell>
      <PageContainer className="py-8">
        <div className="flex flex-col gap-8">
          <header className="flex flex-col gap-3">
            <Kicker>Regulamento</Kicker>
            <h1 className="display text-[38px] leading-none text-paper sm:text-[46px]">
              Como funciona a votação
            </h1>
          </header>

          <Block title="Quem vota">
            <p>
              Qualquer pessoa que recebeu o link da votação. Na entrada você escreve seu{' '}
              <strong className="text-paper">nome completo</strong> — ele fica salvo apenas no seu
              aparelho, sem conta e sem senha. Cada aparelho registra{' '}
              <strong className="text-paper">uma única cédula</strong>.
            </p>
          </Block>

          <Block title="Como votar">
            <p>
              Para cada jogador da lista você dá uma nota de <strong className="text-paper">1 a 5
              estrelas</strong> ou marca <strong className="text-paper">“Não sei”</strong>. A lista
              inteira precisa de uma resposta: estrela ou “Não sei”.
            </p>
            <p>
              Você pode mudar suas notas quantas vezes quiser até o prazo final. Cada envio gera uma
              nova versão da sua cédula, registrada com data e hora.
            </p>
          </Block>

          <Block title="Como as notas são usadas">
            <p>
              Cada jogador recebe uma <strong className="text-paper">nota</strong>: a estrela (de 1
              a 5) que <strong className="text-paper">mais apareceu</strong> nos votos dele — por
              exemplo, 4 votos de 3 estrelas e 2 votos de 4 estrelas dão nota 3. Empate entre
              estrelas resolve pela mais alta. A organização usa essas notas para dividir os
              participantes em <strong className="text-paper">6 times equilibrados</strong>.
            </p>
            <p>
              “Não sei” não entra na nota — conta apenas como abstenção. Goleiros participam da
              votação, mas neste momento não entram na divisão dos times.
            </p>
          </Block>

          <Block title="Resultado">
            <p>
              O ranking é <strong className="text-paper">interno da organização</strong>. Nenhuma
              nota individual ou identidade de votante é publicada. A divulgação dos times é feita
              pela própria organização da copa.
            </p>
          </Block>

          <Block title="Prazo">
            <p>
              A votação fica aberta até o horário divulgado no site. O horário é conferido no
              servidor: depois do prazo, nenhuma cédula nova é aceita e nenhuma edição é possível.
            </p>
          </Block>
        </div>
      </PageContainer>
    </AppShell>
  )
}

export function Privacidade() {
  return (
    <AppShell>
      <PageContainer className="py-8">
        <div className="flex flex-col gap-8">
          <header className="flex flex-col gap-3">
            <Kicker>Privacidade</Kicker>
            <h1 className="display text-[38px] leading-none text-paper sm:text-[46px]">
              Política de Privacidade
            </h1>
            <p className="text-[13px] text-ash-600">Última atualização: 23 de novembro de 2026.</p>
          </header>

          <Block title="1. Quem somos">
            <p>
              Este site é o aplicativo de votação da{' '}
              <strong className="text-paper">3ª Copa Clandestina de Futsal</strong>, um campeonato
              entre estudantes do IFBA. É um aplicativo <strong className="text-paper">interno</strong>,
              feito pela organização do evento, sem fins comerciais ou publicitários. A finalidade é
              única: coletar as notas dos jogadores (de 1 a 5 estrelas) e montar os 6 times
              equilibrados da copa.
            </p>
            <p>
              Responsável pelo tratamento dos dados e contato da organização:{' '}
              <a className="text-gold underline" href="mailto:202111130002@ifba.edu.br">
                202111130002@ifba.edu.br
              </a>
              .
            </p>
          </Block>

          <Block title="2. Como você se identifica para votar">
            <p>
              Para votar não pedimos conta, e-mail nem senha: na entrada você escreve seu{' '}
              <strong className="text-paper">nome completo</strong>. O nome fica salvo em um
              cookie apenas no seu aparelho — serve para pré-preencher a entrada nas próximas
              visitas e para permitir que você edite a própria cédula. A organização usa o nome
              para conferir que cada pessoa votou uma vez.
            </p>
            <p>
              O aplicativo não usa inteligência artificial para gerar, editar ou publicar
              conteúdo.
            </p>
          </Block>

          <Block title="3. Dados guardados na votação">
            <p>Quando você envia a cédula, guardamos:</p>
            <ul className="flex flex-col gap-1 pl-5">
              <li className="list-disc">o nome completo informado por você;</li>
              <li className="list-disc">
                um identificador aleatório do aparelho (para permitir a edição da própria cédula);
              </li>
              <li className="list-disc">as notas (1 a 5 estrelas ou “não sei”) dadas a cada jogador;</li>
              <li className="list-disc">a data e a hora de cada envio;</li>
              <li className="list-disc">o número da versão da cédula (cada edição gera uma versão).</li>
            </ul>
          </Block>

          <Block title="4. Para que usamos">
            <ul className="flex flex-col gap-1 pl-5">
              <li className="list-disc">
                garantir uma cédula por aparelho e permitir que você edite o voto até o prazo;
              </li>
              <li className="list-disc">
                apurar o ranking interno e dividir os participantes em 6 times equilibrados;
              </li>
              <li className="list-disc">auditar o processo em caso de contestação dentro da organização.</li>
            </ul>
          </Block>

          <Block title="5. O que este aplicativo não faz">
            <ul className="flex flex-col gap-1 pl-5">
              <li className="list-disc">
                não vende, aluga nem compartilha seus dados com terceiros para publicidade;
              </li>
              <li className="list-disc">
                não exibe anúncios nem rastreia sua navegação fora do aplicativo;
              </li>
              <li className="list-disc">
                não publica notas individuais, identidade de votantes nem o resultado — o ranking é
                interno da organização;
              </li>
              <li className="list-disc">
                não gera, edita ou publica imagens ou qualquer conteúdo com inteligência artificial.
              </li>
            </ul>
          </Block>

          <Block title="6. Uso das APIs do Google">
            <p className="rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3">
              O uso das informações recebidas das APIs do Google por este aplicativo está em
              conformidade com a{' '}
              <a
                className="text-gold underline"
                href="https://developers.google.com/terms/api-services-user-data-policy"
                rel="noopener"
                target="_blank"
              >
                Política de Dados do Usuário dos Serviços de API do Google
              </a>
              , incluindo os requisitos de Uso Limitado.
            </p>
            <p>
              O login com o Google (OpenID Connect, escopos de e-mail e perfil) é usado somente
              pela organização, para acessar o painel interno com o ranking. Quem vota não faz
              login e não precisa de conta Google. Não acessamos Gmail, Drive, contatos, agenda ou
              qualquer outro dado de contas Google.
            </p>
          </Block>

          <Block title="7. Onde os dados ficam">
            <p>
              O site é hospedado no <strong className="text-paper">GitHub Pages</strong>; o banco de
              dados fica no <strong className="text-paper">Supabase</strong>; o login da organização
              é processado pelo <strong className="text-paper">Google</strong>. Esses provedores
              tratam os dados apenas para operar o serviço, conforme as políticas próprias de cada
              um.
            </p>
          </Block>

          <Block title="8. Por quanto tempo">
            <p>
              Os dados ficam guardados durante a organização da copa e são apagados{' '}
              <strong className="text-paper">até 90 dias após a divulgação dos times</strong>. A
              organização pode apagar uma cédula específica ou todas antes disso — inclusive a seu
              pedido.
            </p>
          </Block>

          <Block title="9. Seus direitos (LGPD)">
            <p>
              Você pode pedir, a qualquer momento, informação, correção ou exclusão dos seus dados
              pelo contato indicado no item 1. Você também pode editar a própria cédula até o prazo
              final da votação; depois do prazo, a edição fica bloqueada, mas a exclusão continua
              disponível se solicitada à organização.
            </p>
          </Block>

          <Block title="10. Alterações deste aviso">
            <p>
              Se este aviso mudar, a data de atualização no topo também muda. Mudanças relevantes
              são avisadas na página inicial da votação.
            </p>
          </Block>
        </div>
      </PageContainer>
    </AppShell>
  )
}
