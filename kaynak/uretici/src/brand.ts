import { baselineInBox, measure, wrap, type FontKey } from './fonts.ts';
import { arrowUpRight, simpleMark, verticalLogo, wordmark } from './geometry.ts';
import { round, text } from './svg.ts';
import { color, logos, tint } from './tokens.ts';

// Building blocks of the cobalt surface, measured on the website's share image (src/libs/og-image.tsx in
// handijit-frontend). Every size is a ratio of one base length, so the same piece scales from a 400 px profile
// image to a 1920 px meeting background or a 90 mm business card.

const [, , MARK_W, MARK_H] = logos.mark.viewBox.split(' ').map(Number) as [number, number, number, number];
const [, , WORD_W, WORD_H] = wordmark.viewBox.split(' ').map(Number) as [number, number, number, number];
const [, , HOR_W, HOR_H] = logos.horizontal.viewBox.split(' ').map(Number) as [number, number, number, number];
const [, , VER_W, VER_H] = verticalLogo.viewBox.split(' ').map(Number) as [number, number, number, number];

export const ratio = {
  mark: MARK_W / MARK_H,
  wordmark: WORD_W / WORD_H,
  horizontal: HOR_W / HOR_H,
  vertical: VER_W / VER_H,
  /** Corner radius of the tile and the app icon, as a share of the side. */
  tileRadius: 0.2764,
  /** Mark height inside the tile. */
  tileMark: 0.58,
  /** Lockup: wordmark height and gap as shares of the tile (52 / 34 / 14 on the share image). */
  lockupWordmark: 34 / 52,
  lockupGap: 14 / 52,
};

export const markSize = { width: MARK_W, height: MARK_H };
export const logoSize = {
  horizontal: { width: HOR_W, height: HOR_H },
  vertical: { width: VER_W, height: VER_H },
  wordmark: { width: WORD_W, height: WORD_H },
};

type Paint = { body: string; dot: string };

/** The mark scaled to a height, top-left at (x, y). */
export function mark(x: number, y: number, height: number, paint: Paint): string {
  const k = height / MARK_H;
  return `<g transform="translate(${round(x)} ${round(y)}) scale(${round(k, 6)})"><path fill="${paint.body}" d="${logos.mark.body}"/><path fill="${paint.dot}" d="${logos.mark.dot}"/></g>`;
}

/** The dotless mark (below 32 px). */
export function plainMark(x: number, y: number, height: number, fill: string): string {
  const k = height / MARK_H;
  return `<g transform="translate(${round(x)} ${round(y)}) scale(${round(k, 6)})"><path fill="${fill}" d="${simpleMark.d}"/></g>`;
}

export function horizontalLogo(x: number, y: number, height: number, paint: Paint): string {
  const k = height / HOR_H;
  return `<g transform="translate(${round(x)} ${round(y)}) scale(${round(k, 6)})"><path fill="${paint.body}" d="${logos.horizontal.body}"/><path fill="${paint.dot}" d="${logos.horizontal.dot}"/></g>`;
}

export function verticalLogoAt(x: number, y: number, height: number, paint: Paint): string {
  const k = height / VER_H;
  return `<g transform="translate(${round(x)} ${round(y)}) scale(${round(k, 6)})"><path fill="${paint.body}" d="${verticalLogo.body}"/><path fill="${paint.dot}" d="${verticalLogo.dot}"/></g>`;
}

/** Rounded tile with the white mark and its coral dot (app icon, favicon, lockup). */
export function tile(x: number, y: number, size: number, fill: string, markRatio = ratio.tileMark): string {
  const markHeight = size * markRatio;
  const markWidth = markHeight * ratio.mark;
  return `<rect x="${round(x)}" y="${round(y)}" width="${round(size)}" height="${round(size)}" rx="${round(size * ratio.tileRadius)}" fill="${fill}"/>${mark(x + (size - markWidth) / 2, y + (size - markHeight) / 2, markHeight, { body: color.onPrimary, dot: color.accent })}`;
}

export function wordmarkAt(x: number, y: number, height: number, fill: string): string {
  const k = height / WORD_H;
  return `<g transform="translate(${round(x)} ${round(y)}) scale(${round(k, 6)})"><path fill="${fill}" d="${wordmark.han}"/><path fill="${fill}" d="${wordmark.dijit}"/></g>`;
}

export function lockupWidth(tileSize: number): number {
  return tileSize * (1 + ratio.lockupGap) + tileSize * ratio.lockupWordmark * ratio.wordmark;
}

/**
 * Tile lockup: the mark tile next to the two-line wordmark. On white the tile is cobalt; on the cobalt surface it
 * is the deeper cobalt 800 so it separates from the ground, and the wordmark is white.
 */
