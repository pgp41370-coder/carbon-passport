import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { PageId } from '../../types/navigation'
import { Icon } from '../Icon'
import { Sidebar } from './Sidebar'

interface AppShellProps {
  currentPageId: PageId
  children: ReactNode
}

export function AppShell({ currentPageId, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    drawerRef.current?.querySelector<HTMLElement>('a[href]')?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  function closeMenu() {
    setMenuOpen(false)
    menuButtonRef.current?.focus()
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      {/* Hash routing means a plain #main link would change route, so focus manually. */}
      <a
        href="#main-content"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
        className="sr-only z-50 rounded-lg bg-surface px-4 py-2 text-sm font-medium text-forest-800 shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-screen lg:block">
        <Sidebar currentPageId={currentPageId} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur lg:hidden">
        <span className="flex items-center gap-2.5 font-semibold tracking-tight text-forest-950">
          <span className="grid size-8 place-items-center rounded-lg bg-forest-800 text-forest-200">
            <Icon name="passport" className="size-4" />
          </span>
          Carbon Passport
        </span>
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          className="grid size-10 place-items-center rounded-lg text-ink-700 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-forest-500"
        >
          <Icon name="menu" />
          <span className="sr-only">Open navigation</span>
        </button>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={closeMenu}
            className="absolute inset-0 bg-forest-950/50"
          />
          <div
            ref={drawerRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl"
          >
            <Sidebar currentPageId={currentPageId} onNavigate={() => setMenuOpen(false)} />
            <button
              type="button"
              onClick={closeMenu}
              className="absolute top-5 right-3 grid size-9 place-items-center rounded-lg text-forest-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-forest-300"
            >
              <Icon name="close" />
              <span className="sr-only">Close navigation</span>
            </button>
          </div>
        </div>
      )}

      <main id="main-content" tabIndex={-1} className="min-w-0 outline-none">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  )
}
