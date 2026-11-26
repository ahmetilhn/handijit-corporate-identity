import { readFileSync } from 'node:fs';
import path from 'node:path';

import * as fontkit from 'fontkit';
import subsetFont from 'subset-font';

import { dir } from './config.ts';

// The brand fonts of 02-font. Every file carries the whole Turkish set (İ ı ş ğ ç ö ü â), so the assets never fall
// back to another face. SVG text names the typographic family and the weight; resvg (PNG) loads these files,
// browsers and Chromium (PDF) read the embedded subsets, design programs use the installed fonts.
export const FONT_FILES = {
  'Archivo/600': 'Archivo_600SemiBold.ttf',
  'Archivo/500': 'Archivo_500Medium.ttf',
  'Inter/400': 'Inter_400Regular.ttf',
  'Inter/500': 'Inter_500Medium.ttf',
  'Inter/600': 'Inter_600SemiBold.ttf',
  'IBM Plex Mono/400': 'IBMPlexMono_400Regular.ttf',
  'IBM Plex Mono/500': 'IBMPlexMono_500Medium.ttf',
} as const;

export type FontKey = keyof typeof FONT_FILES;

export const fontPaths = Object.values(FONT_FILES).map(file => path.join(dir.font, file));

type Face = { unitsPerEm: number; ascent: number; descent: number; layout(text: string): { advanceWidth: number } };
const faces = new Map<FontKey, Face>();

function face(key: FontKey): Face {
  let loaded = faces.get(key);
  if (!loaded) {
    loaded = fontkit.openSync(path.join(dir.font, FONT_FILES[key])) as unknown as Face;
    faces.set(key, loaded);
  }
  return loaded;
}

export function familyOf(key: FontKey): { family: string; weight: number } {
  const [family, weight] = key.split('/');
  return { family: family!, weight: Number(weight) };
}

/** Advance width of a run in px; tracking is in em and, as in SVG, follows every glyph but the last. */
export function measure(text: string, key: FontKey, size: number, tracking = 0): number {
  const font = face(key);
  const glyphs = [...text].length;
  return (font.layout(text).advanceWidth / font.unitsPerEm) * size + tracking * size * Math.max(0, glyphs - 1);
}

/** Baseline offset from the top of a CSS line box (line-height × size), as browsers place it. */
export function baselineInBox(key: FontKey, size: number, lineHeight: number): number {
  const font = face(key);
  const ascent = (font.ascent / font.unitsPerEm) * size;
  const descent = (-font.descent / font.unitsPerEm) * size;
  return (lineHeight * size - (ascent + descent)) / 2 + ascent;
}

/** Cap height in px (H of the face), used to centre single lines optically. */
export function capHeight(key: FontKey, size: number): number {
  const font = face(key) as unknown as { capHeight: number; unitsPerEm: number };
  return (font.capHeight / font.unitsPerEm) * size;
}

/** Greedy word wrap within a width. */
export function wrap(text: string, key: FontKey, size: number, maxWidth: number, tracking = 0): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/u)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate, key, size, tracking) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const subsetCache = new Map<string, string>();

/** @font-face rules with woff2 subsets of exactly the characters used, so an SVG renders without installed fonts. */
export async function fontFaceCss(usage: Map<FontKey, Set<string>>): Promise<string> {
  const rules: string[] = [];
  for (const [key, chars] of [...usage.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const text = [...chars].sort().join('');
    const cacheKey = `${key}:${text}`;
    let data = subsetCache.get(cacheKey);
    if (!data) {
      const buffer = readFileSync(path.join(dir.font, FONT_FILES[key]));
      data = (await subsetFont(buffer, text, { targetFormat: 'woff2' })).toString('base64');
      subsetCache.set(cacheKey, data);
    }
    const { family, weight } = familyOf(key);
    rules.push(
      `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;src:url(data:font/woff2;base64,${data}) format('woff2')}`,
    );
  }
  return rules.join('');
}
