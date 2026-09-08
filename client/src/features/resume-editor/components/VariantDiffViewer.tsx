import type { ResumeContentDiff } from '../../../lib/queries'

interface Props {
  diff: ResumeContentDiff
}

export default function VariantDiffViewer({ diff }: Props) {
  if (!diff) return null

  return (
    <div className="space-y-4 text-sm">
      {/* Summary change */}
      {diff.summaryChange && (
        <section>
          <h4 className="text-xs font-semibold text-ink mb-1.5">Summary</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 rounded bg-danger-light/30 text-xs text-muted line-clamp-3">
              {diff.summaryChange.before}
            </div>
            <div className="p-2 rounded bg-success-light/30 text-xs text-muted line-clamp-3">
              {diff.summaryChange.after}
            </div>
          </div>
        </section>
      )}

      {/* Skills change */}
      {diff.skillsChange && (diff.skillsChange.added.length > 0 || diff.skillsChange.removed.length > 0) && (
        <section>
          <h4 className="text-xs font-semibold text-ink mb-1.5">Skills</h4>
          <div className="flex flex-wrap gap-1.5">
            {diff.skillsChange.added.map((s) => (
              <span key={s} className="text-[11px] bg-success-light text-success px-2 py-0.5 rounded-full">
                +{s}
              </span>
            ))}
            {diff.skillsChange.removed.map((s) => (
              <span key={s} className="text-[11px] bg-danger-light text-danger px-2 py-0.5 rounded-full">
                -{s}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Modified bullets */}
      {diff.modifiedBullets && diff.modifiedBullets.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold text-ink mb-1.5">
            Modified Bullets ({diff.modifiedBullets.length})
          </h4>
          <div className="space-y-2">
            {diff.modifiedBullets.map((m, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <div className="p-2 rounded bg-danger-light/30 text-xs text-muted line-clamp-2">
                  {m.before || <span className="italic opacity-50">(added)</span>}
                </div>
                <div className="p-2 rounded bg-success-light/30 text-xs text-muted line-clamp-2">
                  {m.after}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section changes */}
      {diff.addedSections && diff.addedSections.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold text-ink mb-1.5">Added Sections</h4>
          <div className="flex flex-wrap gap-1.5">
            {diff.addedSections.map((s: string) => (
              <span key={s} className="text-[11px] bg-success-light text-success px-2 py-0.5 rounded-full">
                +{s}
              </span>
            ))}
          </div>
        </section>
      )}
      {diff.removedSections && diff.removedSections.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold text-ink mb-1.5">Removed Sections</h4>
          <div className="flex flex-wrap gap-1.5">
            {diff.removedSections.map((s: string) => (
              <span key={s} className="text-[11px] bg-danger-light text-danger px-2 py-0.5 rounded-full">
                -{s}
              </span>
            ))}
          </div>
        </section>
      )}

      {!diff.summaryChange && (!diff.skillsChange || (diff.skillsChange.added.length === 0 && diff.skillsChange.removed.length === 0)) && (!diff.modifiedBullets || diff.modifiedBullets.length === 0) && (!diff.addedSections || diff.addedSections.length === 0) && (
        <p className="text-xs text-muted italic">No changes to display</p>
      )}
    </div>
  )
}
