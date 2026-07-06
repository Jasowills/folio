import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Drift } from './SectionWrapper'

const features = [
  'Inline resume editing · ATS scoring',
  'Auto cover letters · AI interview prep',
  'Portfolio analysis · Live job discovery',
]

export default function FinalCtaSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })

  return (
    <section className="w-full bg-[#1A1A1A] relative">
      <Drift duration={5.6} delay={0.4} className="top-[10%] left-[6%]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="1.5" opacity="0.12">
          <path d="M12 2l2.5 6.5L21 9l-5 4.5 1.5 7L12 16.5 6.5 20.5 8 13.5 3 9l6.5-.5z" />
        </svg>
      </Drift>
      <div className="max-w-[720px] mx-auto px-6 sm:px-8 py-24 md:py-24 sm:py-16 max-sm:py-12 text-center">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="font-body text-[11px] font-semibold uppercase tracking-[0.12em] text-teal block mb-4">
            Ready to try
          </span>

          <h2 className="font-display text-[clamp(28px,4vw,48px)] text-white leading-[1.1] mb-4">
            Upload your resume. The rest takes seconds.
          </h2>

          <p className="font-body text-[17px] text-[#B4B2A9] leading-[1.7] mb-8 max-w-[540px] mx-auto">
            Upload your resume once. Scoring, rewriting, job matching, and interview prep are one click away.
          </p>

          <a
            href="#upload"
            className="inline-flex items-center gap-2 bg-teal hover:bg-teal-dark text-white font-body text-[14px] font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Upload your resume
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </a>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {features.map((f) => (
              <span key={f} className="font-body text-[12px] text-[#555]">
                {f}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
