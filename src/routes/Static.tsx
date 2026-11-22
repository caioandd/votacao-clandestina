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
              Qualquer pessoa com e-mail institucional <strong className="text-paper">@ifba.edu.br</strong>{' '}
              e conta Google ativa. Cada conta registra <strong className="text-paper">uma única
              cédula</strong>.
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
              A organização usa as notas para dividir os participantes em{' '}
              <strong className="text-paper">6 times equilibrados</strong>. O critério é a média
              ponderada de cada jogador: quem tem poucos votos é puxado para perto da média geral,
              para não ficar à frente de quem recebeu muitos votos.
            </p>
            <p>
              “Não sei” não entra na média — conta apenas como abstenção. Goleiros participam da
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
              Seus dados nesta votação
            </h1>
          </header>

          <Block title="O que é guardado">
            <p>
              Endereço de e-mail institucional, nome completo informado no momento do voto, as notas
              que você deu, a data e hora de cada envio e o número da versão da cédula.
            </p>
          </Block>

          <Block title="Para que serve">
            <p>
              Garantir uma cédula por pessoa, permitir que você edite o próprio voto e dar à
              organização meios de auditar o processo em caso de contestação.
            </p>
          </Block>

          <Block title="Quem vê">
            <p>
              Apenas a organização da 3ª Copa Clandestina. O ranking apresentado ao grupo é
              agregado: médias e contagem de votos, sem associar nota a votante.
            </p>
            <p>
              Médias de jogadores com pouquíssimos votos ficam frágeis por natureza — por isso a
              leitura é feita em conjunto, com mediana e abstenções ao lado da média.
            </p>
          </Block>

          <Block title="Por quanto tempo">
            <p>
              Os dados ficam guardados durante a organização da copa e por até 90 dias depois da
              divulgação dos times, quando são apagados. Para pedir a remoção antes disso, procure a
              organização.
            </p>
          </Block>
        </div>
      </PageContainer>
    </AppShell>
  )
}
