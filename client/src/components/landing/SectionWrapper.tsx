import { useRef, type ReactNode } from 'react'
import { motion, useInView } from 'framer-motion'

interface SectionWrapperProps {
  children: ReactNode
  className?: string
  id?: string
}

export function SectionWrapper({ children, className = '', id }: SectionWrapperProps) {
  return (
    <section id={id} className={`w-full ${className}`}>
      <div className="max-w-[1120px] mx-auto px-6 sm:px-8 py-24 md:py-24 sm:py-16 max-sm:py-12">
        {children}
      </div>
    </section>
  )
}

export function AnimatedColumn({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedVisual({
  children,
  delay = 0.15,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerChildren({
  children,
  baseDelay = 0,
  stagger = 0.08,
  className = '',
}: {
  children: ReactNode[]
  baseDelay?: number
  stagger?: number
  className?: string
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })
  return (
    <div ref={ref} className={className}>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: baseDelay + i * stagger }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}

export function Eyebrow({ children }: { children: string }) {
  return (
    <span className="font-body text-[11px] font-semibold uppercase tracking-[0.12em] text-teal block mb-4">
      {children}
    </span>
  )
}

export function Headline({ children }: { children: string }) {
  return (
    <h2 className="font-display text-[clamp(28px,3.5vw,38px)] text-ink leading-[1.15]">
      {children}
    </h2>
  )
}

export function Subtext({ children }: { children: string }) {
  return (
    <p className="font-body text-[17px] text-muted max-w-[520px] leading-[1.7] mt-4">
      {children}
    </p>
  )
}

export function Drift({
  children,
  duration = 5,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  duration?: number
  delay?: number
  className?: string
}) {
  return (
    <div
      className={`absolute pointer-events-none select-none ${className}`}
      style={{ animation: `drift ${duration}s ease-in-out ${delay}s infinite` }}
    >
      {children}
    </div>
  )
}

export function BenefitLine({ children }: { children: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <svg className="w-4 h-4 mt-0.5 shrink-0 text-teal" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 8.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-body text-[15px] text-ink-light">{children}</span>
    </div>
  )
}
