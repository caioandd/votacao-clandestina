import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'quiet' | 'danger'
  size?: 'md' | 'lg' | 'sm'
  full?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  full,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'btn-press inline-flex items-center justify-center gap-2 rounded-full font-semibold disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' && 'h-9 px-4 text-[13px]',
        size === 'md' && 'h-11 px-6 text-[15px]',
        size === 'lg' && 'h-14 px-8 text-[16px]',
        variant === 'primary' && 'bg-gold text-ink hover:bg-gold-deep',
        variant === 'ghost' && 'border border-line-2 text-paper hover:border-ash-600 hover:bg-surface',
        variant === 'quiet' && 'text-ash hover:text-paper',
        variant === 'danger' && 'border border-crimson/60 text-crimson hover:bg-crimson/10',
        full && 'w-full',
        className,
      )}
      {...props}
    />
  )
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('kicker', className)}>{children}</p>
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'gold' | 'outline'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-md px-2 text-[11px] font-semibold uppercase tracking-[0.08em]',
        tone === 'neutral' && 'bg-surface-2 text-ash',
        tone === 'gold' && 'bg-gold text-ink',
        tone === 'outline' && 'border border-line-2 text-ash',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-ash">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-line-2 border-t-gold"
        aria-hidden="true"
      />
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  )
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-ash">{label}</span>
      <span className="display text-[32px] text-paper">{value}</span>
      {hint ? <span className="text-[12px] text-ash-600">{hint}</span> : null}
    </div>
  )
}
