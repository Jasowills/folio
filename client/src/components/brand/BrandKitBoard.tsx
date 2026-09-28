// Premium 3x3 brand-kit board as code — senior design engineer asset, not a fetched image.
// Renders as a single presentation canvas with gutters, paper texture, and disciplined system.
export function BrandKitBoard() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border bg-[#FDFCF8] shadow-card">
      <div className="grid grid-cols-3 gap-px bg-border">
        {/* 1 — Logo Cover */}
        <div className="bg-paper p-7 sm:p-8">
          <p className="font-mono text-xs tracking-widest text-muted">01 — MARK</p>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-paper-light">
              <span className="font-display text-xl font-extrabold text-ink">&amp;</span>
            </div>
            <span className="font-display text-2xl font-extrabold tracking-tight text-ink">Folio &amp;</span>
          </div>
          <p className="mt-4 font-body text-sm leading-relaxed text-muted">Folio + ledger hook + check. One stroke reads as &amp;, second reads as scored approval.</p>
        </div>

        {/* 2 — Construction */}
        <div className="bg-paper p-7 sm:p-8">
          <p className="font-mono text-xs tracking-widest text-muted">02 — CONSTRUCTION</p>
          <div className="mt-6 rounded-2xl border border-border bg-paper-light p-4">
            <svg viewBox="0 0 200 120" className="h-24 w-full" aria-hidden>
              <rect x="20" y="18" width="160" height="84" rx="14" fill="none" stroke="#14532D" strokeOpacity="0.14" strokeWidth="1" />
              <path d="M36 42H164M36 62H164M36 82H120" stroke="#14532D" strokeOpacity="0.18" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="100" cy="60" r="28" fill="none" stroke="#14532D" strokeOpacity="0.08" strokeDasharray="3 4" />
              <path d="M100 36V84M72 60H128" stroke="#14532D" strokeOpacity="0.06" />
              <path d="M78 78C75 72 74 66 76 60" stroke="#0A1F18" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M84 64L96 74L124 46" stroke="#14532D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="mt-2 text-center font-mono text-xs text-muted">ledger frame + check — 28px radius, 1.9pt stroke</p>
          </div>
        </div>

        {/* 3 — Digital Application */}
        <div className="bg-ink p-7 text-white sm:p-8">
          <p className="font-mono text-xs tracking-widest text-white/60">03 — PRODUCT SURFACE</p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]">
            <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-white/20" /><span className="h-2 w-2 rounded-full bg-white/20" /><span className="h-2 w-2 rounded-full bg-white/20" />
              <span className="ml-2 font-mono text-xs text-white/50">folio.app/review/guest</span>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between"><span className="font-mono text-xs font-bold tracking-widest text-white">72 / 100</span><span className="rounded-full bg-white px-2.5 py-1 font-mono text-xs font-bold text-ink">ATS</span></div>
              <div className="mt-3 space-y-2">
                <div className="h-2 w-full rounded-full bg-white/10" /><div className="h-2 w-3/4 rounded-full bg-white/10" /><div className="h-2 w-5/6 rounded-full bg-teal/40" />
              </div>
            </div>
          </div>
        </div>

        {/* 4 — Tagline */}
        <div className="bg-paper-light p-7 sm:p-8">
          <p className="font-mono text-xs tracking-widest text-muted">04 — ESSENCE</p>
          <p className="mt-6 font-display text-3xl font-extrabold leading-none tracking-tight text-ink">Your career,<br /><span className="italic text-teal">honestly</span> told.</p>
          <p className="mt-3 font-body text-sm text-muted">No flattery. Just the fix list.</p>
        </div>

        {/* 5 — Color System */}
        <div className="bg-paper p-7 sm:p-8">
          <p className="font-mono text-xs tracking-widest text-muted">05 — COLOR</p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              { hex: '#0A1F18', label: 'Ink' },
              { hex: '#14532D', label: 'Forest' },
              { hex: '#F6F9F2', label: 'Cream', border: true },
            ].map((c) => (
              <div key={c.hex} className="space-y-1.5">
                <div className={`h-14 rounded-2xl border ${c.border ? 'border-border bg-[#F6F9F2]' : 'border-transparent'}`} style={{ background: c.hex }} />
                <p className="font-mono text-xs font-bold text-ink">{c.label}</p><p className="font-mono text-xs text-muted">{c.hex}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-gradient-to-r from-[#0A1F18] via-[#14532D] to-[#F6F9F2] opacity-80" />
        </div>

        {/* 6 — Typography */}
        <div className="bg-paper p-7 sm:p-8">
          <p className="font-mono text-xs tracking-widest text-muted">06 — TYPE</p>
          <p className="mt-6 font-display text-4xl font-extrabold leading-none text-ink">Aa</p>
          <p className="font-mono text-xs tracking-widest text-muted">Fraunces 700/800 · Display</p>
          <p className="mt-3 font-body text-base font-medium text-ink">Satoshi 400/500/700</p>
          <p className="font-mono text-xs text-muted">Body · UI · Ledger</p>
          <p className="mt-2 font-mono text-xs font-bold tracking-widest text-teal">JetBrains Mono · Data</p>
        </div>

        {/* 7 — Physical */}
        <div className="bg-paper-light p-7 sm:p-8">
          <p className="font-mono text-xs tracking-widest text-muted">07 — OBJECT</p>
          <div className="mt-6 rounded-2xl border border-border bg-paper p-4 shadow-sm">
            <div className="h-1 w-full rounded-full bg-teal" />
            <div className="mt-3 flex items-center justify-between"><span className="font-mono text-xs font-bold text-ink">Folio &amp;</span><span className="font-mono text-xs text-muted">ED. 04</span></div>
            <div className="mt-3 h-2 w-full rounded-full bg-border" /><div className="mt-2 h-2 w-3/4 rounded-full bg-border" />
            <div className="mt-3 rounded-xl bg-teal-light px-3 py-2 text-center font-mono text-xs font-bold text-teal">72 / 100 · Guest ledger</div>
          </div>
          <p className="mt-3 font-mono text-xs text-muted">Emboss · ledger stock · forest foil</p>
        </div>

        {/* 8 — Image Direction */}
        <div className="relative overflow-hidden bg-ink p-0">
          <img src="https://picsum.photos/seed/folio-brand-image/600/400" alt="" aria-hidden className="h-full w-full object-cover opacity-60 grayscale" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
          <div className="absolute bottom-0 p-6">
            <p className="font-mono text-xs tracking-widest text-white/60">08 — IMAGE</p>
            <p className="mt-2 font-body text-sm leading-relaxed text-white">Halftone ledger, interview waveform, newsroom grain — forest grade, never purple.</p>
          </div>
        </div>

        {/* 9 — System Detail */}
        <div className="bg-paper p-7 sm:p-8">
          <p className="font-mono text-xs tracking-widest text-muted">09 — COMPONENTS</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-ink px-3 py-1.5 font-mono text-xs font-bold text-white">LIVE · System design</span>
            <span className="rounded-full border border-border bg-paper-light px-3 py-1.5 font-mono text-xs text-ink">missing · TypeScript</span>
            <span className="rounded-full bg-teal-light px-3 py-1.5 font-mono text-xs font-bold text-teal">Score 8.4</span>
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={i} className="h-2 w-[3px] rounded-full bg-teal" style={{ height: `${6 + (i % 4) * 4}px`, opacity: 0.9 - i * 0.02 }} />
            ))}
          </div>
          <p className="mt-3 font-mono text-xs text-muted">waveform · ledger pills · Monaco</p>
        </div>
      </div>
      <div className="flex items-center justify-between bg-paper-light px-6 py-3">
        <span className="font-mono text-xs tracking-widest text-muted">FOLIO &amp; — BRAND DECK · 3×3 · WHITE + FOREST</span>
        <span className="font-mono text-xs text-muted">folio.app · 04/26</span>
      </div>
    </div>
  )
}
