import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export type ExtractionMethod = 'text' | 'image'

export interface ExtractionResult {
  method: ExtractionMethod
  text: string
}

// Minimum average characters per page required to treat a PDF as having a real
// (selectable) text layer. Portal PDFs (CND, Receita, FGTS...) have hundreds to
// thousands of chars per page; scanned/photographed PDFs yield near-zero.
const MIN_AVG_CHARS_PER_PAGE = 50
// Cap the payload sent to the backend/model to keep requests reasonable.
const MAX_TEXT_LENGTH = 100000

/**
 * Classifies an uploaded document and, when it is a PDF with a text layer,
 * extracts its text on the client using pdf.js.
 *
 * - PDF with a usable text layer -> { method: 'text', text }
 * - PDF without text (scanned) or any image file -> { method: 'image', text: '' }
 *
 * 'image' documents have no extractable text and are routed to manual review
 * (OCR is a later phase).
 */
export async function extractDocumentText(file: File): Promise<ExtractionResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const isPdf = ext === 'pdf' || file.type === 'application/pdf'

  if (!isPdf) {
    return { method: 'image', text: '' }
  }

  try {
    const buffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise

    const parts: string[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
        .join(' ')
      parts.push(pageText)
    }

    const text = parts
      .join('\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim()
    const numPages = pdf.numPages || 1
    const avgCharsPerPage = text.length / numPages

    if (text.length === 0 || avgCharsPerPage < MIN_AVG_CHARS_PER_PAGE) {
      return { method: 'image', text: '' }
    }

    return { method: 'text', text: text.slice(0, MAX_TEXT_LENGTH) }
  } catch (err) {
    console.error('Falha ao extrair texto do PDF', err)
    return { method: 'image', text: '' }
  }
}
