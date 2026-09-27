function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function hexToChannels(hex: string): { r: number; g: number; b: number; a: number } {
  let r: number, g: number, b: number, a: number;

  if (hex.startsWith('rgba(')) {
    const match = hex.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (!match) throw new Error(`Unable to parse rgba color: ${hex}`);
    const [, rVal, gVal, bVal, aStr] = match;
    a = parseFloat(aStr || '1');
    r = parseInt(rVal, 10);
    g = parseInt(gVal, 10);
    b = parseInt(bVal, 10);
    return { r, g, b, a };
  }

  const cleaned = hex.replace('#', '');

  if (cleaned.length === 8) {
    a = parseInt(cleaned.slice(0, 2), 16) / 255;
    r = parseInt(cleaned.slice(2, 4), 16);
    g = parseInt(cleaned.slice(4, 6), 16);
    b = parseInt(cleaned.slice(6, 8), 16);
  } else if (cleaned.length === 6) {
    a = 1;
    r = parseInt(cleaned.slice(0, 2), 16);
    g = parseInt(cleaned.slice(2, 4), 16);
    b = parseInt(cleaned.slice(4, 6), 16);
  } else if (cleaned.length === 3) {
    a = 1;
    r = parseInt(cleaned.slice(0, 1) + cleaned.slice(0, 1), 16);
    g = parseInt(cleaned.slice(1, 2) + cleaned.slice(1, 2), 16);
    b = parseInt(cleaned.slice(2, 3) + cleaned.slice(2, 3), 16);
  } else {
    throw new Error(`Unable to parse hex color: ${hex}`);
  }

  return { r, g, b, a };
}

export function relativeLuminance(hex: string): number {
  const { r, g, b, a } = hexToChannels(hex);

  const linearR = srgbToLinear(r);
  const linearG = srgbToLinear(g);
  const linearB = srgbToLinear(b);

  const luminance = 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;

  if (a >= 1) {
    return luminance;
  }

  return a * luminance + (1 - a) * 1;
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [lighter, darker] = a >= b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}