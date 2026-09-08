import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { SectionWrapper, AnimatedColumn, Eyebrow, Headline, Subtext, BenefitLine, Drift } from './SectionWrapper'

const jobs = [
  {
    company: 'Figma',
    role: 'Senior Product Designer',
    score: 79,
    scoreColor: '#4F46E5',
    posted: '2h ago',
    badge: null as string | null,
    keywords: ['Figma', 'Prototyping', 'User Research'],
  },
  {
    company: 'Stripe',
    role: 'UX Design Lead',
    score: 61,
    scoreColor: '#D97706',
    posted: '1d ago',
    badge: null as string | null,
    keywords: ['Design Systems', 'Prototyping'],
  },
  {
    company: 'Linear',
    role: 'Product Designer',
    score: 88,
    scoreColor: '#4F46E5',
    posted: '4h ago',
    badge: 'New',
    keywords: ['Figma', 'User Research'],
  },
]

const feedRows = [
  { company: 'Notion', title: 'Staff Product Designer', score: 84, salary: '$180K–$220K', tag: 'New' },
  { company: 'Vercel', title: 'Senior Frontend Engineer', score: 72, salary: '$170K–$200K', tag: null },
  { company: 'Anthropic', title: 'Design Engineer', score: 65, salary: '$200K–$260K', tag: 'High growth' },
  { company: 'Rippling', title: 'Product Design Lead', score: 58, salary: '$160K–$195K', tag: null },
]

function JobCards() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <div ref={ref} className="flex items-center justify-center pt-4 overflow-visible">
      <div className="relative w-[400px] h-[120px] overflow-visible mx-auto">
        {jobs.map((job, i) => {
          const circumference = 2 * Math.PI * (i === 2 ? 13 : 10)
          const offset = circumference - (job.score / 100) * circumference

          const angles = [-28, 0, 28]
          const angleDeg = angles[i]
          const angleRad = (angleDeg * Math.PI) / 180
          const radius = 120

          const xOffset = Math.round(radius * Math.sin(angleRad))
          const yOffset = Math.round(radius * (1 - Math.cos(angleRad)))
          const rotation = angleDeg * 0.5

          return (
            <motion.div
              key={job.company}
              initial={{ opacity: 0, y: -80, x: 0, rotateZ: 0, scale: 0.92 }}
              animate={isInView ? {
                opacity: 1,
                y: yOffset,
                x: xOffset,
                rotateZ: rotation,
                scale: 1,
              } : {}}
              transition={{
                type: 'spring',
                stiffness: 180,
                damping: 22,
                mass: 0.8,
                delay: i * 0.18,
              }}
              className="absolute top-0 left-0 w-full bg-surface rounded-xl border border-border/40 p-4"
              style={{
                zIndex: i,
                transformOrigin: 'bottom center',
                boxShadow:
                  i === 0
                    ? '0 1px 3px rgba(0,0,0,0.04)'
                    : i === 1
                      ? '0 3px 8px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)'
                      : '0 6px 16px rgba(0,0,0,0.09), 0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-body text-[11px] text-muted">{job.company}</p>
                  <p className="font-body text-[13px] font-semibold text-ink">{job.role}</p>
                </div>
                <div className="relative flex items-center justify-center shrink-0">
                  <svg width={i === 2 ? 36 : 28} height={i === 2 ? 36 : 28} className="transform -rotate-90">
                    <circle cx={i === 2 ? 18 : 14} cy={i === 2 ? 18 : 14} r={i === 2 ? 13 : 10} stroke="#E2E8F0" strokeWidth="2.5" fill="none" />
                    <motion.circle
                      cx={i === 2 ? 18 : 14} cy={i === 2 ? 18 : 14} r={i === 2 ? 13 : 10}
                      stroke={job.scoreColor}
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={isInView ? { strokeDashoffset: offset } : {}}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.35 + i * 0.18 }}
                    />
                  </svg>
                  <span className={`absolute font-body font-semibold text-ink ${i === 2 ? 'text-[8px]' : 'text-[8px]'}`}>{job.score}%</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="font-body text-[9px] text-muted-light">{job.posted}</span>
                {job.badge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : {}}
                    transition={{ delay: 0.55 + i * 0.18, type: 'spring', stiffness: 500, damping: 14 }}
                    className="font-body text-[8px] font-semibold text-teal bg-teal-light px-1.5 py-0.5 rounded-full"
                  >
                    {job.badge}
                  </motion.span>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {job.keywords.map((kw) => (
                  <span key={kw} className="bg-success-light text-success font-body text-[9px] px-1.5 py-0.5 rounded-full">
                    {kw}
                  </span>
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function MiniFeed() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: 0.6 }}
      className="w-full max-w-[400px] mx-auto mt-14"
    >
      <div className="space-y-[3px]">
        {feedRows.map((row, i) => (
          <motion.div
            key={row.company}
            initial={{ opacity: 0, x: -12 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.35, delay: 0.7 + i * 0.08 }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-paper/50 transition-colors"
          >
            <div className="w-6 h-6 rounded-md bg-paper border border-border/30 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-semibold text-muted">{row.company[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-ink truncate">{row.title}</p>
              <p className="text-[10px] text-muted">{row.company}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-semibold text-ink">{row.score}%</span>
              <p className="text-[9px] text-muted-light">{row.salary}</p>
            </div>
            {row.tag && (
              <span className="text-[9px] text-teal bg-teal-light px-1.5 py-0.5 rounded-full font-medium shrink-0">
                {row.tag}
              </span>
            )}
          </motion.div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 px-3">
        <p className="text-[10px] text-muted font-medium">2,847 active roles matched to your resume</p>
        <span className="text-[10px] font-semibold text-teal">View feed &rarr;</span>
      </div>
    </motion.div>
  )
}

export default function JobDiscoverSection() {
  return (
    <SectionWrapper className="bg-surface">
      <div className="relative">
      <Drift duration={5} delay={0.5} className="top-[8%] right-[4%]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.5" opacity="0.1">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      </Drift>
      <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <div className="order-2 md:order-1 select-none">
          <JobCards />
          <MiniFeed />
        </div>
        <AnimatedColumn className="order-1 md:order-2">
          <Eyebrow>Job discovery</Eyebrow>
          <Headline>Jobs ranked by how well your resume fits them.</Headline>
          <Subtext>
            We search Greenhouse, Lever, LinkedIn, HN, and 10 other sources every 6 hours. Each result is scored against your resume before you see it. The top of your feed shows roles with the best match.
          </Subtext>
          <div className="mt-6 space-y-3">
            <BenefitLine>Refreshed every 6 hours</BenefitLine>
            <BenefitLine>Scored against your resume before you see it</BenefitLine>
            <BenefitLine>One click to track and prepare</BenefitLine>
          </div>
        </AnimatedColumn>
      </div>
      </div>
    </SectionWrapper>
  )
}
