import type { LocalData, DesignSettings } from '../../../../pages/editor/types'
import type { TemplateConfig, ColumnLayout, HeaderTreatment } from './types'

import SingleColumnLayout from './building-blocks/columns/SingleColumnLayout'
import SidebarLeftLayout from './building-blocks/columns/SidebarLeftLayout'
import SidebarRightLayout from './building-blocks/columns/SidebarRightLayout'
import HeaderBandLayout from './building-blocks/columns/HeaderBandLayout'
import AsymmetricGridLayout from './building-blocks/columns/AsymmetricGridLayout'

import CenteredStackedHeader from './building-blocks/headers/CenteredStackedHeader'
import LeftAlignedHeader from './building-blocks/headers/LeftAlignedHeader'
import FullBleedBandHeader from './building-blocks/headers/FullBleedBandHeader'
import CardBlockHeader from './building-blocks/headers/CardBlockHeader'
import SplitHeader from './building-blocks/headers/SplitHeader'

import CirclePhoto from './building-blocks/photos/CirclePhoto'
import SquarePhoto from './building-blocks/photos/SquarePhoto'
import FramedPhoto from './building-blocks/photos/FramedPhoto'
import IntegratedHeaderPhoto from './building-blocks/photos/IntegratedHeaderPhoto'

import ConfigurableSectionRenderer from './ConfigurableSectionRenderer'
import SidebarContent from './SidebarContent'

const COLUMN_LAYOUT_MAP: Record<ColumnLayout, React.FC<any>> = {
  'single-column': SingleColumnLayout,
  'sidebar-left': SidebarLeftLayout,
  'sidebar-right': SidebarRightLayout,
  'header-band-plus-single': HeaderBandLayout,
  'asymmetric-grid': AsymmetricGridLayout,
}

const HEADER_TREATMENT_MAP: Record<HeaderTreatment, React.FC<any>> = {
  'centered-stacked': CenteredStackedHeader,
  'left-aligned': LeftAlignedHeader,
  'full-bleed-band': FullBleedBandHeader,
  'card-block': CardBlockHeader,
  'split-header': SplitHeader,
}

const PHOTO_HANDLER_MAP: Record<string, React.FC<any>> = {
  circle: CirclePhoto,
  square: SquarePhoto,
  framed: FramedPhoto,
  'integrated-into-header': IntegratedHeaderPhoto,
}

interface ConfigurableLayoutProps {
  config: TemplateConfig
  data: LocalData
  design: DesignSettings
}

export default function ConfigurableLayout({ config, data, design }: ConfigurableLayoutProps) {
  const ColumnLayout = COLUMN_LAYOUT_MAP[config.columnLayout] || SingleColumnLayout
  const HeaderComponent = HEADER_TREATMENT_MAP[config.headerTreatment] || CenteredStackedHeader
  const PhotoComponent = config.photoHandling !== 'none' ? PHOTO_HANDLER_MAP[config.photoHandling] : null

  const hasPhoto = PhotoComponent && data.contact.photoUrl
  const photoElement = hasPhoto ? <PhotoComponent photoUrl={data.contact.photoUrl!} size={64} /> : null

  const header = <HeaderComponent data={data} design={design} style={config.style} photoElement={photoElement} />

  const content = (
    <ConfigurableSectionRenderer
      data={data}
      design={design}
      templateStyle={config.style}
      sectionHeaderStyle={config.sectionHeaderStyle}
      sectionSpacing={design.sectionSpacing}
    />
  )

  const sidebarContent = config.columnLayout === 'sidebar-left' || config.columnLayout === 'sidebar-right' ? (
    <SidebarContent data={data} design={design} config={config} photoElement={photoElement} />
  ) : undefined

  return (
    <ColumnLayout
      header={header}
      design={design}
      sidebarContent={sidebarContent}
    >
      {content}
    </ColumnLayout>
  )
}
