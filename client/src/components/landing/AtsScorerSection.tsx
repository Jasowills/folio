import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { SectionWrapper, AnimatedColumn, Eyebrow, Headline, Subtext, BenefitLine, Drift } from './SectionWrapper'
import AnimatedScoreRing from './AnimatedScoreRing'

const matched = ['Figma', 'Prototyping', 'User Research', 'Design Systems']
const missing = ['Design Tokens', 'Accessibility', 'Motion Design']

function AtsMockup() {
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
      <div className="flex items-center gap-5 mb-6 pb-5 border-b border-border/30">
        <div className="relative flex items-center justify-center">
          <AnimatedScoreRing score={79} size={72} strokeWidth={5} />
        </div>
        <div>
          <p className="font-display text-h4 text-ink">Keyword match</p>
          <p className="font-body text-[13px] text-muted">79 of 127 keywords found</p>
        </div>
      </div>

      {/* Matched / Missing columns */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-success mb-2">Matched</p>
          <div className="flex flex-wrap gap-1.5">
            {matched.map((kw) => (
              <span key={kw} className="bg-success-light text-success font-body text-[11px] px-2 py-0.5 rounded-full">
                {kw}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-amber mb-2">Missing</p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((kw) => (
              <span key={kw} className="bg-amber-light text-amber-dark font-body text-[11px] px-2 py-0.5 rounded-full">
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Priority action */}
      <div className="bg-teal-light/50 rounded-lg p-3 border border-teal-light">
        <p className="font-body text-[12px] text-teal-dark">
          <span className="font-semibold">Add "design tokens"</span> to your skills — appears 4x in this job description
        </p>
      </div>
    </motion.div>
  )
}

export default function AtsScorerSection() {
  return (
    <SectionWrapper className="bg-paper">
      <div className="relative">
      <Drift duration={5.5} delay={0.3} className="top-[5%] right-[2%]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.5" opacity="0.12">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </Drift>
      <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <AnimatedColumn className="order-2 md:order-1">
          <Eyebrow>ATS scoring</Eyebrow>
          <Headline>Your resume gets rejected in 6 seconds. See why.</Headline>
          <Subtext>
            ATS systems screen your resume before a recruiter sees it. Paste a job description and get your match score keyword by keyword. Then rewrite the weak spots.
          </Subtext>
          <div className="mt-6 space-y-3">
            <BenefitLine>See which keywords you are missing</BenefitLine>
            <BenefitLine>Score broken down by section</BenefitLine>
            <BenefitLine>Fix weak spots and recheck</BenefitLine>
          </div>
          <div className="mt-8">
            <a
              href="#upload"
              className="font-body text-[14px] font-semibold text-teal hover:text-teal-dark transition-colors"
            >
              Check my ATS score &rarr;
            </a>
          </div>
        </AnimatedColumn>
        <div className="order-1 md:order-2 select-none">
          <AtsMockup />
        </div>
      </div>
      </div>
    </SectionWrapper>
  )
}
