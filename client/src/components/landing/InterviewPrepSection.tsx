import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Drift } from './SectionWrapper'

function InterviewMockup() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      className="w-full max-w-[600px] mx-auto rounded-xl overflow-hidden border border-[#2C2C2A]"
    >
      {/* Interview UI mockup */}
      <div className="bg-[#0F172A] p-4 sm:p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#16A34A]" />
            <span className="font-body text-[11px] text-[#B4B2A9]">Live session</span>
          </div>
          <span className="font-body text-[10px] text-[#555]">00:12:34</span>
        </div>

        {/* Main interview area */}
        <div className="relative rounded-lg overflow-hidden bg-[#151515] aspect-video mb-3 flex items-center justify-center">
          {/* Interviewer orb */}
          <motion.div
            animate={{ scale: [1, 1.04, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-teal/40 to-teal/20 blur-[2px]"
          />

          {/* Interviewer name */}
          <div className="absolute bottom-3 left-3">
            <p className="font-body text-[10px] text-white/80">Sarah Chen</p>
            <p className="font-body text-[8px] text-[#888780]">Senior Engineering Manager · Figma</p>
          </div>

          {/* Candidate camera tile */}
          <div className="absolute bottom-3 right-3 w-16 h-12 sm:w-20 sm:h-14 rounded-md bg-[#222] border border-[#333] flex items-center justify-center">
            <span className="font-body text-[8px] text-[#555]">You</span>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-center">
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="bg-teal text-white font-body text-[11px] font-medium px-4 py-1.5 rounded-full"
          >
            Your turn to respond
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

const stats = [
  { label: '30 min', sub: 'Full voice interview' },
  { label: 'Real-time feedback', sub: 'Per answer' },
  { label: 'Company research', sub: 'Before every session' },
]

export default function InterviewPrepSection() {
  return (
    <section className="w-full bg-[#0F172A] relative">
      <Drift duration={5} delay={0.6} className="top-[15%] right-[4%]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.5" opacity="0.15">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="9" y1="10" x2="15" y2="10" />
        </svg>
      </Drift>
      <div className="max-w-[1120px] mx-auto px-6 sm:px-8 py-24 md:py-24 sm:py-16 max-sm:py-12">
        {/* Top text */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="font-body text-[11px] font-semibold uppercase tracking-[0.12em] text-teal block mb-4">
            AI interview prep
          </span>
          <h2 className="font-display text-[clamp(28px,3.5vw,42px)] text-white leading-[1.15]">
            Practice with an interviewer who read your resume.
          </h2>
          <p className="font-body text-[17px] text-[#B4B2A9] max-w-[600px] mx-auto leading-[1.7] mt-4">
            Our AI researches the company, reads your resume, and runs a full voice interview covering behavioural, technical, and system design. 30 minutes of real questions with honest feedback.
          </p>
        </div>

        {/* Visual */}
        <div className="select-none">
          <InterviewMockup />
        </div>

        {/* Stat chips */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-[#222] rounded-lg px-4 py-2.5 border border-[#2C2C2A] text-center"
            >
              <p className="font-body text-[12px] font-semibold text-white">{stat.label}</p>
              <p className="font-body text-[10px] text-[#888780]">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
