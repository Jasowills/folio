import api from './api'

export async function exportResumePdf(resumeId: string, filename = 'resume.pdf'): Promise<void> {
  const { data: html } = await api.get(`/export/${resumeId}`, {
    responseType: 'text',
    transformResponse: [(d) => d],
  })

  const container = document.createElement('div')
  container.innerHTML = html
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '8.5in'
  document.body.appendChild(container)

  try {
    const html2pdf = (await import('html2pdf.js')).default
    await html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      })
      .from(container)
      .save()
  } finally {
    document.body.removeChild(container)
  }
}

export async function exportGuestReportPdf(data: unknown, filename = 'folio-report.pdf'): Promise<void> {
  const { data: html } = await api.post('/export/guest-report', data as Record<string, unknown>, {
    responseType: 'text',
    transformResponse: [(d) => d],
  })

  const container = document.createElement('div')
  container.innerHTML = html
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '8.5in'
  document.body.appendChild(container)

  try {
    const html2pdf = (await import('html2pdf.js')).default
    await html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      })
      .from(container)
      .save()
  } finally {
    document.body.removeChild(container)
  }
}
