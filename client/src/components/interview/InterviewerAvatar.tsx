import { motion, AnimatePresence } from 'framer-motion'

interface InterviewerAvatarProps {
  name: string
  title: string
  isSpeaking: boolean
  isListening: boolean
  isPaused: boolean
  currentQuestion?: string
}

const avatarVariants = {
  idle: { scale: 1 },
  listening: {
    scale: 1.02,
    transition: { duration: 2, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' as const },
  },
  speaking: {
    scale: [1, 1.08, 1.04, 1.1, 1.06, 1],
    transition: { duration: 0.8, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' as const },
  },
}

export default function InterviewerAvatar({
  name,
  title,
  isSpeaking,
  isListening,
  isPaused,
}: InterviewerAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const state = isPaused ? 'idle' : isSpeaking ? 'speaking' : isListening ? 'listening' : 'idle'

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <motion.div
          className="w-28 h-28 rounded-full bg-gradient-to-br from-teal to-emerald-600 flex items-center justify-center relative z-10 cursor-default"
          variants={avatarVariants}
          animate={state}
        >
          <span className="text-3xl font-semibold text-white/95 font-[family-name:var(--font-body)]">
            {initials}
          </span>
        </motion.div>

        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -inset-3 rounded-full border-2 border-teal/40"
              style={{
                animation: 'ping-slow 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -inset-5 rounded-full border border-teal/15"
              style={{
                animation: 'ping-slower 2s cubic-bezier(0, 0, 0.2, 1) infinite',
              }}
            />
          )}
        </AnimatePresence>

        {/* Status indicator */}
        <div className="absolute -bottom-0.5 -right-0.5 z-20">
          {isPaused ? (
            <div className="w-5 h-5 rounded-full bg-amber-400 border-2 border-paper flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          ) : isSpeaking ? (
            <div className="w-5 h-5 rounded-full bg-teal border-2 border-paper flex items-center justify-center">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-white"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
            </div>
          ) : isListening ? (
            <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-paper flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-muted border-2 border-paper flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
            </div>
          )}
        </div>

        {/* Audio waveform bars when speaking */}
        {isSpeaking && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-end gap-[3px] h-4">
            {[1, 2, 3, 4, 3, 2, 1].map((h, i) => (
              <motion.div
                key={i}
                className="w-[3px] bg-teal/60 rounded-full"
                animate={{
                  height: [4, 4 + h * 2, 4],
                }}
                transition={{
                  duration: 0.5 + i * 0.08,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="text-center mt-2">
        <p className="text-sm font-semibold text-ink">{name}</p>
        <p className="text-xs text-muted">{title}</p>
      </div>
    </div>
  )
}
