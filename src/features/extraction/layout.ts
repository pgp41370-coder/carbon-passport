/**
 * Turns positioned text fragments (PDF text items or OCR words) into reading-order
 * lines made of cells. A "cell" is a run of fragments separated by small gaps, so
 * table columns and label/value pairs become separate cells.
 */

export interface Token {
  text: string
  x0: number
  x1: number
  /** Top and bottom edges, in a top-down coordinate system. */
  y0: number
  y1: number
  /** OCR confidence 0–100, when known. */
  confidence?: number
}

export interface Cell {
  text: string
  x0: number
  x1: number
  confidence?: number
}

export interface LayoutLine {
  page: number
  /** 1-based line number within the page. */
  number: number
  cells: Cell[]
  text: string
  confidence?: number
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined)

export function buildLines(tokens: readonly Token[], page: number): LayoutLine[] {
  const usable = tokens.filter((t) => t.text.trim() !== '' && t.x1 >= t.x0 && t.y1 > t.y0)
  usable.sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2)

  // Group tokens whose vertical centres fall inside the current line's band.
  const rows: Token[][] = []
  let band: { top: number; bottom: number } | null = null
  for (const token of usable) {
    const centre = (token.y0 + token.y1) / 2
    if (band && centre >= band.top && centre <= band.bottom) {
      rows[rows.length - 1]!.push(token)
      band = { top: Math.min(band.top, token.y0), bottom: Math.max(band.bottom, token.y1) }
    } else {
      rows.push([token])
      band = { top: token.y0, bottom: token.y1 }
    }
  }

  return rows.map((row, index) => {
    row.sort((a, b) => a.x0 - b.x0)
    const height = Math.max(...row.map((t) => t.y1 - t.y0))
    const groups: Token[][] = []
    let groupRight = -Infinity
    for (const token of row) {
      // A gap wider than roughly one character height starts a new cell.
      if (groups.length && token.x0 - groupRight <= height * 0.9) {
        groups[groups.length - 1]!.push(token)
        groupRight = Math.max(groupRight, token.x1)
      } else {
        groups.push([token])
        groupRight = token.x1
      }
    }
    const cells = groups.map((group) => toCell(group, height))
    const confidences = row.map((t) => t.confidence).filter((c): c is number => c !== undefined)
    return {
      page,
      number: index + 1,
      cells,
      text: cells.map((c) => c.text).join('   '),
      confidence: mean(confidences),
    }
  })
}

function toCell(tokens: Token[], height = 0): Cell {
  let text = ''
  for (const [i, token] of tokens.entries()) {
    const previous = tokens[i - 1]
    // Insert a space when fragments are visibly apart and neither side already has one.
    const needsSpace = previous && token.x0 - previous.x1 > height * 0.12 && !/\s$/.test(text) && !/^\s/.test(token.text)
    text += (needsSpace ? ' ' : '') + token.text
  }
  const confidences = tokens.map((t) => t.confidence).filter((c): c is number => c !== undefined)
  return {
    text: text.replace(/\s+/g, ' ').trim(),
    x0: tokens[0]!.x0,
    x1: Math.max(...tokens.map((t) => t.x1)),
    confidence: confidences.length ? Math.min(...confidences) : undefined,
  }
}
