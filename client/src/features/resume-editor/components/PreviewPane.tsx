import type { LocalData, DesignSettings } from '../../../pages/editor/types'
import type { TemplateId } from '../templates/types'
import { getTemplateStyle, getTemplateLayout, getTemplateName } from '../templates/registry'
import ResumePaper from './ResumePaper'

interface PreviewPaneProps {
  data: LocalData
  design: DesignSettings
  templateId: TemplateId
}

export default function PreviewPane({ data, design, templateId }: PreviewPaneProps) {
  const style = getTemplateStyle(templateId)
  const Layout = getTemplateLayout(templateId)
  const templateName = getTemplateName(templateId)

  return (
    <div className="flex flex-col items-center py-8 min-h-full gap-3">
      <ResumePaper>
        <div
          className="px-[8mm] py-[6mm]"
          style={{
            fontFamily: design.bodyFont,
            color: design.secondaryColor,
          }}
        >
          <Layout data={data} design={design} style={style} sectionSpacing={design.sectionSpacing} />
        </div>
      </ResumePaper>
      <span className="text-[10px] text-muted font-medium">{templateName}</span>
    </div>
  )
}
