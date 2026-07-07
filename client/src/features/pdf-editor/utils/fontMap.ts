const FONT_MAP: [string, string][] = [
  ['helvetica neue', '"Helvetica Neue", Helvetica, Arial, sans-serif'],
  ['helvetica', '"Helvetica Neue", Helvetica, Arial, sans-serif'],
  ['arial', 'Arial, "Helvetica Neue", sans-serif'],
  ['calibri', 'Calibri, "Helvetica Neue", Arial, sans-serif'],
  ['verdana', 'Verdana, Geneva, sans-serif'],
  ['tahoma', 'Tahoma, Geneva, sans-serif'],
  ['trebuchet', '"Trebuchet MS", "Helvetica Neue", sans-serif'],
  ['times new roman', '"Times New Roman", Georgia, serif'],
  ['times', '"Times New Roman", Georgia, serif'],
  ['georgia', 'Georgia, serif'],
  ['garamond', 'Garamond, Georgia, serif'],
  ['palatino', 'Palatino, Georgia, serif'],
  ['baskerville', 'Baskerville, Georgia, serif'],
  ['courier new', '"Courier New", monospace'],
  ['courier', '"Courier New", monospace'],
  ['consolas', 'Consolas, "Courier New", monospace'],
  ['menlo', 'Menlo, Consolas, monospace'],
  ['source code', '"Source Code Pro", Consolas, monospace'],
  ['lucida', '"Lucida Grande", "Helvetica Neue", sans-serif'],
  ['segoe', '"Segoe UI", "Helvetica Neue", Arial, sans-serif'],
  ['franklin', '"Franklin Gothic Medium", Arial, sans-serif'],
  ['gill sans', '"Gill Sans", "Helvetica Neue", Arial, sans-serif'],
  ['optima', 'Optima, "Helvetica Neue", Arial, sans-serif'],
  ['cambria', 'Cambria, Georgia, serif'],
  ['century', '"Century Schoolbook", Georgia, serif'],
  ['bookman', '"Bookman Old Style", Georgia, serif'],
  ['minion', 'Minion Pro, Georgia, serif'],
]

export function mapCanvasFont(fontFamily: string, originalFontFamily?: string): string {
  const name = (originalFontFamily || fontFamily).toLowerCase()
  for (const [key, value] of FONT_MAP) {
    if (name.includes(key)) return value
  }
  if (fontFamily === 'serif') return 'Georgia, "Times New Roman", serif'
  if (fontFamily === 'monospace') return '"Courier New", monospace'
  return '"Helvetica Neue", Helvetica, Arial, sans-serif'
}
