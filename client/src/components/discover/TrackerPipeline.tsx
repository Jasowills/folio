import TrackerCard from './TrackerCard'

interface PipelineStage {
  key: string
  label: string
}

interface TrackerPipelineProps {
  stages: PipelineStage[]
  groupedByStage: Record<string, any[]>
  onSelectApp: (app: any) => void
}

export default function TrackerPipeline({ stages, groupedByStage, onSelectApp }: TrackerPipelineProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {stages.map((stage) => {
        const apps = groupedByStage[stage.key] || []
        return (
          <div key={stage.key} className="flex-shrink-0 w-64">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-xs font-semibold text-ink uppercase tracking-wider">{stage.label}</h3>
              <span className="text-[10px] font-medium bg-paper-dark text-muted px-1.5 py-0.5 rounded-full">
                {apps.length}
              </span>
            </div>
            <div className="space-y-2 min-h-[120px]">
              {apps.map((app: any) => (
                <TrackerCard
                  key={app._id}
                  app={app}
                  onClick={() => onSelectApp(app)}
                />
              ))}
              {apps.length === 0 && (
                <div className="h-20 border-2 border-dashed border-border-light rounded-lg" />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
