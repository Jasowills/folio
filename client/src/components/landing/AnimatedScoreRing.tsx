import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
}

export default function AnimatedScoreRing({
  score,
  size = 88,
  strokeWidth = 6,
  color = '#4F46E5',
  label,
}: ScoreRingProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.4 })
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div ref={ref} className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={isInView ? { strokeDashoffset: offset } : {}}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <span
        className="font-display absolute text-[22px] text-ink"
        style={{ lineHeight: `${size}px` }}
      >
        {score}
      </span>
      {label && (
        <span className="font-body text-[10px] text-muted uppercase tracking-wider mt-1">{label}</span>
      )}
    </div>
  )
}
