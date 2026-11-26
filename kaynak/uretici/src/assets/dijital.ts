import { rmSync } from 'node:fs';
import path from 'node:path';

import {
  bandBackdrop,
  button,
  buttonWidth,
  eyebrow,
  eyebrowHeight,
  factsStrip,
  heading,
  headingHeight,
  lockup,
  lockupWidth,
  mark,
  ratio,
} from '../brand.ts';
import { brand, dir } from '../config.ts';
import { HEADING } from '../brand.ts';
import { wrap } from '../fonts.ts';
import { getBrowser, png, write } from '../render.ts';
import { round, svgDocument, text } from '../svg.ts';
import { color, logos } from '../tokens.ts';

// Screen assets on the brand band. Each composition keeps its meaning (logo, eyebrow, heading, button) inside the
// part every crop of its platform keeps; the edges carry only the glow, the dot grid and the supergraphic.

type Asset = { name: string; width: number; height: number; title: string; defs: string; body: string };

/** Vertically centres a stack of blocks between two lines; returns the top of each block. */
function stack(top: number, bottom: number, blocks: { height: number; gap?: number }[]): number[] {
  const total = blocks.reduce((sum, b) => sum + b.height + (b.gap ?? 0), 0);
  let cursor = top + (bottom - top - total) / 2;
  return blocks.map(b => {
    cursor += b.gap ?? 0;
    const at = cursor;
    cursor += b.height;
    return at;
  });
}

function titleSize(title: string): number {
  if (title.length <= 18) return 80;
  if (title.length <= 30) return 68;
  if (title.length <= 44) return 58;
  return 50;
}

/** OG 1200×630: the website's share image (home), meaning inside the centre 630×630 square. */
function og(): Asset {
  const W = 1200;
  const H = 630;
  const FOOTER = 92;
  const SAFE = H;
  const contentWidth = SAFE - 40;
  const sgHeight = 440;
  const back = bandBackdrop({
    width: W,
    height: H,
    glows: [{ cx: 120, cy: 110, r: 420 }, { cx: W - 110, cy: 150, r: 380 }],
    dots: { pitch: 22, radius: 1.6, fade: 'sides', area: { x: 0, y: 0, width: W, height: H - FOOTER } },
    supergraphic: { x: W - sgHeight * ratio.mark - 12, y: 168, height: sgHeight, stroke: 4 },
  });
  const size = titleSize(brand.heroTitle);
  const lines = wrap(brand.heroTitle, HEADING.font, size, contentWidth - size * 0.3, HEADING.tracking);
  const [eyeTop, titleTop, buttonTop] = stack(40 + 52, H - FOOTER - 28, [
    { height: eyebrowHeight(17) },
    { height: headingHeight(lines.length, size), gap: 22 },
    { height: 54, gap: 30 },
  ]) as [number, number, number];
  const btnW = buttonWidth(54, brand.cta);
  const body = [
    back.body,
    lockup(W / 2 - lockupWidth(52) / 2, 40, 52, 'band'),
    eyebrow({ x: W / 2, top: eyeTop, size: 17, label: `${brand.name} · ${brand.descriptor}`, align: 'center' }),
    heading({ x: W / 2, top: titleTop, size, title: brand.heroTitle, maxWidth: contentWidth, align: 'center', lines }).svg,
    button(W / 2 - btnW / 2, buttonTop, 54, brand.cta).svg,
    factsStrip({ y: H - FOOTER, width: W, height: FOOTER, facts: brand.facts, scale: 1 }),
  ].join('');
  return { name: 'og-gorsel-1200x630', width: W, height: H, title: 'Han Dijit · OG görseli 1200 × 630', defs: back.defs, body };
}

