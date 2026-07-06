import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { SectionWrapper, Eyebrow, Headline, Drift } from './SectionWrapper'

const steps = [
  {
    num: '01',
    title: 'Upload your resume',
    desc: 'PDF, DOCX, or Google Docs. We extract each character, font, and position. Your layout stays as designed.',
  },
  {
    num: '02',
    title: 'Score & analyse',
    desc: 'We score your resume against your target job description and show you what to fix, keyword by keyword.',
  },
  {
    num: '03',
    title: 'Rewrite with AI',
    desc: 'Edit inline or let AI rewrite weak bullets in your tone. Add experience, adjust formatting, and see changes live.',
  },
  {
    num: '04',
    title: 'Discover & apply',
    desc: 'We find jobs your resume fits and rank them by score. Prepare for interviews with AI mock sessions.',
  },
]

const stepContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
}

const stepItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

export default function HowItWorksSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <SectionWrapper className="bg-surface">
      <div className="relative">
      <Drift duration={5.4} delay={1.2} className="top-[2%] right-[5%]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.5" opacity="0.07">
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
      </Drift>
      <div className="max-w-[720px] mx-auto text-center mb-16">
        <div className="flex justify-center">
          <Eyebrow>How it works</Eyebrow>
        </div>
        <Headline>Four steps from resume to job offer.</Headline>
      </div>

      <motion.div
        ref={ref}
        variants={stepContainer}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        className="max-w-[720px] mx-auto"
      >
        {steps.map((step, i) => (
          <motion.div
            key={step.num}
            variants={stepItem}
            className="relative pl-14 pb-12 last:pb-0"
          >
            {/* Timeline line */}
            {i < steps.length - 1 && (
              <div className="absolute left-[19px] top-9 bottom-0 w-px bg-border/60" />
            )}

            {/* Number circle */}
            <div className="absolute left-0 top-0 w-[38px] h-[38px] rounded-full bg-paper border border-border/50 flex items-center justify-center">
              <span className="font-body text-[12px] font-semibold text-ink">{step.num}</span>
            </div>

            <h3 className="font-display text-[20px] text-ink mb-2">{step.title}</h3>
            <p className="font-body text-[15px] text-muted leading-[1.7] max-w-[540px]">{step.desc}</p>
          </motion.div>
        ))}
      </motion.div>
      </div>
    </SectionWrapper>
  )
}
