export default function Home() {
  return (
    <main className="relative min-h-screen bg-black overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(212,175,55,0.08),transparent_60%)]" />

      <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <span className="font-heading text-lg tracking-widest text-white">
          SHAHEEN SAHITA <span className="text-gold-gradient">CC</span>
        </span>
        <div className="hidden gap-8 text-sm tracking-wide text-gray-300 md:flex">
          <a href="#" className="hover:text-[var(--accent)] transition-colors">HOME</a>
          <a href="#" className="hover:text-[var(--accent)] transition-colors">CLUB</a>
          <a href="#" className="hover:text-[var(--accent)] transition-colors">FIRST TEAM</a>
          <a href="#" className="hover:text-[var(--accent)] transition-colors">MATCHES</a>
          <a href="#" className="hover:text-[var(--accent)] transition-colors">LEGACY</a>
          <a href="#" className="hover:text-[var(--accent)] transition-colors">CONTACT</a>
        </div>
      </nav>

      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-24 pb-32 text-center md:pt-32">
        <p className="mb-4 text-xs tracking-[0.3em] text-[var(--accent)]">
          FOUNDED 2024 &middot; VILLAGE ADAM SAHITO
        </p>

        <h1 className="font-heading text-5xl font-semibold leading-tight text-white sm:text-7xl md:text-8xl">
          SHAHEEN
          <br />
          <span className="text-gold-gradient">SAHITA CC</span>
        </h1>

        <p className="mt-6 max-w-xl text-base tracking-wide text-gray-300 sm:text-lg">
          Beyond Limits. Beyond Expectations.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a href="#" className="rounded-sm border border-[var(--accent)] bg-[var(--accent)] px-6 py-3 text-sm font-medium tracking-wide text-black transition-transform hover:scale-105">MEET THE FIRST TEAM</a>
          <a href="#" className="rounded-sm border border-[var(--border-strong)] px-6 py-3 text-sm font-medium tracking-wide text-white transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">LIVE MATCH</a>
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-x-10 gap-y-4 text-xs tracking-widest text-gray-500">
          <span>AL MAHENDAR CRICKET GROUND</span>
          <span className="hidden sm:inline">&middot;</span>
          <span>BLACK + GOLD</span>
          <span className="hidden sm:inline">&middot;</span>
          <span>8-OVER FORMAT</span>
        </div>
      </section>
            <section className="relative z-10 border-t border-[var(--border-subtle)] bg-[var(--background-elevated)] px-6 py-24 md:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-3 text-xs tracking-[0.3em] text-[var(--accent)]">
            OUR STORY
          </p>
          <h2 className="font-heading text-3xl font-semibold text-white sm:text-4xl">
            About Shaheen Sahita CC
          </h2>

          <p className="mt-6 text-base leading-relaxed text-gray-300 sm:text-lg">
            Shaheen Sahita CC is a cricket club representing the community of
            Adam Sahito, founded around June/July 2024. Playing out of Al
            Mahendar Cricket Ground in Village Adam Sahito, the club has
            quickly built a reputation for competitive spirit and a
            championship mentality in local tournament cricket.
          </p>
          <p className="mt-4 text-base leading-relaxed text-gray-300 sm:text-lg">
            Rooted in teamwork and discipline, Shaheen Sahita CC is focused on
            developing local and young talent while representing Adam Sahito
            with pride. The club&apos;s ambition extends beyond every match played
            &mdash; building a lasting legacy and progressing toward bigger
            levels of cricket.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-6">
          {[
            "Teamwork",
            "Hard Work",
            "Unity",
            "Sportsmanship",
            "Never Give Up",
            "Discipline",
          ].map((value) => (
            <div
              key={value}
              className="glass-panel rounded-sm px-3 py-6 text-center"
            >
              <span className="text-xs font-medium tracking-wide text-[var(--accent-light)] sm:text-sm">
                {value}
              </span>
            </div>
          ))}
        </div>
      </section>
            <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-3 text-xs tracking-[0.3em] text-[var(--accent)]">
            LEADERSHIP
          </p>
          <h2 className="font-heading text-3xl font-semibold text-white sm:text-4xl">
            Guiding the Club
          </h2>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-2">
          <div className="glass-panel rounded-sm p-8 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--accent)] font-heading text-sm text-[var(--accent)]">
              C
            </span>
            <h3 className="font-heading text-xl text-white">
              Ali Asghar Sahito
            </h3>
            <p className="mt-1 text-sm tracking-wide text-[var(--accent-light)]">
              Captain
            </p>
            <p className="mt-1 text-xs tracking-wide text-gray-400">
              Batsman
            </p>
          </div>

          <div className="glass-panel rounded-sm p-8 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--accent)] font-heading text-sm text-[var(--accent)]">
              VC
            </span>
            <h3 className="font-heading text-xl text-white">
              Majid Hussain Sahito
            </h3>
            <p className="mt-1 text-sm tracking-wide text-[var(--accent-light)]">
              Vice Captain
            </p>
            <p className="mt-1 text-xs tracking-wide text-gray-400">
              Batsman
            </p>
          </div>
        </div>

        <div className="mx-auto mt-6 grid max-w-5xl gap-6 sm:grid-cols-3">
          <div className="glass-panel rounded-sm p-6 text-center">
            <h3 className="font-heading text-base text-white">
              Tanweer Ahmed Sahito
            </h3>
            <p className="mt-1 text-xs tracking-wide text-gray-400">
              Team Manager
            </p>
          </div>

          <div className="glass-panel rounded-sm p-6 text-center">
            <h3 className="font-heading text-base text-white">
              Sain Gul Hassan Sahito
            </h3>
            <p className="mt-1 text-xs tracking-wide text-gray-400">
              Club Coach
            </p>
          </div>

          <div className="glass-panel rounded-sm p-6 text-center">
            <h3 className="font-heading text-base text-white">
              Sain Abdul Razzaque Sahito
            </h3>
            <p className="mt-1 text-xs tracking-wide text-gray-400">
              Club Coach
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}