interface TrackerAnalyticsStripProps {
  stats?: {
    totalTracked: number
    responseRate: number
    averageMatchScore: number
    ghostedCount: number
  } | null
}

export default function TrackerAnalyticsStrip({ stats }: TrackerAnalyticsStripProps) {
  if (!stats) return null

  return (
    <div className="grid grid-cols-4 gap-3">
      <div className="stat-card">
        <p className="label-uppercase text-muted">Total Tracked</p>
        <p className="font-display text-h3 text-ink">{stats.totalTracked}</p>
      </div>
      <div className="stat-card">
        <p className="label-uppercase text-muted">Response Rate</p>
        <p className={`font-display text-h3 ${stats.responseRate < 30 && stats.totalTracked > 0 ? 'text-amber' : 'text-ink'}`}>
          {stats.responseRate}%
        </p>
      </div>
      <div className="stat-card">
        <p className="label-uppercase text-muted">Avg Match Score</p>
        <p className={`font-display text-h3 ${stats.averageMatchScore < 65 ? 'text-amber' : 'text-ink'}`}>
          {stats.averageMatchScore}%
        </p>
        {stats.averageMatchScore < 65 && (
          <p className="text-[10px] text-amber mt-1">Consider roles above 70% for better response rates</p>
        )}
      </div>
      <div className="stat-card">
        <p className="label-uppercase text-muted">Ghosted</p>
        <p className={`font-display text-h3 ${stats.ghostedCount > 3 ? 'text-amber' : 'text-ink'}`}>
          {stats.ghostedCount}
        </p>
        {stats.ghostedCount > 3 && (
          <p className="text-[10px] text-amber mt-1">Consider follow-ups</p>
        )}
      </div>
    </div>
  )
}