/** Social post 1080×1080: left-aligned poster, supergraphic rising from behind the facts strip. */
function post(): Asset {
  const W = 1080;
  const H = 1080;
  const FOOTER = 150;
  // The profile grid shows posts at 3:4 and trims 135 px from each side: the content starts inside that.
  const M = 144;
  const s = 1.6;
  const sgHeight = 620;
  const sgWidth = sgHeight * ratio.mark;
  const back = bandBackdrop({
    width: W,
    height: H,
    glows: [{ cx: 140, cy: 120, r: 620 }, { cx: W - 120, cy: 420, r: 560 }],
    dots: { pitch: 30, radius: 2.2, fade: 'top-left', area: { x: 0, y: 0, width: W, height: H - FOOTER } },
    supergraphic: { x: W - sgWidth - 40, y: 372, height: sgHeight, stroke: 6 },
  });
  const size = 96;
  const lines = ['İşinize özel', 'yazılım', 'çözümleri'];
  const [eyeTop, titleTop, buttonTop] = stack(M + 76, H - FOOTER - 60, [
    { height: eyebrowHeight(26) },
    { height: headingHeight(lines.length, size), gap: 34 },
    { height: 84, gap: 52 },
  ]) as [number, number, number];
  const body = [
    back.body,
    lockup(M, M, 76, 'band'),
    eyebrow({ x: M, top: eyeTop, size: 26, label: `${brand.name} · ${brand.descriptor}`, align: 'start' }),
    heading({ x: M, top: titleTop, size, title: brand.heroTitle, maxWidth: 520, align: 'start', lines }).svg,
    button(M, buttonTop, 84, brand.cta).svg,
    factsStrip({ y: H - FOOTER, width: W, height: FOOTER, facts: brand.facts, scale: s }),
  ].join('');
  return { name: 'sosyal-gonderi-1080x1080', width: W, height: H, title: 'Han Dijit · sosyal gönderi 1080 × 1080', defs: back.defs, body };
}

/**
 * Story / WhatsApp status 1080×1920. The top 250 px (progress bar, account) and the bottom 340 px (reply bar)
 * belong to the app: they carry only the backdrop and the supergraphic, which rises from the bottom edge.
 */
function story(): Asset {
  const W = 1080;
  const H = 1920;
  const SAFE_TOP = 250;
  const M = 96;
  const sgHeight = 1000;
  const sgWidth = sgHeight * ratio.mark;
  const back = bandBackdrop({
    width: W,
    height: H,
    glows: [{ cx: 120, cy: 260, r: 760 }, { cx: W - 80, cy: 1080, r: 680 }],
    dots: { pitch: 30, radius: 2.2, fade: 'top' },
    supergraphic: { x: W - sgWidth - 24, y: 1150, height: sgHeight, stroke: 7 },
  });
  const size = 132;
  const lines = ['Projenizi', 'konuşalım'];
  const bodySize = 38;
  const bodyLines = wrap('Yazılım, yapay zekâ ve siber güvenlik projeleri için WhatsApp’tan yazın.', 'Inter/500', bodySize, W - M * 2 - 80);
  const blocks = [
    { height: eyebrowHeight(28) },
    { height: headingHeight(lines.length, size), gap: 40 },
    { height: bodyLines.length * bodySize * 1.4, gap: 40 },
    { height: 66, gap: 40 },
    { height: 96, gap: 56 },
  ];
  const [eyeTop, titleTop, bodyTop, phoneTop, buttonTop] = stack(SAFE_TOP + 50 + 90 + 50, 1205, blocks) as [number, number, number, number, number];
  const body = [
    back.body,
    lockup(M, SAFE_TOP + 50, 90, 'band'),
    eyebrow({ x: M, top: eyeTop, size: 28, label: `Telefon · WhatsApp`, align: 'start' }),
    heading({ x: M, top: titleTop, size, title: lines.join(' '), maxWidth: W - M * 2, align: 'start', lines }).svg,
    bodyLines.map((line, i) => text({ x: M, y: bodyTop + i * bodySize * 1.4 + bodySize * 1.08, text: line, font: 'Inter/500', size: bodySize, fill: color.bandText2 })).join(''),
    text({ x: M, y: phoneTop + 48, text: brand.phone, font: 'Archivo/600', size: 60, fill: color.bandText, tracking: -0.01 }),
    button(M, buttonTop, 96, brand.cta).svg,
  ].join('');
  return { name: 'hikaye-durum-1080x1920', width: W, height: H, title: 'Han Dijit · hikâye ve WhatsApp durum 1080 × 1920', defs: back.defs, body };
}

/**
 * LinkedIn company/profile cover 1584×396. The profile photo covers the lower left (about 0–520 px) and the
 * mobile app trims the sides: the message sits between 560 and 1300 px, centred vertically.
 */
