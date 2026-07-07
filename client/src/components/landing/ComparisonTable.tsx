import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { SectionWrapper, Eyebrow, Headline, Drift } from './SectionWrapper'

const rows = [
  { feature: 'Inline resume editing', us: true, others: false },
  { feature: 'ATS keyword scoring', us: true, others: false },
  { feature: 'Auto-generated cover letters', us: true, others: true },
  { feature: 'AI interview practice', us: true, others: false },
  { feature: 'Portfolio verification', us: true, others: false },
  { feature: 'Real-time job scoring', us: true, others: false },
  { feature: 'Unlimited templates', us: true, others: true },
  { feature: 'Export to PDF', us: true, others: true },
]

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function DashIcon() {
  return (
    <svg className="w-4 h-4 text-[#C8C4BC]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export default function ComparisonTable() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.15 })

  return (
    <SectionWrapper className="bg-paper">
      <div className="relative">
      <Drift duration={6} delay={1.2} className="top-[5%] left-[4%]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8C4BC" strokeWidth="1" opacity="0.15">
          <circle cx="12" cy="12" r="8" />
        </svg>
      </Drift>
      <div className="text-center mb-12">
        <div className="flex justify-center">
          <Eyebrow>Comparison</Eyebrow>
        </div>
        <Headline>What you get that other tools don't.</Headline>
      </div>

      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4 }}
        className="overflow-hidden rounded-xl border border-border/40"
      >
        {/* Header row */}
        <div className="grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_100px_100px] bg-ink text-white">
          <div className="px-4 sm:px-5 py-3">
            <span className="font-body text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider">Feature</span>
          </div>
          <div className="px-3 py-3 text-center">
            <span className="font-body text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider">Folio</span>
          </div>
          <div className="px-3 py-3 text-center">
            <span className="font-body text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider text-muted-light">Others</span>
          </div>
        </div>

        {/* Body rows */}
        {rows.map((row, i) => {
          const RowTag = i % 2 === 0 ? 'div' : motion.div
          const rowProps = i % 2 !== 0
            ? {
                initial: { opacity: 0 },
                animate: isInView ? { opacity: 1 } : {},
                transition: { delay: 0.05 * i, duration: 0.3 },
              }
            : {}

          const renderCell = (val: boolean | string) => {
            if (val === true) return <CheckIcon />
            if (val === false) return <DashIcon />
            return <span className="font-body text-[11px] text-muted">{val}</span>
          }

          return (
            <RowTag
              key={row.feature}
              {...rowProps}
              className={`grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_100px_100px] ${
                i % 2 === 0 ? 'bg-surface' : 'bg-paper'
              }`}
            >
              <div className="px-4 sm:px-5 py-3 flex items-center">
                <span className="font-body text-[13px] sm:text-[14px] text-ink">{row.feature}</span>
              </div>
              <div className="px-3 py-3 flex items-center justify-center">{renderCell(row.us)}</div>
              <div className="px-3 py-3 flex items-center justify-center">{renderCell(row.others)}</div>
            </RowTag>
          )
        })}
      </motion.div>
      </div>
    </SectionWrapper>
  )
}
