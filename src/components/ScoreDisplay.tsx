export function ScoreDisplay({ value }: { value: number | null | undefined }) {
  if (value === undefined) {
    return <span className="text-[13px] text-ash-600">Sem resposta</span>
  }

  if (value === null) {
    return (
      <span className="unknown-chip" data-checked="true" aria-label="Não sei">
        Não sei
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((score) => (
        <svg
          key={score}
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          aria-hidden="true"
          style={{
            fill: score <= value ? 'var(--color-gold)' : 'transparent',
            stroke: score <= value ? 'var(--color-gold)' : 'var(--color-line-2)',
          }}
          strokeWidth={1.7}
        >
          <path
            d="M12 2.8l2.83 5.73 6.32.92-4.57 4.46 1.08 6.3L12 17.24l-5.66 2.97 1.08-6.3L2.85 9.45l6.32-.92L12 2.8z"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  )
}