function linkedin(): Asset {
  const W = 1584;
  const H = 396;
  const X = 560;
  const sgHeight = 340;
  const back = bandBackdrop({
    width: W,
    height: H,
    glows: [{ cx: 220, cy: 80, r: 520 }, { cx: W - 160, cy: 120, r: 420 }],
    dots: { pitch: 22, radius: 1.6, fade: 'left' },
    supergraphic: { x: W - sgHeight * ratio.mark - 80, y: 96, height: sgHeight, stroke: 4 },
  });
  const size = 54;
  const lines = ['İşinize özel yazılım çözümleri'];
  const factLine = '6 yıl tecrübe · 50+ proje · 81 il · 1 iş günü teklif dönüşü';
  const [eyeTop, titleTop, factTop] = stack(0, H, [
    { height: eyebrowHeight(16) },
    { height: headingHeight(1, size), gap: 18 },
    { height: 16 * 1.45, gap: 22 },
  ]) as [number, number, number];
  const body = [
    back.body,
    eyebrow({ x: X, top: eyeTop, size: 16, label: brand.expertise, align: 'start' }),
    heading({ x: X, top: titleTop, size, title: lines[0]!, maxWidth: 900, align: 'start', lines }).svg,
    text({ x: X, y: factTop + 16 * 1.08, text: factLine.toLocaleUpperCase('tr-TR'), font: 'IBM Plex Mono/500', size: 15, fill: color.bandText2, tracking: 0.12 }),
  ].join('');
  return { name: 'linkedin-kapak-1584x396', width: W, height: H, title: 'Han Dijit · LinkedIn kapak 1584 × 396', defs: back.defs, body };
}

/** GitHub social preview 1280×640: the OG layout, meaning inside the centre 640×640 square, no button. */
function github(): Asset {
  const W = 1280;
  const H = 640;
  const FOOTER = 96;
  const contentWidth = 600;
  const sgHeight = 450;
  const back = bandBackdrop({
    width: W,
    height: H,
    glows: [{ cx: 130, cy: 110, r: 440 }, { cx: W - 120, cy: 150, r: 400 }],
    dots: { pitch: 22, radius: 1.6, fade: 'sides', area: { x: 0, y: 0, width: W, height: H - FOOTER } },
    supergraphic: { x: W - sgHeight * ratio.mark - 20, y: 170, height: sgHeight, stroke: 4 },
  });
  const size = 68;
  const lines = wrap(brand.heroTitle, HEADING.font, size, contentWidth - size * 0.3, HEADING.tracking);
  const [eyeTop, titleTop] = stack(44 + 56, H - FOOTER - 20, [
    { height: eyebrowHeight(17) },
    { height: headingHeight(lines.length, size), gap: 24 },
  ]) as [number, number];
  const body = [
    back.body,
    lockup(W / 2 - lockupWidth(56) / 2, 44, 56, 'band'),
    eyebrow({ x: W / 2, top: eyeTop, size: 17, label: brand.github, align: 'center', uppercase: false }),
    heading({ x: W / 2, top: titleTop, size, title: brand.heroTitle, maxWidth: contentWidth, align: 'center', lines }).svg,
    factsStrip({ y: H - FOOTER, width: W, height: FOOTER, facts: brand.facts, scale: 1.02 }),
  ].join('');
  return { name: 'github-banner-1280x640', width: W, height: H, title: 'Han Dijit · GitHub sosyal önizleme 1280 × 640', defs: back.defs, body };
}

/**
 * Meeting background 1920×1080. The speaker sits in the middle third: the lockup goes top left, the
 * supergraphic rises at the right edge behind the shoulder line. Video apps mirror only the self-view.
 */
function meeting(): Asset {
  const W = 1920;
  const H = 1080;
  const sgHeight = 760;
  const back = bandBackdrop({
    width: W,
    height: H,
    glows: [{ cx: 220, cy: 160, r: 760 }, { cx: W - 260, cy: 420, r: 700 }],
    dots: { pitch: 28, radius: 2, fade: 'sides' },
    supergraphic: { x: W - sgHeight * ratio.mark - 140, y: 420, height: sgHeight, stroke: 6 },
  });
  const body = [
    back.body,
    lockup(110, 96, 84, 'band'),
    eyebrow({ x: 110, top: H - 140, size: 22, label: brand.web, align: 'start', uppercase: false }),
  ].join('');
  return { name: 'toplanti-arka-plani-1920x1080', width: W, height: H, title: 'Han Dijit · toplantı arka planı 1920 × 1080', defs: back.defs, body };
}

/**
 * Profile image 400×400: every platform crops it to a circle, so the mark stays well inside the inscribed
 * circle (mark height 50%); the full square is the band, as a full-bleed app icon.
 */
function profile(): Asset {
  const S = 400;
  const back = bandBackdrop({ width: S, height: S, glows: [{ cx: S * 0.3, cy: S * 0.2, r: S * 0.75 }] });
  const h = S * 0.5;
  const body = `${back.body}${mark((S - h * ratio.mark) / 2, (S - h) / 2, h, { body: color.bandText, dot: color.accent })}`;
  return { name: 'profil-gorseli-400x400', width: S, height: S, title: 'Han Dijit · profil görseli 400 × 400', defs: back.defs, body };
}

