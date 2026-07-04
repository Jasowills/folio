export interface PdfTextItem {
  str: string
  x: number
  y: number
  width: number
  height: number
  fontName: string
  fontSize: number
  transform: number[]
}

export interface TextRegion {
  id: string
  items: PdfTextItem[]
  text: string
  x: number
  y: number
  width: number
  height: number
  fontName: string
  fontSize: number
  fontColor: string
  textAlign: 'left' | 'center' | 'right'
  edited: boolean
  originalText: string
  originalFontName: string
  originalFontSize: number
  originalFontColor: string
  confidence: number
}

export interface DocumentFontDefaults {
  fontName: string
  fontSize: number
  fontColor: string
  lineSpacing: number
}

export interface PdfPageData {
  pageNumber: number
  width: number
  height: number
  regions: TextRegion[]
}

export interface PdfDocumentData {
  numPages: number
  pages: PdfPageData[]
  isUploaded: boolean
  fontDefaults: DocumentFontDefaults
}