export function lockup(x: number, y: number, tileSize: number, on: 'cobalt' | 'paper'): string {
  const wordHeight = tileSize * ratio.lockupWordmark;
  const tileFill = on === 'cobalt' ? color.surfaceStrip : color.primary;
  const wordFill = on === 'cobalt' ? color.onSurface : color.ink;
  return `${tile(x, y, tileSize, tileFill)}${wordmarkAt(x + tileSize * (1 + ratio.lockupGap), y + (tileSize - wordHeight) / 2, wordHeight, wordFill)}`;
}

// ---- Typography ----------------------------------------------------------------------------------------------

export const EYEBROW = { font: 'IBM Plex Mono/500' as FontKey, tracking: 2.6 / 17, lineHeight: 1.45, rule: 28 / 17, ruleWeight: 2 / 17, gap: 14 / 17 };

export type EyebrowOptions = {
  x: number;
  /** Top of the line box. */
  top: number;
  size: number;
  label: string;
  align: 'center' | 'start';
  textFill?: string;
  ruleFill?: string;
  /** Turkish uppercase (default); addresses such as handijit.com stay as written. */
  uppercase?: boolean;
};

/** Mono uppercase eyebrow framed by thin rules (both sides when centred, leading rule when left-aligned). */
export function eyebrow({ x, top, size, label, align, textFill = color.onSurface2, ruleFill = color.surfaceRule, uppercase = true }: EyebrowOptions): string {
  const content = uppercase ? label.toLocaleUpperCase('tr-TR') : label;
  const width = measure(content, EYEBROW.font, size, EYEBROW.tracking);
  const baseline = top + baselineInBox(EYEBROW.font, size, EYEBROW.lineHeight);
  const ruleW = size * EYEBROW.rule;
  const ruleH = Math.max(size * EYEBROW.ruleWeight, 0.1);
  const gap = size * EYEBROW.gap;
  // The rule sits on the optical middle of the capitals.
  const ruleY = baseline - size * 0.36 - ruleH / 2;
  const rule = (rx: number) => `<rect x="${round(rx)}" y="${round(ruleY)}" width="${round(ruleW)}" height="${round(ruleH)}" fill="${ruleFill}"/>`;
  if (align === 'center') {
    const left = x - width / 2;
    return `${rule(left - gap - ruleW)}${text({ x, y: baseline, text: content, font: EYEBROW.font, size, fill: textFill, anchor: 'middle', tracking: EYEBROW.tracking })}${rule(left + width + gap)}`;
  }
  return `${rule(x)}${text({ x: x + ruleW + gap, y: baseline, text: content, font: EYEBROW.font, size, fill: textFill, tracking: EYEBROW.tracking })}`;
}

export function eyebrowHeight(size: number): number {
  return size * EYEBROW.lineHeight;
}

export const HEADING = { font: 'Archivo/600' as FontKey, tracking: -0.03, lineHeight: 1.06 };

export type HeadingOptions = {
  x: number;
  top: number;
  size: number;
  title: string;
  maxWidth: number;
  align: 'center' | 'start';
  fill?: string;
  stopFill?: string;
  lines?: string[];
};

/** White Archivo 600 heading that ends in the coral full stop. */
export function heading({ x, top, size, title, maxWidth, align, fill = color.onSurface, stopFill = color.accent, lines }: HeadingOptions): { svg: string; height: number; lines: string[] } {
  const rows = lines ?? wrap(title, HEADING.font, size, maxWidth - size * 0.3, HEADING.tracking);
  const lineBox = size * HEADING.lineHeight;
  const base = baselineInBox(HEADING.font, size, HEADING.lineHeight);
  // A centred line is centred without its full stop, as on the website (the stop hangs).
  const svg = rows
    .map((row, index) => {
      const last = index === rows.length - 1;
      return text({ x, y: top + index * lineBox + base, text: row, font: HEADING.font, size, fill, anchor: align === 'center' ? 'middle' : 'start', tracking: HEADING.tracking, stop: last ? stopFill : undefined });
    })
    .join('');
  return { svg, height: rows.length * lineBox, lines: rows };
}

export function headingHeight(lines: number, size: number): number {
  return lines * size * HEADING.lineHeight;
}

