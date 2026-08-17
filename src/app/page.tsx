import { EnterCta } from "./enter-cta";
import { HeroPhotograph } from "./hero-photograph";

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-canvas">
      <a
        href="#enter"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:bg-pine focus:px-4 focus:py-2 focus:text-surface"
      >
        Skip to enter with an invite
      </a>
      <header className="mx-auto flex max-w-[1400px] items-baseline justify-between gap-6 px-6 py-6 md:px-10">
        <p className="font-mono text-xs tracking-[0.18em] text-muted uppercase">
          AI Company OS
        </p>
        <p className="font-mono text-xs text-muted">Invite only</p>
      </header>

      <main>
        <section className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-[1400px] grid-cols-1 items-center gap-12 px-6 pb-16 md:px-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="font-mono text-sm text-pine">Private founder workspace</p>
            <h1 className="mt-5 max-w-[18ch] text-[clamp(2.75rem,7vw,6.25rem)] leading-[1.05] font-medium tracking-tight text-ink">
              Governed prototypes, one company at a time.
            </h1>
            <p className="mt-8 max-w-[58ch] text-lg leading-relaxed text-muted">
              AI Company OS is a control plane for solo founders who already hold
              an invite. There is no public registration. You describe the company,
              accept the prototype limits, and keep later edits from rewriting a
              run that is already in motion.
            </p>
            <div className="mt-10" id="enter">
              <EnterCta />
              <p className="mt-3 max-w-[48ch] text-sm text-muted">
                Access is issued by the operator. This site does not create
                accounts.
              </p>
            </div>
          </div>
          <div className="lg:col-span-5 lg:pt-10">
            <HeroPhotograph />
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-6 py-20 md:px-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="text-3xl tracking-tight text-ink md:text-4xl">
                What the workspace asks for
              </h2>
            </div>
            <div className="space-y-10 lg:col-span-7 lg:col-start-6">
              <article className="border-t border-line pt-6">
                <h3 className="text-xl text-ink">A company profile, not a pitch deck</h3>
                <p className="mt-3 max-w-[60ch] leading-relaxed text-muted">
                  Name, purpose, target customer, and the constraints you intend to
                  keep. The form records only the fields the control plane needs
                  for a bounded prototype.
                </p>
              </article>
              <article className="border-t border-line pt-6">
                <h3 className="text-xl text-ink">Limits that stay visible</h3>
                <p className="mt-3 max-w-[60ch] leading-relaxed text-muted">
                  Five screens at most, one primary flow, and mock or local data.
                  You must acknowledge that real customer or other sensitive data
                  does not belong in this profile.
                </p>
              </article>
              <article className="border-t border-line pt-6">
                <h3 className="text-xl text-ink">Edits do not rewrite active runs</h3>
                <p className="mt-3 max-w-[60ch] leading-relaxed text-muted">
                  Saving a new profile version changes the current company record
                  for future runs. A run that already started keeps the frozen
                  snapshot it captured.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-10">
          <p className="font-mono text-xs text-muted">
            AI Company OS · invite-only control plane
          </p>
          <p className="text-sm text-muted">
            Public repository does not mean public product access.
          </p>
        </div>
      </footer>
    </div>
  );
}
