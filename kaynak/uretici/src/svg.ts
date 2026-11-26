import { type FontKey, FONT_FILES, familyOf, fontFaceCss } from './fonts.ts';

export function round(value: number, digits = 3): number {
  return Number(value.toFixed(digits));
}

export function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function unescape(text: string): string {
  return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

export type TextOptions = {
  x: number;
  y: number;
  text: string;
  font: FontKey;
  size: number;
  fill: string;
  anchor?: 'start' | 'middle' | 'end';
  /** Letter spacing in em. */
  tracking?: number;
  /** Colour of a trailing full stop (the coral full stop of headings). */
  stop?: string;
};

/**
 * Live, editable SVG text. SVG adds letter spacing after every glyph, the last one too; a centred or
 * right-aligned run is shifted by that trailing space so it sits where it is measured.
 */
export function text({ x, y, text: content, font, size, fill, anchor = 'start', tracking = 0, stop }: TextOptions): string {
  const { family, weight } = familyOf(font);
  const spacing = tracking * size;
  const shift = anchor === 'middle' ? spacing / 2 : anchor === 'end' ? spacing : 0;
  const attrs = [
    `x="${round(x + shift)}"`,
    `y="${round(y)}"`,
    `font-family="${family}"`,
    `font-weight="${weight}"`,
    `font-size="${round(size)}"`,
    spacing ? `letter-spacing="${round(spacing)}"` : '',
    anchor === 'start' ? '' : `text-anchor="${anchor}"`,
    `fill="${fill}"`,
  ].filter(Boolean);
  const tail = stop ? `<tspan fill="${stop}">.</tspan>` : '';
  return `<text ${attrs.join(' ')}>${esc(content)}${tail}</text>`;
}

/** Characters used per font, read back from the finished markup. */
function fontUsage(markup: string): Map<FontKey, Set<string>> {
  const usage = new Map<FontKey, Set<string>>();
  for (const match of markup.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attrs = match[1]!;
    const family = /font-family="([^"]+)"/.exec(attrs)?.[1];
    const weight = /font-weight="(\d+)"/.exec(attrs)?.[1];
    const key = `${family}/${weight}` as FontKey;
    if (!(key in FONT_FILES)) throw new Error(`Unknown font ${key}`);
    const chars = usage.get(key) ?? new Set<string>();
    for (const char of unescape(match[2]!.replace(/<[^>]+>/g, ''))) chars.add(char);
    usage.set(key, chars);
  }
  return usage;
}

export type DocumentOptions = {
  width: number;
  height: number;
  /** Physical size for print sources (mm); screen assets use px. */
  unit?: 'px' | 'mm';
  title: string;
  defs?: string;
  body: string;
  /** Embed woff2 subsets of the fonts used (default true). */
  embedFonts?: boolean;
};

export async function svgDocument({ width, height, unit = 'px', title, defs = '', body, embedFonts = true }: DocumentOptions): Promise<string> {
  const size = unit === 'mm' ? `width="${round(width)}mm" height="${round(height)}mm"` : `width="${round(width)}" height="${round(height)}"`;
  const css = embedFonts ? await fontFaceCss(fontUsage(body)) : '';
  const style = css ? `<style>${css}</style>` : '';
  const definitions = defs ? `<defs>${defs}</defs>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" ${size} viewBox="0 0 ${round(width)} ${round(height)}"><title>${esc(title)}</title>${style}${definitions}${body}</svg>\n`;
}
