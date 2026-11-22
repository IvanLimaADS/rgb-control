import { RGBColor } from '../shared/types';

export function clampByte(val: number): number {
  return Math.max(0, Math.min(255, Math.round(Number.isFinite(val) ? val : 0)));
}

export function clampPercent(val: number): number {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(val) ? val : 0)));
}

export function sanitizeColor(color: RGBColor): RGBColor {
  return {
    r: clampByte(color.r),
    g: clampByte(color.g),
    b: clampByte(color.b),
  };
}

export function rgbToHex(color: RGBColor): string {
  const c = sanitizeColor(color);
  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
}

export function hexToRgb(hex: string): RGBColor {
  const cleaned = hex.replace(/^#/, '').trim();
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return sanitizeColor({ r, g, b });
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return sanitizeColor({ r, g, b });
  }
  return { r: 0, g: 240, b: 255 };
}

export function interpolateColor(c1: RGBColor, c2: RGBColor, factor: number): RGBColor {
  const t = Math.max(0, Math.min(1, factor));
  return sanitizeColor({
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t,
  });
}

export function rgbToGigabyteUInt32(color: RGBColor): number {
  const c = sanitizeColor(color);
  return ((0xff << 24) | (c.r << 16) | (c.g << 8) | c.b) >>> 0;
}

export function gigabyteUInt32ToRgb(val: number): RGBColor {
  return {
    r: (val >>> 16) & 0xff,
    g: (val >>> 8) & 0xff,
    b: val & 0xff,
  };
}