// ---- Favicon set (identical to the website's src/app/icon.svg and public/brand icons) ------------------------

const FAVICON_RADIUS = 8.845 / 32;

function iconSvg(size: number, { fullBleed = false, markRatio = 0.6 } = {}): string {
  const radius = fullBleed ? 0 : size * FAVICON_RADIUS;
  const { width, height, body, dot } = logos.mark;
  const scale = (size * markRatio) / height;
  const x = (size - width * scale) / 2;
  const y = (size - height * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${round(radius)}" fill="${color.band}"/><g transform="translate(${round(x)} ${round(y)}) scale(${round(scale, 6)})"><path fill="${color.bandText}" d="${body}"/><path fill="${color.accent}" d="${dot}"/></g></svg>`;
}

/** ICO container with PNG entries (every current browser reads PNG-in-ICO). */
function ico(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png: data }, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size, entry);
    header.writeUInt8(size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(image => image.png)]);
}

/** Small sizes are rasterised by Chromium, as on the website, so the 16 px tab icon gets the same hinting. */
async function chromiumPng(svg: string, size: number, transparent: boolean): Promise<Buffer> {
  const page = await (await getBrowser()).newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`);
  const shot = await page.screenshot({ omitBackground: transparent, type: 'png' });
  await page.close();
  return shot;
}

async function favicons(): Promise<void> {
  const out = path.join(dir.digital, 'favicon');
  write(path.join(out, 'favicon.svg'), `${iconSvg(32)}\n`);
  write(path.join(out, 'favicon.ico'), ico(await Promise.all([16, 32, 48].map(async size => ({ size, png: await chromiumPng(iconSvg(size), size, true) })))));
  write(path.join(out, 'apple-touch-icon.png'), await chromiumPng(iconSvg(180, { fullBleed: true }), 180, false));
  write(path.join(out, 'icon-192.png'), await chromiumPng(iconSvg(192), 192, true));
  write(path.join(out, 'icon-512.png'), await chromiumPng(iconSvg(512), 512, true));
  write(path.join(out, 'icon-maskable-512.png'), await chromiumPng(iconSvg(512, { fullBleed: true, markRatio: 0.46 }), 512, false));
  write(
    path.join(out, 'site.webmanifest'),
    `${JSON.stringify(
      {
        name: 'Han Dijit',
        short_name: 'Han Dijit',
        lang: 'tr',
        start_url: '/',
        display: 'standalone',
        background_color: color.paper,
        theme_color: color.band,
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      null,
      2,
    )}\n`,
  );
  write(
    path.join(out, 'head-etiketleri.html'),
    [
      '<link rel="icon" href="/favicon.ico" sizes="48x48">',
      '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
      '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
      '<link rel="manifest" href="/site.webmanifest">',
      `<meta name="theme-color" content="${color.band}">`,
      '',
    ].join('\n'),
  );
}

export const digitalAssets = [og, linkedin, post, story, profile, github, meeting];

// Files of guide 3.0 that the band set replaces (black variants, the 4:5 post, the two flat profile images).
const RETIRED = [
  'hikaye-durum-1080x1920-siyah',
  'sosyal-gonderi-1080x1350',
  'sosyal-gonderi-1080x1350-siyah',
  'profil-gorseli-beyaz',
  'profil-gorseli-siyah',
];

export type DigitalAsset = { name: string; width: number; height: number; svg: string };

export async function buildDigital(): Promise<DigitalAsset[]> {
  const assets: DigitalAsset[] = [];
  for (const build of digitalAssets) {
    const asset = build();
    const svg = await svgDocument({ width: asset.width, height: asset.height, title: asset.title, defs: asset.defs, body: asset.body });
    write(path.join(dir.digital, 'svg', `${asset.name}.svg`), svg);
    write(path.join(dir.digital, 'png', `${asset.name}.png`), png(svg));
    assets.push({ name: asset.name, width: asset.width, height: asset.height, svg });
  }
  for (const name of RETIRED) {
    rmSync(path.join(dir.digital, 'svg', `${name}.svg`), { force: true });
    rmSync(path.join(dir.digital, 'png', `${name}.png`), { force: true });
  }
  await favicons();
  return assets;
}

export function faviconSvg(size: number): string {
  return iconSvg(size);
}