/** Coral call-to-action with the arrow, as the website's quote button. Base height 54 px. */
export function button(x: number, top: number, height: number, label: string): { svg: string; width: number } {
  const k = height / 54;
  const fontSize = 23 * k;
  const pad = 26 * k;
  const icon = 20 * k;
  const gap = 10 * k;
  const font: FontKey = 'Archivo/600';
  const tracking = -0.4 / 23;
  const textWidth = measure(label, font, fontSize, tracking);
  const width = pad * 2 + textWidth + gap + icon;
  const baseline = top + baselineInBox(font, fontSize, height / fontSize);
  const iconScale = icon / 16;
  const svg = `<rect x="${round(x)}" y="${round(top)}" width="${round(width)}" height="${round(height)}" rx="${round(12 * k)}" fill="${color.accent}"/>${text({ x: x + pad, y: baseline, text: label, font, size: fontSize, fill: color.onAccent, tracking })}<g transform="translate(${round(x + pad + textWidth + gap)} ${round(top + (height - icon) / 2)}) scale(${round(iconScale, 5)})"><path fill="${color.onAccent}" fill-rule="evenodd" d="${arrowUpRight.d}"/></g>`;
  return { svg, width };
}

export function buttonWidth(height: number, label: string): number {
  const k = height / 54;
  return 52 * k + measure(label, 'Archivo/600', 23 * k, -0.4 / 23) + 30 * k;
}

export type Fact = { value: string; label: string };

/** Deeper cobalt strip of facts at the foot of a cobalt surface. Base: 92 px strip, 23 px values, 15 px labels. */
export function factsStrip(opts: { y: number; width: number; height: number; facts: readonly Fact[]; scale: number; x?: number; align?: 'center' | 'start'; startX?: number; contentHeight?: number }): string {
  const { y, width, height, facts, scale, x = 0, align = 'center', startX, contentHeight = height } = opts;
  const valueSize = 23 * scale;
  const labelSize = 15 * scale;
  const pad = 22 * scale;
  const line = 2 * scale;
  const valueFont: FontKey = 'Archivo/600';
  const labelFont: FontKey = 'Inter/500';
  const valueBox = valueSize * 1.2;
  const labelBox = labelSize * 1.2;
  const blockHeight = valueBox + 2 * scale + labelBox;
  const blockTop = y + (contentHeight - blockHeight) / 2;
  const widths = facts.map(fact => Math.max(measure(fact.value, valueFont, valueSize), measure(fact.label, labelFont, labelSize)) + pad * 2);
  const total = widths.reduce((sum, w) => sum + w, 0);
  let cursor = align === 'center' ? x + (width - total) / 2 : (startX ?? x) - pad;
  const items = facts.map((fact, index) => {
    const w = widths[index]!;
    const cx = cursor + w / 2;
    const separator = index === 0 ? '' : `<rect x="${round(cursor - line / 2)}" y="${round(blockTop)}" width="${round(line)}" height="${round(blockHeight)}" fill="${color.stripRule}"/>`;
    const anchor = align === 'center' ? 'middle' : 'start';
    const tx = align === 'center' ? cx : cursor + (index === 0 ? pad : pad);
    cursor += w;
    return `${separator}${text({ x: tx, y: blockTop + baselineInBox(valueFont, valueSize, 1.2), text: fact.value, font: valueFont, size: valueSize, fill: color.onSurface, anchor })}${text({ x: tx, y: blockTop + valueBox + 2 * scale + baselineInBox(labelFont, labelSize, 1.2), text: fact.label, font: labelFont, size: labelSize, fill: color.onSurface2, anchor })}`;
  });
  return `<rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}" fill="${color.surfaceStrip}"/><rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(line)}" fill="${color.stripRule}"/>${items.join('')}`;
}

// ---- Cobalt surface backdrop -------------------------------------------------------------------------------------------

export type Glow = { cx: number; cy: number; r: number; opacity?: number };
export type DotFade = 'sides' | 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'radial';

export type SurfaceOptions = {
  width: number;
  height: number;
  glows?: Glow[];
  /** Grid pitch and dot radius (22 / 1.6 px on the share image). */
  dots?: { pitch: number; radius: number; fade: DotFade; opacity?: number; area?: { x: number; y: number; width: number; height: number } };
  /** The supergraphic: top-left and height of the mark; stroke in output units. */
  supergraphic?: { x: number; y: number; height: number; stroke: number };
  /** Vertical gradient cobalt 600 → 700 (default) or flat cobalt. */
  gradient?: boolean;
  /** Extra bleed drawn around the canvas (print). */
  bleed?: number;
};

const fadeStops: Record<Exclude<DotFade, 'radial'>, { x1: number; y1: number; x2: number; y2: number; stops: [number, number][] }> = {
  sides: { x1: 0, y1: 0, x2: 1, y2: 0, stops: [[0, 1], [0.24, 0], [0.76, 0], [1, 1]] },
  left: { x1: 0, y1: 0, x2: 1, y2: 0, stops: [[0, 1], [0.45, 0]] },
  right: { x1: 0, y1: 0, x2: 1, y2: 0, stops: [[0.55, 0], [1, 1]] },
  top: { x1: 0, y1: 0, x2: 0, y2: 1, stops: [[0, 1], [0.5, 0]] },
  bottom: { x1: 0, y1: 0, x2: 0, y2: 1, stops: [[0.5, 0], [1, 1]] },
  'top-left': { x1: 0, y1: 0, x2: 1, y2: 1, stops: [[0, 1], [0.5, 0]] },
};

