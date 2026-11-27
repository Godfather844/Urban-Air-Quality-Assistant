interface HeaderProps {
  onOpenCustomInput: () => void;
}

export function Header({ onOpenCustomInput }: HeaderProps) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          <a
            href="#overview"
            className="shrink-0 whitespace-nowrap font-display text-base font-bold tracking-tight text-slate-900 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:text-lg"
          >
            Urban Air Quality Assistant
          </a>

          <nav
            aria-label="Primary sections"
            className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex"
          >
            <a
              href="#overview"
              className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-slate-950 hover:underline hover:underline-offset-4 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            >
              Overview
            </a>
            <a
              href="#guidance"
              className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-slate-950 hover:underline hover:underline-offset-4 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            >
              Guidance
            </a>
            <a
              href="#sensitive-groups"
              className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-slate-950 hover:underline hover:underline-offset-4 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            >
              Sensitive Groups
            </a>
            <a
              href="#assistant"
              className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-slate-950 hover:underline hover:underline-offset-4 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            >
              Ask Assistant
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={onOpenCustomInput}
              className="inline-flex min-h-[40px] shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            >
              Custom Reading
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
