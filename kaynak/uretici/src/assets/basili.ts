import { rmSync } from 'node:fs';
import path from 'node:path';

import jsQRModule from 'jsqr';
import QRCode from 'qrcode';
import { Resvg } from '@resvg/resvg-js';

import { bandBackdrop, horizontalLogo, lockup, mark, ratio } from '../brand.ts';
import { brand, dir } from '../config.ts';
import { fontPaths } from '../fonts.ts';
import { assemblePdf, pdfPages, write } from '../render.ts';
import { round, svgDocument, text } from '../svg.ts';
import { color } from '../tokens.ts';

// Print files of 04-basili. The card front and the letterhead stay white and black, only the mark's dot turns
// coral; the card back and the sticker are band surfaces. Sizes are in mm; the SVG sources keep live text (fonts
// embedded as subsets) so names and numbers can be edited, the PDFs are printed from them by Chromium.
//
// The PDFs are RGB: the printer converts them to CMYK with their own profile and sends a proof (see the guide).

const INK = '#000000';
const PAPER = '#FFFFFF';
const CARD = { width: 90, height: 50, bleed: 3 };
const STICKER = { size: 60, bleed: 2, radius: 60 * ratio.tileRadius };

// jsqr is a CommonJS bundle: its default import is the function itself, its types describe `.default`.
const jsQR = jsQRModule as unknown as typeof jsQRModule.default;

// ---- WhatsApp QR -----------------------------------------------------------------------------------------------

/** QR modules as chamfered squares (chamfer 0.236 module, the mark's ratio); the finder patterns stay square. */
export function qrPath(data: string, x: number, y: number, size: number): string {
  const qr = QRCode.create(data, { errorCorrectionLevel: 'H' });
  const n = qr.modules.size;
  const m = size / n;
  const k = m * 0.236;
  const isFinder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const parts: string[] = [];
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!qr.modules.get(r, c) || isFinder(r, c)) continue;
      const x0 = x + c * m;
      const y0 = y + r * m;
      const x1 = x0 + m;
      const y1 = y0 + m;
      parts.push(`M${round(x0 + k)} ${round(y0)}H${round(x1 - k)}L${round(x1)} ${round(y0 + k)}V${round(y1 - k)}L${round(x1 - k)} ${round(y1)}H${round(x0 + k)}L${round(x0)} ${round(y1 - k)}V${round(y0 + k)}Z`);
    }
  }
  for (const [fr, fc] of [[0, 0], [0, n - 7], [n - 7, 0]] as const) {
    const fx = x + fc * m;
    const fy = y + fr * m;
    const square = (sx: number, sy: number, s: number, reverse = false) =>
      reverse
        ? `M${round(sx)} ${round(sy)}V${round(sy + s)}H${round(sx + s)}V${round(sy)}Z`
        : `M${round(sx)} ${round(sy)}H${round(sx + s)}V${round(sy + s)}H${round(sx)}Z`;
    parts.push(square(fx, fy, 7 * m), square(fx + m, fy + m, 5 * m, true), square(fx + 2 * m, fy + 2 * m, 3 * m));
  }
  return parts.join('');
}

/** Renders the card front and reads its QR code back; a broken code stops the run. */
function assertQrReadable(svg: string, expected: string): void {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1600 }, font: { loadSystemFonts: false, fontFiles: fontPaths } });
  const image = resvg.render();
  const result = jsQR(new Uint8ClampedArray(image.pixels), image.width, image.height);
  if (result?.data !== expected) throw new Error(`QR code is not readable (read: ${result?.data ?? 'nothing'})`);
}

// ---- Business card -----------------------------------------------------------------------------------------------

/** Wraps trim-space content (0…90 × 0…50) into the bled canvas. */
function onCard(content: string): string {
  return `<g transform="translate(${CARD.bleed} ${CARD.bleed})">${content}</g>`;
}

async function cardFront(): Promise<string> {
  const W = CARD.width + CARD.bleed * 2;
  const H = CARD.height + CARD.bleed * 2;
  const content = [
    mark(6, 6, 9, { body: INK, dot: color.accent }),
    text({ x: 84, y: 7.225, text: brand.expertise.toLocaleUpperCase('tr-TR'), font: 'IBM Plex Mono/500', size: 1.75, fill: INK, anchor: 'end', tracking: 0.12 }),
    text({ x: 6, y: 27.5, text: brand.founder.name.toLocaleUpperCase('tr-TR'), font: 'Archivo/600', size: 3.6, fill: INK, tracking: 0.08 }),
    text({ x: 6, y: 31.6, text: brand.founder.role.toLocaleUpperCase('tr-TR'), font: 'IBM Plex Mono/500', size: 1.9, fill: INK, tracking: 0.14 }),
    text({ x: 6, y: 37, text: 'TELEFON · WHATSAPP', font: 'IBM Plex Mono/500', size: 1.6, fill: INK, tracking: 0.14 }),
    text({ x: 6, y: 40.5, text: brand.phone, font: 'IBM Plex Mono/500', size: 2.5, fill: INK, tracking: 0.02 }),
    text({ x: 6, y: 44, text: brand.web, font: 'IBM Plex Mono/500', size: 2.15, fill: INK, tracking: 0.02 }),
    `<path fill="${INK}" fill-rule="evenodd" d="${qrPath(brand.whatsappUrl.toUpperCase(), 70, 25.03, 14)}"/>`,
    text({ x: 84, y: 44, text: 'WHATSAPP', font: 'IBM Plex Mono/500', size: 1.6, fill: INK, anchor: 'end', tracking: 0.14 }),
  ].join('');
  const svg = await svgDocument({
    width: W,
    height: H,
    unit: 'mm',
    title: 'Kartvizit ön · 90 × 50 mm + 3 mm taşma',
    body: `<rect width="${W}" height="${H}" fill="${PAPER}"/>${onCard(content)}`,
  });
  assertQrReadable(svg, brand.whatsappUrl.toUpperCase());
  return svg;
}

