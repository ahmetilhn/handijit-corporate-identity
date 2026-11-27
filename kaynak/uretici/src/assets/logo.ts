import { rmSync } from 'node:fs';
import path from 'node:path';

import { lockup, lockupWidth, tile } from '../brand.ts';
import { dir } from '../config.ts';
import { verticalLogo } from '../geometry.ts';
import { assemblePdf, pdfPages, png, write } from '../render.ts';
import { round } from '../svg.ts';
import { color, logos } from '../tokens.ts';

// Colour logos for 01-logo: body in ink (or white on cobalt) and the dot in coral, plus the cobalt app icon and the
// tile lockup of the website header. The black and white masters stay as they are for one-colour use.
//
// The J of DİJİT reaches a little below the baseline of the official drawing (its viewBox clips it), so the files
// here use the drawing's real bounds.

type Drawing = { width: number; height: number; paths: (paint: { body: string; dot: string }) => string };

const drawings: Record<'isaret' | 'logo-yatay' | 'logo-dikey', Drawing> = {
  isaret: {
    width: logos.mark.width,
    height: logos.mark.height,
    paths: p => `<path fill="${p.body}" d="${logos.mark.body}"/><path fill="${p.dot}" d="${logos.mark.dot}"/>`,
  },
  'logo-yatay': {
    width: logos.horizontal.width,
    height: 1122,
    paths: p => `<path fill="${p.body}" d="${logos.horizontal.body}"/><path fill="${p.dot}" d="${logos.horizontal.dot}"/>`,
  },
  'logo-dikey': {
    width: 2439.732,
    height: 1803.4,
    paths: p => `<path fill="${p.body}" d="${verticalLogo.body}"/><path fill="${p.dot}" d="${verticalLogo.dot}"/>`,
  },
};

const variants = {
  renkli: { body: color.ink, dot: color.accent, label: 'renkli, açık zemin' },
  'renkli-negatif': { body: color.onSurface, dot: color.accent, label: 'renkli, kobalt zemin' },
} as const;

/** PNG long side (as the masters) and PDF long side in mm. */
const PNG_LONG_SIDE = 2400;
const PDF_LONG_SIDE_MM = 80;

function fileSvg(width: number, height: number, title: string, content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${round(width)}" height="${round(height)}" viewBox="0 0 ${round(width)} ${round(height)}"><title>${title}</title>${content}</svg>\n`;
}

async function emit(name: string, width: number, height: number, svg: string, { pdf = true } = {}): Promise<void> {
  write(path.join(dir.logo, 'svg', `${name}.svg`), svg);
  const pngWidth = width >= height ? PNG_LONG_SIDE : Math.round((PNG_LONG_SIDE * width) / height);
  write(path.join(dir.logo, 'png', `${name}.png`), png(svg, pngWidth));
  if (pdf) {
    const mmW = width >= height ? PDF_LONG_SIDE_MM : (PDF_LONG_SIDE_MM * width) / height;
    const mmH = (mmW * height) / width;
    const parts = await pdfPages([{ svg, width: round(mmW, 2), height: round(mmH, 2) }]);
    write(path.join(dir.logo, 'pdf', `${name}.pdf`), await assemblePdf(parts, { title: `Han Dijit ${name}` }));
  }
}

export async function buildLogo(): Promise<Record<string, string>> {
  const svgs: Record<string, string> = {};
  for (const [form, drawing] of Object.entries(drawings)) {
    for (const [variant, paint] of Object.entries(variants)) {
      const name = `${form}-${variant}`;
      const svg = fileSvg(drawing.width, drawing.height, `Han Dijit ${form} ${paint.label}`, drawing.paths(paint));
      svgs[name] = svg;
      await emit(name, drawing.width, drawing.height, svg);
    }
  }

  // Tile lockup (website header): cobalt tile + ink wordmark on light grounds, cobalt 800 tile + white on cobalt.
  const T = 1000;
  const lockW = lockupWidth(T);
  // The DİJİT J reaches 0.54% of the wordmark height below its box; the tile defines the height anyway.
  for (const [variant, on, label] of [['renkli', 'paper', 'açık zemin'], ['negatif', 'cobalt', 'kobalt zemin']] as const) {
    const name = `logo-karo-${variant}`;
    const svg = fileSvg(lockW, T, `Han Dijit karo logo · ${label}`, lockup(0, 0, T, on));
    svgs[name] = svg;
    await emit(name, lockW, T, svg);
  }

  // App icon on the cobalt tile: white mark, coral dot (as the favicon set).
  const icon = fileSvg(1024, 1024, 'Han Dijit uygulama ikonu · kobalt', tile(0, 0, 1024, color.primary, 0.6));
  svgs['uygulama-ikonu-kobalt'] = icon;
  write(path.join(dir.logo, 'svg', 'uygulama-ikonu-kobalt.svg'), icon);
  write(path.join(dir.logo, 'png', 'uygulama-ikonu-kobalt.png'), png(icon, 1024));
  for (const old of ['svg/uygulama-ikonu-bant.svg', 'png/uygulama-ikonu-bant.png']) rmSync(path.join(dir.logo, old), { force: true });
  return svgs;
}
