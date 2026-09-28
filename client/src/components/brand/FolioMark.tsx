export function FolioMark({ size = 40, showConstruction = false }: { size?: number; showConstruction?: boolean }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
        {/* ledger lines */}
        <rect x="6" y="6" width="28" height="28" rx="6" stroke="#14532D" strokeOpacity="0.14" strokeWidth="0.8" />
        <path d="M11 14H29M11 20H29M11 26H22" stroke="#14532D" strokeOpacity="0.22" strokeWidth="0.8" strokeLinecap="round" />
        {/* & as check + ledger hook */}
        <path
          d="M14.5 27.2C13.1 24.8 12 22.1 13.2 19.4C14.3 16.8 17.1 15.2 19.8 15.8C22.6 16.4 24.4 19.2 24.1 21.9C23.8 24.7 21.2 26.6 18.6 26.2C16.3 25.9 14.6 24.3 14.6 22"
          stroke="#0A1F18"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M16.8 22L19.2 24.6L26.2 16.2" stroke="#14532D" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        {showConstruction && (
          <>
            <circle cx="20" cy="20" r="14" stroke="#14532D" strokeOpacity="0.08" strokeDasharray="1.5 2.5" />
            <path d="M20 6V34M6 20H34" stroke="#14532D" strokeOpacity="0.06" strokeWidth="0.6" />
            <circle cx="20" cy="20" r="1.2" fill="#14532D" fillOpacity="0.9" />
          </>
        )}
      </svg>
    </div>
  )
}

export function FolioWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
      <span className="font-display text-xl font-extrabold tracking-tight text-ink">Folio</span>
      <span className="font-display text-2xl font-extrabold leading-none text-teal">&amp;</span>
    </span>
  )
}