/** Card back on the band: glow, dot grid, the tile lockup and the supergraphic rising from the bottom edge. */
async function cardBack(): Promise<string> {
  const W = CARD.width + CARD.bleed * 2;
  const H = CARD.height + CARD.bleed * 2;
  const sgHeight = 40;
  const back = bandBackdrop({
    width: CARD.width,
    height: CARD.height,
    bleed: CARD.bleed,
    glows: [{ cx: 8, cy: 4, r: 46 }, { cx: 84, cy: 16, r: 34 }],
    dots: { pitch: 1.6, radius: 0.12, fade: 'left' },
    supergraphic: { x: CARD.width - sgHeight * ratio.mark - 7, y: 15, height: sgHeight, stroke: 0.35 },
  });
  const tileSize = 10;
  const content = [
    back.body,
    lockup(7, 7, tileSize, 'band'),
    text({ x: 7, y: 44, text: brand.web, font: 'IBM Plex Mono/500', size: 2.15, fill: color.bandText2, tracking: 0.02 }),
  ].join('');
  return svgDocument({ width: W, height: H, unit: 'mm', title: 'Kartvizit arka · bant · 90 × 50 mm + 3 mm taşma', defs: back.defs, body: onCard(content) });
}

// ---- Letterhead ----------------------------------------------------------------------------------------------

function foldMarks(): string {
  return [105, 148.5, 210].map(y => `<line x1="0" y1="${y}" x2="${y === 148.5 ? 7 : 5}" y2="${y}" stroke="${INK}" stroke-width="0.2"/>`).join('');
}

async function letterheadFirst(): Promise<string> {
  const body = [
    `<rect width="210" height="297" fill="${PAPER}"/>`,
    horizontalLogo(20, 17, 9, { body: INK, dot: color.accent }),
    text({ x: 190, y: 26, text: brand.web, font: 'IBM Plex Mono/500', size: 2.6, fill: INK, anchor: 'end' }),
    `<line x1="20" y1="34" x2="190" y2="34" stroke="${INK}" stroke-width="0.2"/>`,
    `<line x1="20" y1="268.5" x2="190" y2="268.5" stroke="${INK}" stroke-width="0.2"/>`,
    ...[
      [20, 'TELEFON / WHATSAPP', brand.phone],
      [76.67, 'WEB', brand.web],
      [133.33, 'UZMANLIK', 'Yazılım · Yapay zekâ · Siber güvenlik'],
    ].flatMap(([x, label, value]) => [
      text({ x: x as number, y: 275, text: label as string, font: 'IBM Plex Mono/500', size: 1.9, fill: INK, tracking: 0.12 }),
      text({ x: x as number, y: 280.2, text: value as string, font: 'Inter/500', size: 2.5, fill: INK }),
    ]),
    foldMarks(),
  ].join('');
  return svgDocument({ width: 210, height: 297, unit: 'mm', title: 'Antetli kâğıt · A4 · ilk sayfa', body });
}

async function letterheadNext(): Promise<string> {
  const body = [
    `<rect width="210" height="297" fill="${PAPER}"/>`,
    mark(20, 15, 7, { body: INK, dot: color.accent }),
    text({ x: 190, y: 22, text: brand.web, font: 'IBM Plex Mono/500', size: 1.9, fill: INK, anchor: 'end', tracking: 0.12 }),
    `<line x1="20" y1="28" x2="190" y2="28" stroke="${INK}" stroke-width="0.2"/>`,
    `<line x1="20" y1="278" x2="190" y2="278" stroke="${INK}" stroke-width="0.2"/>`,
    text({ x: 20, y: 284, text: 'HAN DİJİT', font: 'IBM Plex Mono/500', size: 1.9, fill: INK, tracking: 0.12 }),
    text({ x: 190, y: 284, text: brand.phone, font: 'IBM Plex Mono/500', size: 1.9, fill: INK, anchor: 'end', tracking: 0.12 }),
    foldMarks(),
  ].join('');
  return svgDocument({ width: 210, height: 297, unit: 'mm', title: 'Antetli kâğıt · A4 · devam sayfası', body });
}

// ---- Sticker -------------------------------------------------------------------------------------------------

