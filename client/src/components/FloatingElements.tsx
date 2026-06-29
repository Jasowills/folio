function DriftWrapper({ children, duration, delay, className }: { children: React.ReactNode; duration: number; delay: number; className?: string }) {
  return (
    <div
      className={`absolute pointer-events-none select-none ${className || ''}`}
      style={{
        animation: `drift ${duration}s ease-in-out ${delay}s infinite`,
      }}
    >
      {children}
    </div>
  )
}

function ResumeDoc({ width, height }: { width: number; height: number }) {
  const lineH = Math.max(height / 14, 6)
  const lines = Math.floor(height / (lineH + 4))
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect x="0" y="0" width={width} height={height} rx="3" fill="white" stroke="#E5E0D8" strokeWidth="1" />
      <rect x={width * 0.15} y="12" width={width * 0.7} height="8" rx="2" fill="#E5E0D8" opacity="0.5" />
      {Array.from({ length: lines }).map((_, i) => (
        <rect
          key={i}
          x={width * 0.12}
          y={28 + i * (lineH + 4)}
          width={width * (0.3 + Math.random() * 0.5)}
          height={lineH}
          rx="1.5"
          fill="#E5E0D8"
          opacity="0.35"
        />
      ))}
    </svg>
  )
}

function StickyNote({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <clipPath id={`clip-${size}`}>
          <polygon points={`0,0 ${size - 8},0 ${size},8 ${size},${size} 0,${size}`} />
        </clipPath>
      </defs>
      <rect x="0" y="0" width={size} height={size} rx="2" fill="#FDF3E3" stroke="#BA7517" strokeWidth="0.5" opacity="0.4" clipPath={`url(#clip-${size})`} />
      <line x1={size * 0.2} y1={size * 0.3} x2={size * 0.8} y2={size * 0.3} stroke="#BA7517" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
      <line x1={size * 0.2} y1={size * 0.45} x2={size * 0.7} y2={size * 0.45} stroke="#BA7517" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
      <line x1={size * 0.2} y1={size * 0.6} x2={size * 0.6} y2={size * 0.6} stroke="#BA7517" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
    </svg>
  )
}

function PaperAirplane({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="1.5" opacity="0.15">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function Briefcase({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.5" opacity="0.08">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function MagnifyingGlass({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="1.5" opacity="0.12">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function Stamp({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" opacity="0.1">
      <circle cx="20" cy="20" r="18" stroke="#BA7517" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="14" stroke="#BA7517" strokeWidth="0.5" />
      <path d="M14 20l4 4 8-8" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function FloatingElements() {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
      {/* Ghost & character */}
      <div
        className="absolute right-[-100px] top-1/2 -translate-y-1/2 font-display text-ink leading-none select-none pointer-events-none"
        style={{
          fontSize: '400px',
          animation: 'pulse-soft 4s ease-in-out infinite',
        }}
      >
        &amp;
      </div>

      {/* Resume docs */}
      <DriftWrapper duration={5.2} delay={0} className="bottom-[12%] left-[5%]">
        <ResumeDoc width={140} height={180} />
      </DriftWrapper>
      <DriftWrapper duration={4.8} delay={1.2} className="top-[10%] right-[8%]">
        <ResumeDoc width={100} height={130} />
      </DriftWrapper>
      <DriftWrapper duration={5.6} delay={0.6} className="top-[35%] right-[2%]">
        <ResumeDoc width={70} height={90} />
      </DriftWrapper>

      {/* Sticky notes */}
      <DriftWrapper duration={4.5} delay={0.3} className="top-[18%] left-[12%] -rotate-3">
        <StickyNote size={70} />
      </DriftWrapper>
      <DriftWrapper duration={5} delay={1.5} className="bottom-[30%] right-[12%] rotate-2">
        <StickyNote size={55} />
      </DriftWrapper>

      {/* Paper airplane */}
      <DriftWrapper duration={6} delay={0.8} className="bottom-[40%] left-[3%] rotate-[15deg]">
        <PaperAirplane size={40} />
      </DriftWrapper>

      {/* Briefcase */}
      <DriftWrapper duration={5.5} delay={1} className="top-[55%] left-[2%]">
        <Briefcase size={36} />
      </DriftWrapper>

      {/* Magnifying glass */}
      <DriftWrapper duration={4.2} delay={0.5} className="bottom-[20%] right-[5%]">
        <MagnifyingGlass size={32} />
      </DriftWrapper>

      {/* Stamp */}
      <DriftWrapper duration={5.8} delay={1.8} className="top-[8%] right-[20%]">
        <Stamp size={32} />
      </DriftWrapper>
    </div>
  )
}
