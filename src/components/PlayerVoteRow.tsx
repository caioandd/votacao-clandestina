import { StarRating, type Rating } from './StarRating'
import { Badge } from './ui'
import type { Player } from '../lib/types'

type Props = {
  player: Player
  value: Rating
  disabled?: boolean
  headingLevel?: 2 | 3
  onChange: (value: Rating) => void
}

export function PlayerVoteRow({ player, value, disabled, headingLevel = 3, onChange }: Props) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <article className="card-lift rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3.5 sm:px-5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <Heading className="truncate text-[17px] font-semibold leading-tight text-paper">
              {player.fullName}
            </Heading>
            {player.nickname ? (
              <span className="text-[13px] text-ash-600">{player.nickname}</span>
            ) : null}
            {player.isGoalkeeper ? (
              <Badge tone="neutral" className="translate-y-[-1px]">
                Goleiro
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="shrink-0">
          <StarRating
            playerName={player.fullName}
            value={value}
            disabled={disabled}
            onChange={onChange}
          />
        </div>
      </div>
    </article>
  )
}
