import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { SectionWrapper, AnimatedColumn, Eyebrow, Headline, Subtext, BenefitLine, Drift } from './SectionWrapper'
import AnimatedScoreRing from './AnimatedScoreRing'

const confirmed = ['Figma', 'Prototyping', 'User Research']
const missing = ['Design Systems', 'Accessibility']

function PortfolioMockup() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      className="bg-surface rounded-xl shadow-resume p-6 sm:p-8 border border-border/40"
    >
      {/* Score ring header */}
      <div className="flex items-center gap-5 mb-5 pb-5 border-b border-border/30">
        <div className="relative flex items-center justify-center">
          <AnimatedScoreRing score={70} size={72} strokeWidth={5} color="#BA7517" />
        </div>
        <div>
          <p className="font-display text-h4 text-ink">Portfolio alignment</p>
          <p className="font-body text-[13px] text-muted">3 of 5 skills demonstrated</p>
        </div>
      </div>

      {/* Confirmed / Missing */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-success mb-2">Skills confirmed</p>
          <div className="flex flex-wrap gap-1.5">
            {confirmed.map((s) => (
              <span key={s} className="bg-success-light text-success font-body text-[11px] px-2 py-0.5 rounded-full">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-amber mb-2">Missing from portfolio</p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((s) => (
              <span key={s} className="bg-amber-light text-amber-dark font-body text-[11px] px-2 py-0.5 rounded-full">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Project card */}
      <div className="bg-paper rounded-lg p-3 border border-border/30">
        <p className="font-body text-[12px] font-semibold text-ink">FinTrack iOS App</p>
        <p className="font-body text-[10px] text-muted mt-0.5">Personal finance tracker with budgeting, analytics, and bill reminders.</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {['Swift', 'SwiftUI', 'Firebase'].map((tech) => (
            <span key={tech} className="bg-teal-light text-teal-dark font-body text-[9px] px-1.5 py-0.5 rounded-full">
              {tech}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default function PortfolioSection() {
  return (
    <SectionWrapper className="bg-paper">
      <div className="relative">
      <Drift duration={5.8} delay={0.2} className="top-[12%] left-[6%]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.5" opacity="0.07">
          <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </Drift>
      <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <AnimatedColumn className="order-2 md:order-1">
          <Eyebrow>Portfolio analysis</Eyebrow>
          <Headline>Your resume claims skills. Your portfolio proves them.</Headline>
          <Subtext>
            Paste your portfolio URL. We crawl up to 10 pages and compare what you claim against what you built. You get a list of proven skills, missing skills, and specific projects to add.
          </Subtext>
          <div className="mt-6 space-y-3">
            <BenefitLine>We crawl up to 10 pages of your site</BenefitLine>
            <BenefitLine>Compares skills claimed vs shown</BenefitLine>
            <BenefitLine>Specific projects to build next</BenefitLine>
          </div>
        </AnimatedColumn>
        <div className="order-1 md:order-2 select-none">
          <PortfolioMockup />
        </div>
      </div>
      </div>
    </SectionWrapper>
  )
}
