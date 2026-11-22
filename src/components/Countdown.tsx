import { countdownTo, formatCountdown } from '../lib/deadline'
import { cn } from '../lib/cn'

type Props = {
  closesAt: string
  now: Date
  size?: 'sm' | 'lg'
  className?: string
}

export function Countdown({ closesAt, now, size = 'lg', className }: Props) {
  const countdown = countdownTo(closesAt, now)
  const closed = countdown.totalMs <= 0

  if (size === 'sm') {
    const label = closed ? 'Encerrada' : `Fecha em ${formatCountdown(countdown)}`
    return (
      <span
        className={cn('tnum text-[13px] font-semibold text-ash', className)}
        title={label}
        aria-label={label}
      >
        {closed ? (
          label
        ) : (
          <>
            <span className="hidden sm:inline">Fecha em </span>
            <span>{formatCountdown(countdown)}</span>
          </>
        )}
      </span>
    )
  }

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-ash">
        {closed ? 'Votação encerrada' : 'Fecha em'}
      </span>
      <span
        className="display tnum text-[46px] leading-none text-paper sm:text-[58px]"
        aria-live="polite"
      >
        {closed ? '00h 00m' : formatCountdown(countdown)}
      </span>
    </div>
  )
}
