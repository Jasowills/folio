import { motion } from 'framer-motion'

interface InterviewerAvatarProps {
  name: string
  title: string
  state: 'idle' | 'speaking' | 'listening' | 'thinking'
  size: 'large' | 'small'
}

const largeSize = 280
const smallSize = 80

function BlobShape({ state, size }: { state: InterviewerAvatarProps['state']; size: number }) {
  const isSmall = size === smallSize
  const blobRadius = isSmall
    ? '50%'
    : [
        '60% 40% 40% 60% / 50% 40% 60% 50%',
        '50% 55% 45% 50% / 55% 45% 55% 45%',
        '55% 45% 55% 45% / 45% 55% 45% 55%',
        '45% 60% 40% 55% / 55% 45% 55% 45%',
        '60% 40% 40% 60% / 50% 40% 60% 50%',
      ]

  const getScale = () => {
    if (isSmall) return 1
    switch (state) {
      case 'speaking':
        return [1, 1.06, 1.03, 1.08, 1.04, 1]
      case 'listening':
        return [1, 1.015, 0.99, 1.02, 1]
      case 'thinking':
        return [1, 1.005, 1]
      default:
        return 1
    }
  }

  const getGlowOpacity = () => {
    if (isSmall) return 0
    switch (state) {
      case 'speaking': return [0.4, 0.7, 0.3, 0.8, 0.4]
      case 'listening': return [0.1, 0.2, 0.1]
      case 'thinking': return [0.05, 0.12, 0.05]
      default: return 0
    }
  }

  const getTransition = () => {
    const base = { ease: 'easeInOut' as const, repeat: Infinity }
    if (isSmall) return { ...base, duration: 4, repeatType: 'reverse' as const }
    switch (state) {
      case 'speaking':
        return { ...base, duration: 0.8, repeatType: 'mirror' as const }
      case 'listening':
        return { ...base, duration: 4, repeatType: 'reverse' as const }
      case 'thinking':
        return { ...base, duration: 3, repeatType: 'reverse' as const }
      default:
        return { ...base, duration: 6, repeatType: 'reverse' as const }
    }
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <motion.div
        className="w-full h-full relative z-10"
        style={{
          background: 'radial-gradient(circle at 40% 35%, #5DCAA5, #4F46E5 70%)',
          borderRadius: isSmall ? '50%' : undefined,
        }}
        animate={{
          borderRadius: isSmall ? '50%' : blobRadius,
          scale: getScale(),
        }}
        transition={getTransition()}
      />

      <motion.div
        className="absolute inset-0 -m-4 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(93,202,165,0.15) 0%, transparent 70%)',
        }}
        animate={{ opacity: getGlowOpacity() }}
        transition={getTransition()}
      />

      {state === 'speaking' && !isSmall && (
        <motion.div
          className="absolute inset-0 -m-2 rounded-full border border-teal/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.08, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  )
}

function ThinkingDots() {
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-teal/70"
          animate={{ opacity: [0.2, 0.9, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

function MicrophoneIndicator() {
  return (
    <motion.div
      className="flex items-center justify-center gap-0.5 mt-4 h-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {[2, 4, 6, 8, 6, 4, 2].map((h, i) => (
        <motion.div
          key={i}
          className="w-[2px] bg-teal/40 rounded-full"
          animate={{ height: [2, h + 2, 2] }}
          transition={{
            duration: 0.6 + i * 0.06,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.08,
          }}
        />
      ))}
    </motion.div>
  )
}

export default function InterviewerAvatar({ name, title, state, size }: InterviewerAvatarProps) {
  const isSmall = size === 'small'
  const s = isSmall ? smallSize : largeSize

  return (
    <div className={`flex flex-col items-center ${isSmall ? '' : 'gap-2'}`}>
      <BlobShape state={state} size={s} />

      {state === 'thinking' && !isSmall && <ThinkingDots />}
      {state === 'listening' && !isSmall && <MicrophoneIndicator />}

      {!isSmall && (
        <div className="text-center mt-4">
          <p className="text-[15px] font-semibold text-white/90" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            {name}
          </p>
          <p className="text-[12px] text-white/50 mt-0.5" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            {title}
          </p>
        </div>
      )}

      {isSmall && (
        <div className="text-center mt-2">
          <p className="text-[11px] font-medium text-white/70" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            {name}
          </p>
        </div>
      )}
    </div>
  )
}
