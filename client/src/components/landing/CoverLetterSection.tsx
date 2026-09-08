import { useState, useEffect, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { SectionWrapper, AnimatedColumn, Eyebrow, Headline, Subtext, BenefitLine, Drift } from './SectionWrapper'

interface ToneContent {
  body: string
  closing: string
  signature: string
}

const tones: Array<{ label: string; content: ToneContent }> = [
  {
    label: 'Professional',
    content: {
      body: "I've been following Figma's approach to collaborative design for years, and I've always admired how the platform balances power with simplicity — a philosophy I've carried through my own work. At my current role, I led the migration of a design system that now serves over 200 internal users, an experience that taught me how to scale design decisions without losing the human touch. I see in Figma's trajectory a natural alignment with what I do best: building systems that make teams better, not busier. I'd love the chance to bring that same thinking to your team.",
      closing: 'I look forward to discussing how my experience aligns with the needs of your team.',
      signature: 'Sincerely,',
    },
  },
  {
    label: 'Confident',
    content: {
      body: "Figma is defining how the industry thinks about collaborative design — and I've been doing the same at my current role. I led the migration of a design system serving 200+ internal users, cutting handoff friction by 40% and setting the standard for how product and design work together. I didn't just use Figma's philosophy; I extended it. I built tools that made my team faster, my stakeholders more informed, and our product more consistent. Your team needs someone who can operate at that level from day one. That's me.",
      closing: 'I am ready to contribute immediately and would welcome the chance to prove it.',
      signature: 'Best,',
    },
  },
  {
    label: 'Creative',
    content: {
      body: "Great design tools don't just appear — they're shaped by the people who use them. I've always believed that the best products are built by teams who aren't afraid to iterate in the open, and that belief has guided every project I've touched. At my current role, I helped transform a scattered set of design files into a cohesive system used by 200+ people across the company. It wasn't just about organisation — it was about giving everyone a shared language to build with. Figma is the kind of company that understands that magic. I'd love to help you keep making it.",
      closing: 'Let me know if there is a good time to chat — I have some ideas I would love to share.',
      signature: 'Onwards,',
    },
  },
]

const letterVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

function CoverLetterMockup({ activeIndex }: { activeIndex: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })
  const tone = tones[activeIndex]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      className="bg-surface rounded-xl shadow-resume p-6 sm:p-8 border border-border/40"
    >
      {/* Document header */}
      <div className="mb-4 pb-4 border-b border-border/30">
        <p className="font-display text-[14px] text-ink">Alex Morgan</p>
        <p className="font-body text-[10px] text-muted">alex@example.com · (415) 555-0123</p>
      </div>

      {/* Recipient */}
      <div className="mb-3">
        <p className="font-body text-[10px] text-muted">Hiring Manager</p>
        <p className="font-body text-[10px] text-muted">Figma, Inc.</p>
        <p className="font-body text-[10px] text-muted">San Francisco, CA</p>
      </div>

      <p className="font-body text-[10px] text-muted mb-3">Re: Senior Product Designer Application</p>

      {/* Animated letter body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tone.label}
          variants={letterVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-body text-[11px] text-ink-light leading-relaxed mb-1">
            Dear Hiring Manager,
          </p>
          <p className="font-body text-[11px] text-ink-light leading-relaxed mb-3">
            {tone.content.body}
          </p>
          <p className="font-body text-[11px] text-ink-light leading-relaxed">
            {tone.content.closing}
          </p>
          <p className="font-body text-[11px] text-ink-light leading-relaxed mt-3">
            {tone.content.signature}
          </p>
          <p className="font-body text-[11px] text-ink-light leading-relaxed">
            Alex Morgan
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Streaming cursor */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 0.8 }}
        className="inline-flex items-center gap-0.5 mt-2"
      >
        <span className="font-body text-[11px] text-muted-light italic">
          {tone.label.toLowerCase()} tone
        </span>
        <span className="w-[2px] h-[14px] bg-teal animate-pulse" />
      </motion.div>
    </motion.div>
  )
}

export default function CoverLetterSection() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % tones.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  return (
    <SectionWrapper className="bg-paper">
      <div className="relative">
      <Drift duration={5.2} delay={0.8} className="bottom-[10%] right-[3%]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.5" opacity="0.12">
          <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </Drift>
      <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <AnimatedColumn className="order-2 md:order-1">
          <Eyebrow>Cover letter</Eyebrow>
          <Headline>A cover letter that sounds like you.</Headline>
          <Subtext>
            Paste the job description, pick a tone, and the AI writes a letter drawn from your experience. Choose from Professional, Confident, or Creative. Regenerate in one click.
          </Subtext>

          {/* Tone carousel */}
          <div className="relative flex gap-2 mt-5">
            {tones.map((tone, i) => {
              const isActive = i === activeIndex
              return (
                <motion.button
                  key={tone.label}
                  layout
                  onClick={() => setActiveIndex(i)}
                  className={`relative font-body text-[11px] px-3 py-1 rounded-full border cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-ink text-white border-ink'
                      : 'bg-surface text-muted border-border hover:border-muted-light'
                  }`}
                >
                  {tone.label}
                </motion.button>
              )
            })}
          </div>

          <div className="mt-6 space-y-3">
            <BenefitLine>References your experience</BenefitLine>
            <BenefitLine>Streams the letter word by word</BenefitLine>
            <BenefitLine>Swap tone and regenerate in one click</BenefitLine>
          </div>
        </AnimatedColumn>
        <div className="order-1 md:order-2 select-none">
          <CoverLetterMockup activeIndex={activeIndex} />
        </div>
      </div>
      </div>
    </SectionWrapper>
  )
}
