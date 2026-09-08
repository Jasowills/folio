import { Drift } from './SectionWrapper'

const companies = ['Google', 'Stripe', 'Figma', 'Shopify', 'Airbnb', 'Notion']

export default function SocialProofStrip() {
  return (
    <section className="w-full bg-surface border-t border-border border-b border-border relative">
      <Drift duration={6} delay={0} className="top-[20%] left-[6%]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" opacity="0.15">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </Drift>
      <Drift duration={5.2} delay={1.5} className="bottom-[25%] right-[5%]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" opacity="0.15">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </Drift>
      <div className="max-w-[1120px] mx-auto px-6 sm:px-8 py-10">
        <div className="flex items-center justify-center gap-8 sm:gap-10 overflow-x-auto no-scrollbar">
          <span className="font-body text-[12px] text-muted shrink-0">
            Used by people at
          </span>
          <div className="flex items-center gap-8 sm:gap-10 shrink-0">
            {companies.map((name) => (
              <span
                key={name}
                className="font-body text-[13px] font-semibold text-muted-light whitespace-nowrap"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
        <p className="font-body text-[10px] text-muted-light text-center mt-3 tracking-wide">
          * Based on user-reported outcomes.
        </p>
      </div>
    </section>
  )
}
