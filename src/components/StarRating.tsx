import { useCallback, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../lib/cn'

export type Rating = number | null | undefined

type Props = {
  playerName: string
  value: Rating
  disabled?: boolean
  onChange: (value: Rating) => void
  className?: string
}

const STAR_PATH =
  'M12 2.8l2.83 5.73 6.32.92-4.57 4.46 1.08 6.3L12 17.24l-5.66 2.97 1.08-6.3L2.85 9.45l6.32-.92L12 2.8z'

const OPTIONS: ({ key: string; score: number } | { key: string; score: null })[] = [
  ...Array.from({ length: 5 }, (_, i) => ({ key: `s${i + 1}`, score: i + 1 })),
  { key: 'unknown', score: null },
]

const LAST = OPTIONS.length - 1

export function StarRating({ playerName, value, disabled, onChange, className }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const [pop, setPop] = useState<number | null>(null)

  const checkedIndex = typeof value === 'number' ? value - 1 : value === null ? LAST : -1
  const focusIndex = checkedIndex >= 0 ? checkedIndex : 0

  const commit = useCallback(
    (index: number) => {
      const option = OPTIONS[index]
      if (option.score === null) {
        onChange(value === null ? undefined : null)
        return
      }
      if (value === option.score) {
        onChange(undefined)
        return
      }
      setPop(option.score)
      window.setTimeout(() => setPop(null), 280)
      onChange(option.score)
    },
    [onChange, value],
  )

  const move = useCallback(
    (index: number) => {
      const next = Math.min(Math.max(index, 0), LAST)
      refs.current[next]?.focus()
      commit(next)
    },
    [commit],
  )

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        move(checkedIndex >= 0 ? checkedIndex + 1 : 0)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        move(checkedIndex >= 0 ? checkedIndex - 1 : LAST)
        break
      case 'Home':
        event.preventDefault()
        move(0)
        break
      case 'End':
        event.preventDefault()
        move(LAST)
        break
      case 'Backspace':
      case 'Delete':
        event.preventDefault()
        onChange(undefined)
        break
      default:
        break
    }
  }

  const unknownSelected = value === null

  return (
    <div
      role="radiogroup"
      aria-label={`Nota para ${playerName}`}
      onKeyDown={onKeyDown}
      className={cn('flex items-center gap-1.5', className)}
    >
      {OPTIONS.slice(0, 5).map((option, index) => {
        const score = option.score as number
        const filled = typeof value === 'number' && score <= value
        const selected = value === score
        return (
          <button
            key={option.key}
            ref={(node) => {
              refs.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${score} ${score === 1 ? 'estrela' : 'estrelas'}`}
            tabIndex={index === focusIndex ? 0 : -1}
            disabled={disabled}
            data-filled={filled}
            data-just={pop === score}
            className="star-btn"
            onClick={() => commit(index)}
          >
            <svg className="star-svg" viewBox="0 0 24 24" strokeWidth={1.7} aria-hidden="true">
              <path d={STAR_PATH} strokeLinejoin="round" />
            </svg>
          </button>
        )
      })}

      <button
        ref={(node) => {
          refs.current[5] = node
        }}
        type="button"
        role="radio"
        aria-checked={unknownSelected}
        aria-label="Não sei"
        tabIndex={focusIndex === LAST ? 0 : -1}
        disabled={disabled}
        data-checked={unknownSelected}
        className="unknown-chip"
        onClick={() => commit(LAST)}
      >
        Não sei
      </button>
    </div>
  )
}
