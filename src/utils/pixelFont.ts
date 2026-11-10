export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PixelClockLayout {
  normalizedText: string;
  totalCols: number;
  totalRows: number;
  rects: PixelRect[];
}

const PIXEL_ROWS = 7;

export const PIXEL_GLYPHS_5X7: Record<string, readonly string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['01110', '10001', '00001', '01110', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  ':': ['00', '11', '11', '00', '11', '11', '00'],
  '.': ['00', '00', '00', '00', '00', '11', '11'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  ' ': ['00', '00', '00', '00', '00', '00', '00'],
};

export function normalizePixelClockText(input: string): string {
  const upper = (input || '3:39 PM').trim().toUpperCase();
  let out = '';
  for (const ch of upper) {
    if (ch in PIXEL_GLYPHS_5X7) {
      out += ch;
    }
  }
  return out || '3:39 PM';
}

/**
 * Computes crisp micro-pixel LED grid coordinates (scaled cleanly in unit grid cells)
 * so SVG & Canvas render identical sharp pixelated retro-digital glyphs.
 */
export function buildPixelClockLayout(rawText: string, cellUnit = 1, gap = 0.16): PixelClockLayout {
  const normalizedText = normalizePixelClockText(rawText);
  const chars = Array.from(normalizedText);
  const rects: PixelRect[] = [];
  let cursorCol = 0;

  chars.forEach((ch, idx) => {
    const matrix = PIXEL_GLYPHS_5X7[ch] || PIXEL_GLYPHS_5X7[' '];
    const widthCols = matrix[0]?.length || 2;
    const pixelSize = cellUnit - gap;

    for (let r = 0; r < PIXEL_ROWS; r++) {
      const rowStr = matrix[r] || '';
      for (let c = 0; c < widthCols; c++) {
        if (rowStr[c] === '1') {
          rects.push({
            x: Number(((cursorCol + c) * cellUnit + gap * 0.5).toFixed(3)),
            y: Number((r * cellUnit + gap * 0.5).toFixed(3)),
            w: Number(pixelSize.toFixed(3)),
            h: Number(pixelSize.toFixed(3)),
          });
        }
      }
    }

    cursorCol += widthCols;
    if (idx < chars.length - 1) {
      cursorCol += ch === ':' || chars[idx + 1] === ':' ? 1 : 1.25;
    }
  });

  return {
    normalizedText,
    totalCols: Math.max(1, Number((cursorCol * cellUnit).toFixed(3))),
    totalRows: Number((PIXEL_ROWS * cellUnit).toFixed(3)),
    rects,
  };
}