/** Background layers of a cobalt surface: gradient, white glows, faded dot grid and the blueprint supergraphic. */
export function cobaltBackdrop(opts: SurfaceOptions): { defs: string; body: string } {
  const { width, height, glows = [], dots, supergraphic, gradient = true, bleed = 0 } = opts;
  const x0 = -bleed;
  const y0 = -bleed;
  const w = width + bleed * 2;
  const h = height + bleed * 2;
  const defs: string[] = [];
  const body: string[] = [];
  if (gradient) {
    defs.push(`<linearGradient id="surface" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color.surface}"/><stop offset="0.5" stop-color="${color.surface}"/><stop offset="1" stop-color="${color.surfaceDeep}"/></linearGradient>`);
    body.push(`<rect x="${round(x0)}" y="${round(y0)}" width="${round(w)}" height="${round(h)}" fill="url(#surface)"/>`);
  } else {
    body.push(`<rect x="${round(x0)}" y="${round(y0)}" width="${round(w)}" height="${round(h)}" fill="${color.surface}"/>`);
  }
  if (glows.length) {
    defs.push(`<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${color.onSurface}" stop-opacity="${tint.glow}"/><stop offset="1" stop-color="${color.onSurface}" stop-opacity="0"/></radialGradient>`);
    for (const g of glows) {
      body.push(`<circle cx="${round(g.cx)}" cy="${round(g.cy)}" r="${round(g.r)}" fill="url(#glow)"${g.opacity === undefined ? '' : ` opacity="${g.opacity}"`}/>`);
    }
  }
  if (dots) {
    const area = dots.area ?? { x: x0, y: y0, width: w, height: h };
    const peak = dots.opacity ?? tint.dots;
    defs.push(`<pattern id="dots" width="${round(dots.pitch)}" height="${round(dots.pitch)}" patternUnits="userSpaceOnUse" x="${round(area.x)}" y="${round(area.y)}"><circle cx="${round(dots.pitch / 2)}" cy="${round(dots.pitch / 2)}" r="${round(dots.radius)}" fill="${color.onSurface}"/></pattern>`);
    if (dots.fade === 'radial') {
      defs.push(`<radialGradient id="dots-fade" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="${peak}"/></radialGradient>`);
    } else {
      const f = fadeStops[dots.fade];
      defs.push(`<linearGradient id="dots-fade" x1="${f.x1}" y1="${f.y1}" x2="${f.x2}" y2="${f.y2}">${f.stops.map(([o, a]) => `<stop offset="${o}" stop-color="#fff" stop-opacity="${round(a * peak)}"/>`).join('')}</linearGradient>`);
    }
    defs.push(`<mask id="dots-mask" maskUnits="userSpaceOnUse" x="${round(area.x)}" y="${round(area.y)}" width="${round(area.width)}" height="${round(area.height)}"><rect x="${round(area.x)}" y="${round(area.y)}" width="${round(area.width)}" height="${round(area.height)}" fill="url(#dots-fade)"/></mask>`);
    body.push(`<rect x="${round(area.x)}" y="${round(area.y)}" width="${round(area.width)}" height="${round(area.height)}" fill="url(#dots)" mask="url(#dots-mask)"/>`);
  }
  if (supergraphic) {
    const s = supergraphicMark(supergraphic);
    defs.push(s.defs);
    body.push(s.body);
  }
  return { defs: defs.join(''), body: body.join('') };
}

/**
 * The blueprint supergraphic: the mark enlarged, its body a white gradient fading downwards with a white outline,
 * both at low opacity, its dot solid coral. It may bleed off the bottom or the left side; the dot is never cut.
 */
export function supergraphicMark({ x, y, height, stroke }: { x: number; y: number; height: number; stroke: number }): { defs: string; body: string } {
  const k = height / MARK_H;
  const defs = `<linearGradient id="mark-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color.onSurface}" stop-opacity="${tint.fillTop}"/><stop offset="${tint.fillHold}" stop-color="${color.onSurface}" stop-opacity="${tint.fillBottom}"/></linearGradient>`;
  const body = `<g transform="translate(${round(x)} ${round(y)}) scale(${round(k, 6)})"><path fill="url(#mark-fill)" stroke="${color.onSurface}" stroke-opacity="${tint.outline}" stroke-width="${round(stroke / k, 3)}" stroke-linejoin="miter" d="${logos.mark.body}"/><path fill="${color.accent}" d="${logos.mark.dot}"/></g>`;
  return { defs, body };
}