/** 60 × 60 mm die-cut sticker: band ground to the bleed edge, white mark with the coral dot. */
async function sticker(): Promise<string> {
  const S = STICKER.size;
  const b = STICKER.bleed;
  const back = bandBackdrop({ width: S, height: S, bleed: b, glows: [{ cx: S * 0.28, cy: S * 0.18, r: S * 0.8 }] });
  const h = S * 0.5723;
  const content = `${back.body}${mark((S - h * ratio.mark) / 2, (S - h) / 2, h, { body: color.bandText, dot: color.accent })}`;
  return svgDocument({ width: S + b * 2, height: S + b * 2, unit: 'mm', title: 'Sticker · 60 × 60 mm + 2 mm taşma', defs: back.defs, body: `<g transform="translate(${b} ${b})">${content}</g>` });
}

/** Page 2 of the sticker PDF: the die line, for the printer's cutting plotter. */
async function stickerCutLine(): Promise<string> {
  const S = STICKER.size;
  const b = STICKER.bleed;
  const body = [
    `<rect width="${S + b * 2}" height="${S + b * 2}" fill="${PAPER}"/>`,
    `<rect x="${b}" y="${b}" width="${S}" height="${S}" rx="${round(STICKER.radius)}" fill="none" stroke="${INK}" stroke-width="0.25"/>`,
    text({ x: (S + b * 2) / 2, y: 30.5, text: 'KESİM HATTI', font: 'IBM Plex Mono/500', size: 1.6, fill: INK, anchor: 'middle', tracking: 0.12 }),
    text({ x: (S + b * 2) / 2, y: 34, text: `60 × 60 mm · r = ${round(STICKER.radius, 2).toString().replace('.', ',')} mm · 2 mm taşma`, font: 'IBM Plex Mono/500', size: 1.3, fill: INK, anchor: 'middle', tracking: 0.04 }),
  ].join('');
  return svgDocument({ width: S + b * 2, height: S + b * 2, unit: 'mm', title: 'Sticker kesim hattı', body });
}

export type PrintPreviews = Record<'cardFront' | 'cardBack' | 'letterheadFirst' | 'letterheadNext' | 'sticker', string>;

export async function buildPrint(): Promise<PrintPreviews> {
  const source = path.join(dir.print, 'kaynak');
  const cw = CARD.width + CARD.bleed * 2;
  const ch = CARD.height + CARD.bleed * 2;
  const front = await cardFront();
  const back = await cardBack();
  write(path.join(source, 'kartvizit-on.svg'), front);
  write(path.join(source, 'kartvizit-arka.svg'), back);
  write(
    path.join(dir.print, 'kartvizit-90x50-baski.pdf'),
    await assemblePdf(await pdfPages([{ svg: front, width: cw, height: ch }, { svg: back, width: cw, height: ch }]), { title: 'Han Dijit kartvizit 90 × 50 mm', trimInset: CARD.bleed }),
  );

  const first = await letterheadFirst();
  const next = await letterheadNext();
  write(path.join(source, 'antetli-kagit-a4-ilk-sayfa.svg'), first);
  write(path.join(source, 'antetli-kagit-a4-devam-sayfasi.svg'), next);
  write(
    path.join(dir.print, 'antetli-kagit-a4-baski.pdf'),
    await assemblePdf(await pdfPages([{ svg: first, width: 210, height: 297 }, { svg: next, width: 210, height: 297 }]), { title: 'Han Dijit antetli kâğıt A4' }),
  );

  const art = await sticker();
  const cut = await stickerCutLine();
  const ss = STICKER.size + STICKER.bleed * 2;
  write(path.join(source, 'sticker-60x60.svg'), art);
  write(
    path.join(dir.print, 'sticker-60x60-baski.pdf'),
    await assemblePdf(await pdfPages([{ svg: art, width: ss, height: ss }, { svg: cut, width: ss, height: ss }]), { title: 'Han Dijit sticker 60 × 60 mm', trimInset: STICKER.bleed }),
  );

  // The band back replaces the white and the black back of guide 3.0.
  for (const old of ['kaynak/kartvizit-arka-beyaz.svg', 'kaynak/kartvizit-arka-siyah.svg', 'kartvizit-siyah-arka-90x50-baski.pdf']) {
    rmSync(path.join(dir.print, old), { force: true });
  }

  // Previews for the guide (SVG), trimmed to the finished size.
  const trimmed = (svg: string, bleed: number, w: number, h: number) =>
    svg.replace(/viewBox="[^"]*"/, `viewBox="${bleed} ${bleed} ${w} ${h}"`).replace(/width="[^"]*mm" height="[^"]*mm"/, `width="${w}mm" height="${h}mm"`);
  return {
    cardFront: trimmed(front, CARD.bleed, CARD.width, CARD.height),
    cardBack: trimmed(back, CARD.bleed, CARD.width, CARD.height),
    letterheadFirst: first,
    letterheadNext: next,
    sticker: trimmed(art, STICKER.bleed, STICKER.size, STICKER.size).replace('<g transform', `<clipPath id="die"><rect x="0" y="0" width="${STICKER.size}" height="${STICKER.size}" rx="${round(STICKER.radius)}"/></clipPath><g clip-path="url(#die)" transform`),
  };
}

