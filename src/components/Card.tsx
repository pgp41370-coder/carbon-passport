import type { ReactNode } from 'react'

interface CardProps {
  title: string
  /** Optional element shown to the right of the title, e.g. a tag or count. */
  aside?: ReactNode
  className?: string
  children: ReactNode
}

/** Titled content section. The title is an h2, so cards double as page sections. */
export function Card({ title, aside, className = '', children }: CardProps) {
  const headingId = `card-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <section
      aria-labelledby={headingId}
      className={`rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(21_26_24/0.04)] sm:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-base font-semibold text-ink-900">
          {title}
        </h2>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}
