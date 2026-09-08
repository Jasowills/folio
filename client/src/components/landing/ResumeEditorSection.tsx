import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { SectionWrapper, AnimatedColumn, Eyebrow, Headline, Subtext, BenefitLine, Drift } from './SectionWrapper'

function EditorMockup() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      className="relative"
    >
      {/* Desk surface */}
      <div className="bg-paper-dark rounded-xl p-4 sm:p-6 shadow-resume border border-border/40">
        {/* Resume paper */}
        <div className="bg-surface rounded-lg shadow-sm border border-border/30 p-5 sm:p-6">
          {/* Name */}
          <div className="text-center mb-4">
            <p className="font-display text-[18px] text-ink">Alex Morgan</p>
            <p className="font-body text-[10px] text-muted">Product Designer · San Francisco</p>
          </div>

          {/* Experience section */}
          <div className="mb-3">
            <p className="font-body text-[10px] font-semibold uppercase tracking-wide text-ink mb-2">Experience</p>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-start">
                  <p className="font-body text-[11px] font-semibold text-ink">Senior Product Designer</p>
                  <span className="font-body text-[9px] text-muted-light">2022 – Present</span>
                </div>
                <p className="font-body text-[9px] text-muted">Figma · San Francisco</p>
                <ul className="mt-1 space-y-0.5">
                  {[
                    'Led design system migration serving 200+ internal users',
                    'Improved prototyping handoff efficiency by 40%',
                    'Collaborated with PMs to define product roadmap',
                  ].map((text, i) => (
                    <li
                      key={i}
                      className={`font-body text-[10px] text-ink-light pl-3 relative before:content-['•'] before:absolute before:left-0 ${
                        i === 2 ? 'border-l-2 border-amber bg-amber-light/30 -ml-0.5 pl-3.5 rounded-sm' : ''
                      }`}
                    >
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* AI toolbar floating above selected text */}
          <div className="flex justify-center -mt-1 mb-2">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.6, duration: 0.3 }}
              className="bg-ink text-white rounded-lg shadow-md px-3 py-1.5 flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5 text-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18" /><path d="M3 12h18" />
              </svg>
              <span className="font-body text-[10px] text-white">Rewrite</span>
            </motion.div>
          </div>

          {/* Variation cards */}
          <div className="flex gap-2 mt-3 -mb-2">
            {['Concise', 'Confident', 'Strategic'].map((v, i) => (
              <motion.div
                key={v}
                initial={{ opacity: 0, y: 12 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.3 }}
                className="flex-1 bg-paper rounded-md p-2 border border-border/40"
              >
                <p className="font-body text-[8px] font-semibold text-muted mb-0.5">{v}</p>
                <p className="font-body text-[8px] text-ink-light leading-tight line-clamp-2">
                  {i === 0 ? 'Migrated design system serving 200+ users' : i === 1 ? 'Drove design system adoption across 200+ internal users' : 'Spearheaded design system strategy impacting 200+ cross-functional users'}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function ResumeEditorSection() {
  return (
    <SectionWrapper className="bg-surface">
      <div className="relative">
      <Drift duration={4.8} delay={1} className="top-[15%] left-[4%]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.5" opacity="0.08">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
      </Drift>
      <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <div className="order-2 md:order-1 select-none">
          <EditorMockup />
        </div>
        <AnimatedColumn className="order-1 md:order-2">
          <Eyebrow>Resume editor</Eyebrow>
          <Headline>Click anywhere and type.</Headline>
          <Subtext>
            Upload your PDF and edit it inline. Your layout stays the same. Click a bullet, hit backspace, type the new one.
          </Subtext>
          <div className="mt-6 space-y-3">
            <BenefitLine>Click text to edit it in place</BenefitLine>
            <BenefitLine>AI rewrites weak bullets in one click</BenefitLine>
            <BenefitLine>10 professional templates</BenefitLine>
          </div>
        </AnimatedColumn>
      </div>
      </div>
    </SectionWrapper>
  )
}
