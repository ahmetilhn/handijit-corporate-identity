import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import subsetFont from 'subset-font';

import { cobaltBackdrop, eyebrow, heading, lockup, lockupWidth, ratio, supergraphicMark } from '../brand.ts';
import { brand, dir, GUIDE_DATE, GUIDE_VERSION, ROOT } from '../config.ts';
import { FONT_FILES, type FontKey } from '../fonts.ts';
import { verticalLogo } from '../geometry.ts';
import { assemblePdf, getBrowser, write } from '../render.ts';
import { esc, round, svgDocument, text } from '../svg.ts';
import { cobalt, color, coral, ink, logos, tint } from '../tokens.ts';

/** An opacity written as a Turkish percentage (0.06 → "%6"). */
const pct = (alpha: number): string => `%${Math.round(alpha * 100)}`;
import { contrast, hexToOklch } from '@handijitcom/ui/design';
import type { DigitalAsset } from './dijital.ts';
import type { PrintPreviews } from './basili.ts';
import type { SlidePreviews } from './sunum.ts';

// The corporate identity guide (00-kilavuz): one self-contained HTML file (fonts, drawings and previews inline)
// and its A4 PDF, printed by Chromium. Text is Turkish; every colour, drawing and preview comes from the same
// tokens and builders as the assets, so the guide cannot drift from the files it shows.

type Inputs = { logos: Record<string, string>; digital: DigitalAsset[]; print: PrintPreviews; slides: SlidePreviews };

const uri = (data: Buffer, type = 'image/png') => `data:${type};base64,${data.toString('base64')}`;
const svgUri = (svg: string) => uri(Buffer.from(svg), 'image/svg+xml');
const input = (file: string) => readFileSync(path.join(dir.inputs, file));

function figure(src: string, alt: string, caption: string, cls = ''): string {
  return `<figure class="figure ${cls}"><img src="${src}" alt="${esc(alt)}"><figcaption class="lbl">${caption}</figcaption></figure>`;
}

const cdot = `<svg class="cdot" aria-hidden="true" viewBox="0 0 170.82 170.82"><path fill="currentColor" d="M40.325 0 L130.495 0 L170.82 40.325 L170.82 130.495 L130.495 170.82 L40.325 170.82 L0 130.495 L0 40.325 Z"/></svg>`;
const stop = '<span class="stop">.</span>';

function inlineLogo(kind: 'mark' | 'horizontal' | 'vertical', height: number, body: string, dot: string, label: string): string {
  const d = kind === 'mark' ? logos.mark : kind === 'horizontal' ? logos.horizontal : { viewBox: verticalLogo.viewBox, body: verticalLogo.body, dot: verticalLogo.dot };
  return `<svg class="lg" role="img" aria-label="${esc(label)}" viewBox="${d.viewBox}" overflow="visible" style="height:${height}px;width:auto"><path fill="${body}" d="${d.body}"/><path fill="${dot}" d="${d.dot}"/></svg>`;
}

function lockupInline(height: number, on: 'cobalt' | 'paper'): string {
  const w = lockupWidth(1000);
  return `<svg class="lg" role="img" aria-label="Han Dijit karo logo" viewBox="0 0 ${round(w)} 1000" style="height:${height}px;width:auto">${lockup(0, 0, 1000, on)}</svg>`;
}

// ---- Diagrams --------------------------------------------------------------------------------------------------

/** The cobalt surface built up layer by layer (OG geometry, 600 px wide). */
async function layerSteps(): Promise<string[]> {
  const W = 1200;
  const H = 630;
  const sg = { x: W - 440 * ratio.mark - 12, y: 168, height: 440, stroke: 4 };
  const glows = [{ cx: 60, cy: 40, r: 300 }, { cx: W - 60, cy: 100, r: 330 }];
  const dots = { pitch: 22, radius: 1.6, fade: 'sides' as const, area: { x: 0, y: 0, width: W, height: H - 92 } };
  const steps = [
    cobaltBackdrop({ width: W, height: H }),
    cobaltBackdrop({ width: W, height: H, glows }),
    cobaltBackdrop({ width: W, height: H, glows, dots }),
    cobaltBackdrop({ width: W, height: H, glows, dots, supergraphic: sg }),
  ];
  const out: string[] = [];
  for (const step of steps) {
    out.push(svgUri(await svgDocument({ width: W, height: H, title: 'Kobalt yüzey katmanı', defs: step.defs, body: step.body, embedFonts: false })));
  }
  return out;
}

/** Four placements of the supergraphic: bleeding off the bottom or the left side is right, cutting the dot is not. */
async function supergraphicCases(): Promise<{ src: string; ok: boolean; caption: string }[]> {
  const W = 480;
  const H = 300;
  const cases = [
    { x: 300, y: 70, height: 300, ok: true, caption: 'Alttan taşar' },
    { x: -70, y: 30, height: 300, ok: true, caption: 'Soldan ve alttan taşar' },
    { x: 360, y: 40, height: 260, ok: false, caption: 'Sağdan taşar · nokta kesilir' },
    { x: 280, y: -60, height: 300, ok: false, caption: 'Üstten kesilir · nokta kesilir' },
  ];
  const out = [];
  for (const c of cases) {
    const back = cobaltBackdrop({ width: W, height: H, glows: [{ cx: 60, cy: 40, r: 260 }], supergraphic: { x: c.x, y: c.y, height: c.height, stroke: 3 } });
    const svg = await svgDocument({ width: W, height: H, title: c.caption, defs: back.defs, body: back.body, embedFonts: false });
    out.push({ src: svgUri(svg), ok: c.ok, caption: c.caption });
  }
  return out;
}

/** The supergraphic with its three parts named. */
async function supergraphicAnatomy(): Promise<string> {
  const W = 1200;
  const H = 700;
  const height = 560;
  const x = 220;
  const y = 70;
  const back = cobaltBackdrop({ width: W, height: H, glows: [{ cx: 200, cy: 120, r: 520 }] });
  const sg = supergraphicMark({ x, y, height, stroke: 5 });
  const k = height / 1000;
  const note = (lx: number, ly: number, tx: number, ty: number, value: string) =>
    `<line x1="${lx}" y1="${ly}" x2="${tx - 12}" y2="${ty - 6}" stroke="${color.onSurface2}" stroke-width="1.5"/><circle cx="${lx}" cy="${ly}" r="5" fill="${color.onSurface}"/>${text({ x: tx, y: ty, text: value, font: 'IBM Plex Mono/500', size: 19, fill: color.onSurface, tracking: 0.1 })}`;
  const body = [
    back.body,
    sg.body,
    note(x + 447.214 * k + 85 * k, y + 85 * k, 720, 120, 'NOKTA · MERCAN, DOLU'),
    note(x + 309 * k, y + 480 * k, 720, 270, `DOLGU · BEYAZ ${pct(tint.fillTop)} → ${pct(tint.fillBottom)}`),
    note(x + 618 * k, y + 640 * k, 720, 420, `KONTUR · BEYAZ ${pct(tint.outline)} · %0,9 h`),
    note(x + 85 * k, y + 940 * k, 720, 580, 'GÖVDE · ALTTAN TAŞAR'),
  ].join('');
  return svgUri(await svgDocument({ width: W, height: H, title: 'Süper grafik', defs: `${back.defs}${sg.defs}`, body }));
}

/** Eyebrow and heading specimen on the cobalt surface, drawn with the asset builders. */
async function typeSpecimen(): Promise<string> {
  const W = 1200;
  const H = 520;
  const back = cobaltBackdrop({ width: W, height: H, glows: [{ cx: W, cy: 0, r: 380 }] });
  const centred = [
    eyebrow({ x: W / 2, top: 70, size: 20, label: 'Han Dijit · Yazılım firması', align: 'center' }),
    heading({ x: W / 2, top: 120, size: 76, title: 'Projenizi konuşalım', maxWidth: 900, align: 'center' }).svg,
    eyebrow({ x: 140, top: 300, size: 20, label: 'Sektörel çözüm · E-ticaret', align: 'start' }),
    heading({ x: 140, top: 350, size: 60, title: 'Giyim e-ticaret sitesi', maxWidth: 900, align: 'start' }).svg,
  ].join('');
  return svgUri(await svgDocument({ width: W, height: H, title: 'Eyebrow ve başlık', defs: back.defs, body: `${back.body}${centred}` }));
}

type Zone = { kind: 'shade'; x: number; y: number; w: number; h: number; label?: string } | { kind: 'safe'; x: number; y: number; w: number; h: number; label: string } | { kind: 'circle'; label: string } | { kind: 'line'; y: number; label: string };

/** An asset with its platform's crop and UI areas drawn over it. */
async function safeArea(asset: DigitalAsset, zones: Zone[], width = 900): Promise<string> {
  const { width: W, height: H } = asset;
  const s = W / width;
  const labelSize = 13 * s;
  const tag = (x: number, y: number, value: string) => {
    const content = value.toLocaleUpperCase('tr-TR');
    const w = content.length * labelSize * 0.68 + 16 * s;
    return `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(labelSize * 1.9)}" fill="${color.paper}"/>${text({ x: x + 8 * s, y: y + labelSize * 1.33, text: content, font: 'IBM Plex Mono/500', size: labelSize, fill: color.ink, tracking: 0.06 })}`;
  };
  const parts = zones.map(z => {
    if (z.kind === 'shade') {
      return `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="#000" fill-opacity="0.55"/>${z.label ? tag(z.x + 12 * s, z.y + 12 * s, z.label) : ''}`;
    }
    if (z.kind === 'safe') {
      return `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="none" stroke="${color.paper}" stroke-width="${2 * s}" stroke-dasharray="${10 * s} ${7 * s}"/>${tag(z.x + 10 * s, z.y + 10 * s, z.label)}`;
    }
    if (z.kind === 'line') {
      return `<line x1="0" y1="${z.y}" x2="${W}" y2="${z.y}" stroke="${color.paper}" stroke-width="${2 * s}" stroke-dasharray="${10 * s} ${7 * s}"/>${tag(12 * s, z.y + 8 * s, z.label)}`;
    }
    return `<path fill="#000" fill-opacity="0.55" fill-rule="evenodd" d="M0 0H${W}V${H}H0Z M${W / 2} 0 A${W / 2} ${H / 2} 0 1 0 ${W / 2} ${H} A${W / 2} ${H / 2} 0 1 0 ${W / 2} 0Z"/>${tag(12 * s, H - labelSize * 1.9 - 12 * s, z.label)}`;
  });
  return svgUri(await svgDocument({ width: W, height: H, title: 'Güvenli alan', body: `<image width="${W}" height="${H}" href="${svgUri(asset.svg)}"/>${parts.join('')}` }));
}

// ---- Page ---------------------------------------------------------------------------------------------------------

const rgb = (hex: string) => [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16)).join(' · ');
const oklch = (hex: string) => {
  const { l, c, h } = hexToOklch(hex);
  return `${(l * 100).toFixed(1).replace('.', ',')}% ${c.toFixed(3).replace('.', ',')} ${h.toFixed(0)}`;
};
const ratioText = (a: string, b: string) => `${contrast(a, b).toFixed(1).replace('.', ',')} : 1`;

function swatch(name: string, token: string, hex: string, role: string, ink: string, on?: [string, string]): string {
  const onRow = on ? `<dt>Kontrast</dt><dd>${on[0]} · ${ratioText(hex, on[1])}</dd>` : '';
  return `<div class="sw"><div class="chip" style="background:${hex};color:${ink}"><b>${name}</b><span class="lbl">${token}</span></div><dl><dt>HEX</dt><dd>${hex}</dd><dt>RGB</dt><dd>${rgb(hex)}</dd><dt>OKLCH</dt><dd>${oklch(hex)}</dd>${onRow}</dl><p class="role">${role}</p></div>`;
}

function css(): string {
  return `
:root{
  --paper:${color.paper};
  --ink:${color.ink};
  --ink-2:${color.ink2};
  --line:${color.border};
  --primary:${color.primary};
  --accent:${color.accent};
  --surface:${color.surface};
  --surface-deep:${color.surfaceDeep};
  --surface-strip:${color.surfaceStrip};
  --surface-rule:${color.surfaceRule};
  --strip-rule:${color.stripRule};
  --on-surface:${color.onSurface};
  --on-surface-2:${color.onSurface2};
  --f-display:'Archivo',system-ui,sans-serif;
  --f-text:'Inter',system-ui,sans-serif;
  --f-mono:'IBM Plex Mono',ui-monospace,monospace;
  --rule:1px solid var(--ink);
  color-scheme:light;
}
*{box-sizing:border-box}
img{max-width:100%;height:auto}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--f-text);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:1200px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:0 40px}
a{color:var(--ink)}
a:focus-visible{outline:2px solid var(--primary);outline-offset:3px}
.lbl{font-family:var(--f-mono);font-weight:500;font-size:11px;letter-spacing:.12em;text-transform:uppercase;line-height:1.5}
.stop{color:var(--accent)}
.lbl.file,.lbl .file{text-transform:none}
.cobalt{background:linear-gradient(180deg,var(--surface) 0%,var(--surface) 50%,var(--surface-deep) 100%);color:var(--on-surface)}
.cobalt a{color:var(--on-surface)}
.hero{position:relative;overflow:hidden;margin-inline:calc(-1 * max(16px,env(safe-area-inset-left,0px)));padding:32px max(16px,env(safe-area-inset-left,0px)) 0}
.hero-top{display:flex;justify-content:space-between;align-items:center;gap:12px 24px;flex-wrap:wrap;position:relative;z-index:1}
.hero-top .lbl{color:var(--on-surface-2)}
.hero-body{position:relative;z-index:1;padding-block:96px 72px;max-width:min(760px,64%)}
.hero .eyebrow{display:flex;align-items:center;gap:14px;color:var(--on-surface-2);margin:0 0 22px}
.hero .eyebrow::before{content:"";width:28px;height:2px;background:var(--surface-rule)}
.hero h1{font-family:var(--f-display);font-weight:600;font-size:clamp(44px,7.2vw,92px);line-height:1;letter-spacing:-.03em;margin:0;text-wrap:balance}
.hero .lead{color:var(--on-surface-2);margin-top:28px}
.hero-art{position:absolute;inset:0;z-index:0;pointer-events:none}
.hero-glow{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:right top}
.hero-mark{position:absolute;right:5%;bottom:0;height:82%;width:auto}
.facts{position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));background:var(--surface-strip);border-top:2px solid var(--strip-rule);margin-inline:calc(-1 * max(16px,env(safe-area-inset-left,0px)));padding-inline:max(16px,env(safe-area-inset-left,0px))}
.facts>div{padding:14px 16px 18px 0;min-width:0}
.facts .lbl{color:var(--on-surface-2)}
.facts b{display:block;font-family:var(--f-display);font-weight:600;font-size:19px;margin-top:4px;line-height:1.3;color:var(--on-surface)}
section{display:grid;grid-template-columns:200px minmax(0,1fr);gap:32px;padding-block:80px;border-top:var(--rule)}
section:first-of-type{border-top:0}
section>.rail{position:relative}
section>.body{min-width:0}
h2{font-family:var(--f-display);font-weight:600;font-size:clamp(32px,4.4vw,54px);line-height:1.02;letter-spacing:-.025em;margin:0 0 24px;text-wrap:balance}
h3{font-family:var(--f-display);font-weight:600;font-size:21px;line-height:1.2;margin:0 0 8px}
p{margin:0 0 14px;max-width:64ch}
.lead{font-size:19px;line-height:1.55;max-width:58ch}
.cols{display:grid;gap:24px;margin-top:36px}
.c2{grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}
.c3{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.c4{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
.cell{border-top:var(--rule);padding-top:14px;min-width:0}
.big{font-family:var(--f-display);font-weight:600;font-size:clamp(40px,5vw,64px);line-height:1;letter-spacing:-.02em;margin:10px 0 12px}
.panel{border:var(--rule);display:flex;align-items:center;justify-content:center;padding:40px 28px;min-height:220px;min-width:0}
.panel.neg{background:#000;color:#fff;border-color:#000}
.panel.cobalt{border-color:var(--surface)}
.panel .lg{max-width:100%}
.cap{display:flex;justify-content:space-between;gap:12px;margin-top:10px;flex-wrap:wrap}
.tbl{overflow-x:auto;margin-top:28px}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;min-width:560px}
th,td{text-align:left;padding:11px 16px 11px 0;border-bottom:var(--rule);vertical-align:top}
th{font-family:var(--f-mono);font-weight:500;font-size:11px;letter-spacing:.12em;text-transform:uppercase}
thead th{border-bottom:2px solid var(--ink)}
td.num{font-family:var(--f-mono);font-weight:500;white-space:nowrap}
.figure{margin:0;min-width:0}
.figure img{display:block;width:100%;height:auto;border:var(--rule);background:var(--paper)}
.figure.flat img{border:0}
.figure figcaption{margin-top:10px}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:40px 28px;margin-top:36px}
.gallery .wide{grid-column:1/-1}
.rules{list-style:none;margin:28px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:0 32px}
.rules li{border-top:var(--rule);padding:12px 0 14px 34px;position:relative}
.rules.do li::before{content:"";position:absolute;left:2px;top:15px;width:7px;height:13px;border:solid var(--ink);border-width:0 2px 2px 0;transform:rotate(45deg)}
.rules.dont li::before,.rules.dont li::after{content:"";position:absolute;left:0;top:19px;width:18px;height:2px;background:var(--ink);transform:rotate(45deg)}
.rules.dont li::after{transform:rotate(-45deg)}
.sw{border:var(--rule);min-width:0;display:flex;flex-direction:column}
.sw .chip{height:150px;display:flex;flex-direction:column;justify-content:flex-end;gap:4px;padding:18px;border-bottom:var(--rule)}
.sw .chip b{font-family:var(--f-display);font-weight:600;font-size:26px;letter-spacing:-.01em;line-height:1.1}
.sw dl{margin:0;padding:16px 18px 6px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 18px}
.sw dt{font-family:var(--f-mono);font-weight:500;font-size:11px;letter-spacing:.12em;text-transform:uppercase;padding-top:3px}
.sw dd{margin:0;font-family:var(--f-mono);font-weight:500;font-size:13px}
.sw .role{padding:0 18px 16px;margin:6px 0 0;font-size:14px;color:var(--ink-2)}
.sw-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));border:var(--rule);margin-top:24px}
.sw-row>div{padding:16px;min-height:150px;display:flex;flex-direction:column;justify-content:flex-end;gap:2px}
.sw-row b{font-family:var(--f-display);font-weight:600;font-size:17px}
.sw-row span{font-family:var(--f-mono);font-weight:500;font-size:12px}
.ratio{display:flex;height:56px;border:var(--rule);margin-top:28px}
.ratio span{display:flex;align-items:center;padding:0 14px;min-width:0;white-space:nowrap;overflow:hidden}
.spec{border-top:var(--rule);padding-top:16px;min-width:0}
.spec .s{font-size:clamp(30px,4vw,46px);line-height:1.1;margin:10px 0 12px;overflow-wrap:anywhere}
.f-d{font-family:var(--f-display);font-weight:600}
.f-t{font-family:var(--f-text);font-weight:400}
.f-m{font-family:var(--f-mono);font-weight:500}
.example{border:var(--rule);padding:36px 28px;margin-top:28px}
.example .h{font-family:var(--f-display);font-weight:600;font-size:clamp(36px,6vw,72px);line-height:1;letter-spacing:-.03em}
.cdot{width:.13em;height:.13em;display:inline-block;vertical-align:baseline;margin-left:.06em}
.steps{counter-reset:s;list-style:none;margin:20px 0 0;padding:0;display:grid;gap:0}
.steps li{counter-increment:s;border-top:var(--rule);padding:14px 0 14px 48px;position:relative;max-width:70ch}
.steps li::before{content:counter(s,decimal-leading-zero);position:absolute;left:0;top:15px;font-family:var(--f-mono);font-weight:500;font-size:12px;letter-spacing:.12em}
.path{font-family:var(--f-mono);font-weight:500;font-size:13px;overflow-wrap:anywhere}
.fmt{display:inline-block;border:var(--rule);padding:1px 6px;font-family:var(--f-mono);font-weight:500;font-size:11px;letter-spacing:.1em;margin-right:6px}
.pages{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px;margin-top:20px}
.slides{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px;margin-top:20px}
.cases{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-top:28px}
.cases figure{margin:0}
.cases img{display:block;width:100%;height:auto}
.cases figcaption{display:flex;gap:8px;align-items:center;margin-top:10px}
.mark-ok,.mark-no{position:relative;flex:none;width:18px;height:18px;border:var(--rule)}
.mark-ok::before{content:"";position:absolute;left:5px;top:1px;width:5px;height:10px;border:solid var(--ink);border-width:0 2px 2px 0;transform:rotate(45deg)}
.mark-no{background:var(--ink)}
.mark-no::before,.mark-no::after{content:"";position:absolute;left:3px;top:7px;width:10px;height:2px;background:var(--paper);transform:rotate(45deg)}
.mark-no::after{transform:rotate(-45deg)}
.layers{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;margin-top:28px}
.note{border-left:3px solid var(--accent);padding:4px 0 4px 16px;margin-top:24px;max-width:70ch}
.foot{border-top:var(--rule);padding-top:22px;display:flex;justify-content:space-between;gap:12px 24px;flex-wrap:wrap}
@media (max-width:780px){
  .hero-body{padding-block:56px 48px;max-width:none}
  .hero-mark{opacity:.45}
  section{grid-template-columns:minmax(0,1fr);gap:12px;padding-block:56px}
  .panel{min-height:170px;padding:28px 18px}
}
@media print{
  .wrap{max-width:none;padding:0}
  .hero,.facts{margin-inline:0;padding-inline:28px}
  .hero-body{padding-block:72px 56px;max-width:54%}
  .hero-mark{height:60%;right:4%}
  section{grid-template-columns:minmax(0,1fr);gap:10px;break-inside:auto;padding-block:32px}
  .c2,.layers,.slides,.sw-row{grid-template-columns:repeat(2,minmax(0,1fr))}
  .c3{grid-template-columns:repeat(3,minmax(0,1fr))}
  .c4,.cases{grid-template-columns:repeat(4,minmax(0,1fr))}
  .gallery{grid-template-columns:repeat(3,minmax(0,1fr));gap:24px 18px}
  .slides{grid-template-columns:repeat(3,minmax(0,1fr))}
  .pages{grid-template-columns:repeat(5,minmax(0,1fr))}
  .sw-row{grid-template-columns:repeat(6,minmax(0,1fr))}
  .sw-row>div{min-height:120px;padding:10px}
  .sw .chip{height:110px}
  .panel{min-height:160px;padding:24px 16px}
  .rules{grid-template-columns:repeat(2,minmax(0,1fr))}
  .figure,.panel,.sw,.cell,.spec,.example,.rules li,tr,.steps li,.cases figure,.layers figure,.sw-row{break-inside:avoid}
  h2,h3{break-after:avoid}
  .tbl{overflow:visible}
  table{min-width:0}
}
@page{size:A4;margin:14mm 14mm 16mm}
`;
}

function section(id: string, rail: string, content: string): string {
  return `<section id="${id}"><div class="rail"><div class="lbl">${rail}</div></div><div class="body">${content}</div></section>`;
}

/** Hero art in two pictures: the glow and dot grid fill the cobalt hero, the supergraphic stands at its right edge. */
async function heroArt(): Promise<{ backdrop: string; mark: string }> {
  const W = 1200;
  const H = 640;
  const back = cobaltBackdrop({
    width: W,
    height: H,
    gradient: false,
    // Kept clear of the hero's small text (label top right, lead on the left).
    glows: [{ cx: W - 80, cy: H, r: 420 }],
    dots: { pitch: 22, radius: 1.6, fade: 'right', area: { x: W * 0.6, y: 140, width: W * 0.4, height: H - 140 } },
  });
  // Transparent outside the glow and the dots: the cobalt itself is the page's CSS gradient.
  const body = back.body.replace(/^<rect[^>]*\/>/, '');
  const backdrop = svgUri(await svgDocument({ width: W, height: H, title: 'Kobalt yüzey', defs: back.defs, body, embedFonts: false }));
  // The mark drawn at 1000 units, cut at 820 so it rises from the bottom edge of the hero.
  const sg = supergraphicMark({ x: 6, y: 6, height: 1000, stroke: 9 });
  const markSvg = (await svgDocument({ width: 630, height: 826, title: 'Süper grafik', defs: sg.defs, body: sg.body, embedFonts: false }));
  return { backdrop, mark: svgUri(markSvg) };
}

async function fontCss(html: string): Promise<string> {
  const chars = new Set(html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' '));
  for (const c of ' abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;!?·-—–()/%+×→’\'"İıŞşĞğÜüÖöÇçÂâ') chars.add(c);
  const text = [...chars].join('');
  const faces: [FontKey, string][] = [['Archivo/600', 'Archivo'], ['Archivo/500', 'Archivo'], ['Inter/400', 'Inter'], ['Inter/500', 'Inter'], ['Inter/600', 'Inter'], ['IBM Plex Mono/500', 'IBM Plex Mono']];
  const rules = [];
  for (const [key, family] of faces) {
    const data = await subsetFont(readFileSync(path.join(dir.font, FONT_FILES[key])), text, { targetFormat: 'woff2' });
    rules.push(`@font-face{font-family:'${family}';font-weight:${key.split('/')[1]};font-style:normal;font-display:swap;src:url(data:font/woff2;base64,${data.toString('base64')}) format('woff2')}`);
  }
  return rules.join('\n');
}

function countFiles(folder: string): number {
  const walk = (p: string): number =>
    readdirSync(p, { withFileTypes: true }).reduce((sum, entry) => {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') return sum;
      return sum + (entry.isDirectory() ? walk(path.join(p, entry.name)) : 1);
    }, 0);
  return walk(path.join(ROOT, folder));
}

export async function buildGuide({ logos: logoSvgs, digital, print, slides }: Inputs): Promise<void> {
  const asset = (name: string) => digital.find(a => a.name === name)!;
  const thumb = (name: string, _width = 900) => svgUri(asset(name).svg);
  const construction = (file: string) => svgUri(readFileSync(path.join(dir.construction, file), 'utf8'));
  const [layer1, layer2, layer3, layer4] = await layerSteps();
  const cases = await supergraphicCases();
  const anatomy = await supergraphicAnatomy();
  const specimen = await typeSpecimen();
  const art = await heroArt();

  const og = asset('og-gorsel-1200x630');
  const safeOg = await safeArea(og, [
    { kind: 'shade', x: 0, y: 0, w: 285, h: 630, label: 'Kare kırpma' },
    { kind: 'shade', x: 915, y: 0, w: 285, h: 630 },
    { kind: 'safe', x: 285, y: 15, w: 630, h: 600, label: 'Anlam · orta 630 × 630' },
  ]);
  const safeLinkedin = await safeArea(asset('linkedin-kapak-1584x396'), [
    { kind: 'shade', x: 0, y: 0, w: 520, h: 396, label: 'Profil fotoğrafı' },
    { kind: 'safe', x: 560, y: 60, w: 760, h: 276, label: 'Mesaj · 560–1320 px' },
  ], 1100);
  const safePost = await safeArea(asset('sosyal-gonderi-1080x1080'), [
    { kind: 'shade', x: 0, y: 0, w: 135, h: 1080 },
    { kind: 'shade', x: 945, y: 0, w: 135, h: 1080 },
    { kind: 'safe', x: 135, y: 0, w: 810, h: 1080, label: 'Profil ızgarası 3:4' },
  ], 600);
  const safeStory = await safeArea(asset('hikaye-durum-1080x1920'), [
    { kind: 'shade', x: 0, y: 0, w: 1080, h: 250, label: 'Uygulama · 250 px' },
    { kind: 'shade', x: 0, y: 1580, w: 1080, h: 340, label: 'Yanıt alanı · 340 px' },
  ], 450);
  const safeProfile = await safeArea(asset('profil-gorseli-400x400'), [{ kind: 'circle', label: 'Daire kırpma' }], 400);
  const safeMeeting = await safeArea(asset('toplanti-arka-plani-1920x1080'), [
    { kind: 'shade', x: 600, y: 180, w: 720, h: 900, label: 'Konuşmacı' },
  ]);

  const files = {
    logo: countFiles('01-logo'),
    print: countFiles('04-basili'),
    office: countFiles('05-ofis'),
    digital: countFiles('06-dijital'),
    construction: countFiles('03-konstruksiyon'),
    font: countFiles('02-font'),
  };

  const swatches = [
    swatch('Kobalt', 'primary · cobalt 600', color.primary, 'Markanın rengi: kobalt yüzey (kapak, kartvizit arka yüzü, sosyal medya), olağan eylem, bağlantı, karo ve uygulama ikonu.', color.onPrimary, ['Beyaz metin', color.onPrimary]),
    swatch('Mercan', 'accent · coral 500', color.accent, 'Yalnızca nokta: işaretin noktası, başlığın noktası ve yüzey başına tek dönüşüm düğmesi.', color.onAccent, ['Mürekkep metin', color.onAccent]),
    swatch('Mürekkep', 'text · ink 950', color.ink, 'Beyaz yüzeylerde metin, renkli logonun gövdesi, mercan düğmenin yazısı.', color.paper, ['Beyaz zemin', color.paper]),
  ].join('');
  type Chip = readonly [string, string, string];
  const row = (chips: Chip[]) =>
    chips
      .map(([token, hex, role]) => {
        const textColor = contrast(hex, '#ffffff') >= contrast(hex, color.ink) ? '#ffffff' : color.ink;
        return `<div style="background:${hex};color:${textColor}"><span>${token}</span><b>${hex}</b><span>${role}</span></div>`;
      })
      .join('');
  const cobaltRow = row([
    ['cobalt 300', cobalt[300], 'Eyebrow çizgisi'],
    ['cobalt 500', cobalt[500], 'Şerit ayırıcısı'],
    ['cobalt 600', cobalt[600], 'Yüzey · primary'],
    ['cobalt 700', cobalt[700], 'Degrade sonu'],
    ['cobalt 800', cobalt[800], 'Bilgi şeridi · karo'],
  ]);
  const coralRow = row([
    ['coral 50', coral[50], 'Yumuşak zemin'],
    ['coral 400', coral[400], 'Düğme üzeri'],
    ['coral 500', coral[500], 'Nokta · accent'],
    ['coral 700', coral[700], 'Beyazda mercan metin'],
  ]);
  const neutrals = row([
    ['ink 0', ink[0], 'Kâğıt, kart'],
    ['ink 25', ink[25], 'Sayfa'],
    ['ink 200', ink[200], 'Çizgi'],
    ['ink 600', ink[600], 'İkincil metin'],
    ['ink 950', ink[950], 'Mürekkep'],
    ['siyah', '#000000', 'Tek renk ana dosyalar'],
  ]);
  const surfaceContrast = (fg: string, bg: string) => ratioText(fg, bg);

  const body = `<main class="wrap" lang="tr">
<div class="hero cobalt">
  <div class="hero-art" aria-hidden="true"><img class="hero-glow" src="${art.backdrop}" alt=""><img class="hero-mark" src="${art.mark}" alt=""></div>
  <div class="hero-top">${lockupInline(40, 'cobalt')}<span class="lbl">Kurumsal kimlik kılavuzu · Sürüm ${GUIDE_VERSION} · ${GUIDE_DATE}</span></div>
  <div class="hero-body">
    <p class="eyebrow lbl">Han Dijit · Kurumsal kimlik</p>
    <h1>Kurumsal kimlik kılavuzu${stop}</h1>
    <p class="lead">İşaret, logo, renk, tipografi, kobalt yüzey ve bütün materyallerin kuralları. Kimlik iki yüzeyle çalışır: kâğıt beyazı ve kobalt. Mercan noktayı, mürekkep metni taşır. Her dosya kullanıma hazırdır ve tek komutla tasarım tokenlarından yeniden üretilir.</p>
  </div>
</div>
<div class="facts"><div><span class="lbl">Faaliyet</span><b>Yazılım ve teknoloji hizmetleri</b></div><div><span class="lbl">Hizmet bölgesi</span><b>Türkiye geneli</b></div><div><span class="lbl">Tecrübe</span><b>6 yıl · 50+ proje</b></div><div><span class="lbl">Renkler</span><b>${color.primary} · ${color.accent} · ${color.ink}</b></div><div><span class="lbl">Web</span><b>${brand.web}</b></div><div><span class="lbl">Telefon · <span lang="en">WhatsApp</span></span><b>${brand.phone}</b></div></div>

${section('b01', '01 · İsim', `<h2>Han ve dijit${stop}</h2><p class="lead">İsim iki kelimeden kurulur. HAN, kurucunun soyadı İlhan'dan gelir ve Anadolu'daki ticaret hanını anlatır: yolların, malın ve insanların buluştuğu yeri. DİJİT, Latince <i>digitus</i> kökünden gelir ve basamak demektir: dijital dünyanın en küçük birimi. Yazılım, yapay zekâ ve siber güvenlik, bu basamakların doğru dizilmesiyle kurulur.</p><div class="cols c3">
<div class="cell"><span class="lbl">Han</span><div class="big">HAN</div><p>Soyadı ve ticaret hanı. Buluşma, alışveriş ve güven yeri.</p></div>
<div class="cell"><span class="lbl">Dijit</span><div class="big">DİJİT</div><p>Basamak; dijitalin kökü. Markayı ilk gören, işin dijital olduğunu anlar.</p></div>
<div class="cell"><span class="lbl">Yazım</span><div class="big">Aa</div><p>Metin içinde iki kelime, ikisi de büyük harfle başlar: Han Dijit. Alan adı bitişik ve küçük harfle yazılır: handijit.com. Bağlantı adresi https://www.handijit.com</p></div></div><div class="cols c3" style="margin-top:28px">
<div class="cell"><span class="lbl">İletişim</span><p style="margin-top:8px">Tek kanal: telefon ve <span lang="en">WhatsApp</span>, aynı numara (${brand.phone}). Materyallerde e-posta adresi ve adres yer almaz.</p></div>
<div class="cell"><span class="lbl">Hizmet bölgesi</span><p style="margin-top:8px">Türkiye geneli. Materyallerde şehir veya merkez belirtilmez.</p></div>
<div class="cell"><span class="lbl">Uzmanlık satırı</span><p style="margin-top:8px">${brand.expertise}. Kartvizit, antet ve <span lang="en">LinkedIn</span>'de bu sırayla yazılır.</p></div></div>`)}

${section('b02', '02 · İşaret', `<h2>Nokta, imleçtir${stop}</h2><p class="lead">İşaret küçük bir h harfidir. Sağ kolun üstündeki pahlı kare, Han Dijit'te bit'i ve imleci temsil eder: dijital bir işin en küçük birimi, bir satırın ve bir projenin başladığı yer. Nokta, gövdeyle aynı kalınlıktadır ve gövdenin köşelerindeki 45° pahı taşır.</p><p>Renkli kullanımda nokta mercandır, gövde beyaz yüzeyde mürekkep, kobalt yüzeyde beyazdır. Tek renk gereken yerde (damga, gravür, faks, tek renk baskı) siyah ve beyaz ana dosyalar kullanılır; o zaman nokta gövdeyle aynı renktir. Aynı nokta logotype'a da taşınır: DİJİT kelimesindeki iki İ harfinin noktası işaretin noktasıyla aynı pahlı karedir, ama yalnızca işaretin noktası mercan olur.</p><div class="cols c4">
<div><div class="panel">${inlineLogo('mark', 120, color.ink, color.accent, 'Han Dijit işareti')}</div><div class="cap"><span class="lbl">Renkli</span><span class="lbl file">isaret-renkli</span></div></div>
<div><div class="panel cobalt">${inlineLogo('mark', 120, color.onSurface, color.accent, 'Han Dijit işareti negatif')}</div><div class="cap"><span class="lbl">Kobalt yüzeyde</span><span class="lbl file">isaret-renkli-negatif</span></div></div>
<div><div class="panel">${inlineLogo('mark', 120, '#000000', '#000000', 'Han Dijit işareti tek renk')}</div><div class="cap"><span class="lbl">Tek renk</span><span class="lbl file">isaret-siyah</span></div></div>
<div><div class="panel" style="padding:24px"><img src="${svgUri(logoSvgs['uygulama-ikonu-kobalt']!)}" alt="Uygulama ikonu" style="width:140px"></div><div class="cap"><span class="lbl">Uygulama ikonu</span><span class="lbl">r = 0,2764</span></div></div></div><p style="margin-top:24px">32 px altında noktasız sade işaret (isaret-sade) kullanılır; uygulama ikonu ve favicon noktayı korur, çünkü karo zemin onu taşır.</p>`)}

${section('b03', '03 · Konstrüksiyon', `<h2>Altın oran üzerine kurulu${stop}</h2><p class="lead">İşaretin tek serbest ölçüsü ascender yüksekliğidir. h belirlendiği anda diğer bütün değerler φ = 1,618034 zincirinden türer. Sınır kutusu tam bir altın dikdörtgendir.</p><div class="cols">${figure(construction('altin-oran-konstruksiyon.svg'), 'Altın oran konstrüksiyonu', '<span class="file">03-konstruksiyon</span> · h = 1000 birim')}</div><div class="tbl"><table><thead><tr><th>Sembol</th><th>Ölçü</th><th>Değer</th><th>Türetim</th></tr></thead><tbody><tr><td class="num">h</td><td>Ascender yüksekliği</td><td class="num">1000</td><td>Sistemin tek serbest ölçüsü</td></tr><tr><td class="num">w</td><td>Genişlik</td><td class="num">618,034</td><td>h ÷ φ</td></tr><tr><td class="num">s</td><td>Gövde kalınlığı</td><td class="num">170,820</td><td>w ÷ (2 + φ)</td></tr><tr><td class="num">c</td><td>İç boşluk</td><td class="num">276,393</td><td>s × φ</td></tr><tr><td class="num">t</td><td>Yatay çizgi</td><td class="num">155,418</td><td>s × (1 − φ⁻⁵) · optik düzeltme %9</td></tr><tr><td class="num">k</td><td>Pah</td><td class="num">40,325</td><td>s ÷ φ³ · sekiz köşede aynı, 45°</td></tr><tr><td class="num">d</td><td>Nokta kenarı</td><td class="num">170,820</td><td>s ile eşit · pahlı kare</td></tr><tr><td class="num">hr</td><td>Sağ kol yüksekliği</td><td class="num">601,242</td><td>Yatay çizginin üst hizası · x-height</td></tr><tr><td class="num">g</td><td>Nokta boşluğu</td><td class="num">227,937</td><td>h − hr − d</td></tr><tr><td class="num">—</td><td>Çizgi konumu</td><td class="num">0,5279</td><td>φ⁻² + φ⁻⁴ · optik merkez</td></tr><tr><td class="num">—</td><td>Sınır kutusu</td><td class="num">1 : φ</td><td>Yükseklik ÷ genişlik = 1,618034</td></tr></tbody></table></div>`)}

${section('b04', '04 · Logo', `<h2>Üç form ve karo${stop}</h2><p class="lead">İşaret, HAN kelimesinin ilk harfidir; harf iki kez yazılmaz. Logo üç formda kullanılır: dikey (ana logo), yatay ve işaret. Dijital yüzeylerde dördüncü bir kilit vardır: işaret yuvarlatılmış bir karonun içinde, yanında iki satırlık HAN / DİJİT yazısı. Web sitesinin üst bandı, sosyal medya ve sunum kapağı bunu kullanır.</p><div class="cols c2">
<div><div class="panel" style="min-height:300px">${inlineLogo('vertical', 150, color.ink, color.accent, 'Han Dijit dikey logo')}</div><div class="cap"><span class="lbl">Dikey · ana logo</span><span class="lbl file">logo-dikey-renkli</span></div></div>
<div><div class="panel cobalt" style="min-height:300px">${inlineLogo('vertical', 150, color.onSurface, color.accent, 'Han Dijit dikey logo negatif')}</div><div class="cap"><span class="lbl">Dikey · kobalt yüzeyde</span><span class="lbl file">logo-dikey-renkli-negatif</span></div></div>
<div><div class="panel">${inlineLogo('horizontal', 48, color.ink, color.accent, 'Han Dijit yatay logo')}</div><div class="cap"><span class="lbl">Yatay · antet, sunum, web</span><span class="lbl file">logo-yatay-renkli</span></div></div>
<div><div class="panel cobalt">${inlineLogo('horizontal', 48, color.onSurface, color.accent, 'Han Dijit yatay logo negatif')}</div><div class="cap"><span class="lbl">Yatay · kobalt yüzeyde</span><span class="lbl file">logo-yatay-renkli-negatif</span></div></div>
<div><div class="panel">${lockupInline(72, 'paper')}</div><div class="cap"><span class="lbl">Karo · beyaz yüzey (kobalt karo)</span><span class="lbl file">logo-karo-renkli</span></div></div>
<div><div class="panel cobalt">${lockupInline(72, 'cobalt')}</div><div class="cap"><span class="lbl">Karo · kobalt yüzey (cobalt 800 karo)</span><span class="lbl file">logo-karo-negatif</span></div></div></div><div class="tbl"><table><thead><tr><th>Karo ölçüsü</th><th>Değer · karo = 1</th><th>Not</th></tr></thead><tbody><tr><td>Köşe yarıçapı</td><td class="num">0,2764</td><td>Uygulama ikonu ve favicon ile aynı</td></tr><tr><td>İşaret yüksekliği</td><td class="num">0,58</td><td>Ortalanır; favicon ve uygulama ikonunda 0,60</td></tr><tr><td>Yazı yüksekliği</td><td class="num">0,654</td><td>HAN / DİJİT bloğu, karoya göre dikey ortalı</td></tr><tr><td>Karo–yazı boşluğu</td><td class="num">0,269</td><td>Paylaşım görselindeki 52 / 14 oranı</td></tr><tr><td>Karo rengi</td><td class="num">primary / cobalt 800</td><td>Beyaz yüzeyde kobalt, kobalt yüzeyde cobalt 800</td></tr></tbody></table></div><div class="cols c3" style="margin-top:40px">
<div class="cell"><span class="fmt">SVG</span><p style="margin-top:8px">Web sitesi, ekran ve tasarım programları. Sonsuz ölçeklenir.</p></div>
<div class="cell"><span class="fmt">PNG</span><p style="margin-top:8px"><span lang="en">Word</span>, <span lang="en">PowerPoint</span>, <span lang="en">WhatsApp</span> ve sosyal medya. Saydam zemin, uzun kenar 2400 px.</p></div>
<div class="cell"><span class="fmt">PDF</span><p style="margin-top:8px">Matbaa, tabela, promosyon. Vektör. Renkli dosyalar RGB'dir, matbaa CMYK'ya çevirir; siyah ve beyaz ana dosyalar tek kanal K100.</p></div></div><div class="tbl"><table><thead><tr><th>Logo ölçüsü</th><th>Değer · cap = 686</th><th>Türetim</th></tr></thead><tbody><tr><td>İşaret yüksekliği</td><td class="num">1109,97</td><td>HAN cap yüksekliği × φ</td></tr><tr><td>İşaret–yazı boşluğu</td><td class="num">263,73</td><td>Harf aralığının √φ katı</td></tr><tr><td>Harf aralığı</td><td class="num">0,13 em</td><td>Yan boşluklar kırpılır</td></tr><tr><td>DİJİT cap yüksekliği</td><td class="num">423,97</td><td>HAN cap ÷ φ · dikey logo</td></tr><tr><td>Satır aralığı</td><td class="num">262,03</td><td>HAN cap ÷ φ² · dikey logo</td></tr><tr><td>Yatay kelime aralığı</td><td class="num">686,00</td><td>HAN cap × 1 · yatay logo</td></tr><tr><td>İ noktası</td><td class="num">gövde kalınlığı</td><td>Pahlı kare · pah = kenar ÷ φ³</td></tr></tbody></table></div>`)}

${section('b05', '05 · Kullanım', `<h2>Ölçü kuralları${stop}</h2><p class="lead">Logonun çevresinde her yönde en az 2d boşluk kalır; d, işaretin nokta kenarıdır. Basılı işlerde dikey logo 24 mm, yatay logo 40 mm, işaret 6 mm altına inmez. Karo logo ekranda 28 px karonun altına inmez.</p><div class="cols c2" style="align-items:start">${figure(construction('koruma-alani.svg'), 'Koruma alanı', '<span class="file">koruma-alani</span>')}${figure(construction('minimum-boyut.svg'), 'Minimum boyut', '<span class="file">minimum-boyut</span>')}</div>
<h3 style="margin-top:48px">Yapılmayacaklar</h3><ul class="rules dont">
<li>Lacivert, turkuaz ya da paletin dışında bir renk kullanmak. Marka kobalt, mercan, mürekkep ve mürekkepten türeyen nötrlerden oluşur.</li>
<li>Logoya degrade, gölge, kontur, parıltı ya da saydamlık vermek. Logo her zaman düz renktir.</li>
<li>Degradeyi ve saydamlığı kobalt yüzey görselinin dışında (metinde, düğmede, beyaz yüzeyde) kullanmak.</li>
<li>Mercanı geniş alan, metin rengi ya da ikinci bir düğme olarak kullanmak.</li>
<li>Noktayı mercandan başka bir renge boyamak; renkli logoda İ noktalarını mercan yapmak.</li>
<li>İşaretin yanına H harfini yeniden yazmak. İşaret zaten o harftir.</li>
<li>Logotype'ı fontla yeniden dizmek. Logo her dosyada çizim olarak gelir.</li>
<li>Logoyu esnetmek, eğmek, döndürmek.</li>
<li>İşaretin ve İ harflerinin noktalarını daireye çevirmek ya da pahlarını kaldırmak.</li>
<li>Logoyu kontrastı düşük bir fotoğrafın ya da kobalt dışında renkli bir zeminin üzerine koymak.</li>
<li>32 px altında noktalı işareti kullanmak. Bu boyutta sade dosyaya geçilir (karo ikonlar hariç).</li>
<li>Markayı “HanDijit”, “Han dijit”, “Han Digit” veya “HAN DIJIT” diye yazmak. Büyük harfle doğru yazım HAN DİJİT'tir.</li>
<li>Materyallere e-posta adresi, adres veya şehir eklemek.</li>
<li>Logoyu koruma alanının içine başka bir öğe girecek şekilde yerleştirmek.</li></ul>`)}

${section('b06', '06 · Renk', `<h2>Kobalt, mercan, mürekkep${stop}</h2><p class="lead">Marka üç renktir: kobalt, mercan ve mürekkep; nötrler mürekkebin açık tonlarıdır. Lacivert yok, turkuaz yok, başka bir renk tonu yok. Değerler web sitesinin tasarım tokenlarıdır (<span class="path">@handijitcom/ui/design</span>) ve bu paketteki her dosya oradan üretilir.</p><div class="cols c3">${swatches}</div>
<h3 style="margin-top:48px">Kobalt basamakları</h3><p>Kobalt yüzeyde derinlik yalnızca kobaltın kendi koyu basamaklarından gelir: zemin cobalt 600'den 800'e iner, bilgi şeridi ve yüzeydeki karo cobalt 800'dür. Yüzeydeki bütün metin saf beyazdır: hiçbir açık ton cobalt 600 üstünde 4,5 : 1'i tutmuyor.</p><div class="sw-row">${cobaltRow}</div>
<h3 style="margin-top:40px">Mercan basamakları</h3><p>Mercan nokta ve dönüşüm düğmesidir (coral 500). Beyaz zeminde mercan renkli küçük metin gerekiyorsa coral 700 kullanılır.</p><div class="sw-row">${coralRow}</div>
<h3 style="margin-top:40px">Nötrler</h3><p>Nötrler mürekkebin (ink 950) açık basamaklarıdır. Beyaz yüzeylerde metin mürekkeptir. Saf siyah yalnızca tek renk ana dosyalarda ve siyah-beyaz belgelerde (teklif, <span lang="en">Word</span> antetli) kalır.</p><div class="sw-row">${neutrals}</div>
<div class="tbl"><table><thead><tr><th>Kobalt yüzeyde metin</th><th>Renk</th><th>Kontrast</th><th>Kullanım</th></tr></thead><tbody>
<tr><td>Başlık, değer</td><td class="num">beyaz</td><td class="num">${surfaceContrast(color.onSurface, color.primary)} · şeritte ${surfaceContrast(color.onSurface, color.surfaceStrip)}</td><td>Her boyutta</td></tr>
<tr><td>İkincil metin, eyebrow, etiket</td><td class="num">beyaz</td><td class="num">${surfaceContrast(color.onSurface2, color.primary)} · şeritte ${surfaceContrast(color.onSurface2, color.surfaceStrip)}</td><td>Küçük metin için yeterli (≥ 4,5 : 1)</td></tr>
<tr><td>Düğme yazısı</td><td class="num">mürekkep / mercan</td><td class="num">${surfaceContrast(color.onAccent, color.accent)}</td><td>Mercan düğmenin üstünde</td></tr>
<tr><td>Mercan nokta</td><td class="num">coral 500</td><td class="num">${surfaceContrast(color.accent, color.primary)}</td><td>Süs; metin taşımaz, tek başına bilgi vermez</td></tr></tbody></table></div>
<div class="ratio" aria-label="Kullanım oranı"><span class="lbl" style="flex:60">Beyaz yüzey</span><span class="lbl" style="flex:30;background:${color.primary};color:#fff">Kobalt</span><span class="lbl" style="flex:7;background:${color.ink};color:#fff">Mürekkep</span><span class="lbl" style="flex:3;background:${color.accent};color:${color.onAccent};padding:0 4px;justify-content:center">•</span></div>
<div class="cols c3" style="margin-top:36px">
<div class="cell"><span class="lbl">Mercan</span><p style="margin-top:8px">Mercan noktadır. İşaretin noktası, başlığın noktası ve yüzey başına en fazla bir dönüşüm düğmesi (“Teklif alın”) mercandır. Mercan geniş alan, metin ya da ikinci bir düğme olmaz.</p></div>
<div class="cell"><span class="lbl">Degrade ve saydamlık</span><p style="margin-top:8px">Yalnızca kobalt yüzey görsellerinin içinde: zemin degradesi (cobalt 600 → 800), beyaz parıltı, solan beyaz nokta ızgarası ve süper grafiğin beyaz dolgusu ile konturu. Logo, metin ve düğme düz renktir.</p></div>
<div class="cell"><span class="lbl">Baskı</span><p style="margin-top:8px">Renkli baskı dosyaları RGB'dir. Matbaa kendi profiliyle CMYK'ya çevirir ve onay için prova (ıslak ya da dijital) gönderir. Kobalt, CMYK'da ekrandakinden donuk çıkabilir; kobalt yüzey ve mercan provasız basılmaz. Pantone karşılığı da provayla seçilir.</p></div></div>`)}

${section('b07', '07 · Tipografi', `<h2>Üç font, üç görev${stop}</h2><p class="lead">Üçü de <span lang="en">SIL Open Font License</span> ile ücretsizdir ve Türkçe karakterleri eksiksiz çizer. Logotype <span lang="en">Archivo SemiBold</span> temel alır ama fontun kendisi değildir: harf aralığı 0,13 em'e sabitlenmiş, yan boşluklar kırpılmıştır.</p><div class="cols c3"><div class="spec"><span class="lbl"><span lang="en">Archivo SemiBold</span> · başlık</span><div class="s f-d">Aa Ğğ Şş İı</div><p>Başlık, büyük rakam, düğme, sunum başlıkları.</p></div><div class="spec"><span class="lbl"><span lang="en">Inter Regular</span> · metin</span><div class="s f-t">Aa Ğğ Şş İı</div><p>Teklif metni, yazışma, açıklama, şeritteki etiketler.</p></div><div class="spec"><span class="lbl"><span lang="en">IBM Plex Mono Medium</span> · teknik</span><div class="s f-m">+90 552</div><p>Eyebrow, etiket, telefon, teklif numarası, tarih, alan adı.</p></div></div><p style="margin-top:28px">Font dosyaları <a class="path" href="../02-font">02-font</a> klasöründedir. <span lang="en">Word</span> şablonu fontları kendi içinde taşır; <span lang="en">PowerPoint</span> şablonu, düzenlenebilir SVG kaynakları ve tasarım programları için fontları bilgisayara yükleyin.</p>`)}

${section('b08', '08 · Eyebrow ve nokta', `<h2>Eyebrow, başlık, mercan nokta${stop}</h2><p class="lead">Kobalt yüzeyde metin üç katlıdır: küçük bir mono eyebrow, beyaz Archivo başlık ve başlığı kapatan mercan nokta. Başlık nokta ile biter, eyebrow nokta almaz.</p><div class="cols">${figure(specimen, 'Eyebrow ve başlık örnekleri', 'Ortalı eyebrow iki çizgiyle, sola hizalı eyebrow tek çizgiyle')}</div><div class="tbl"><table><thead><tr><th>Öğe</th><th>Değer</th><th>Not</th></tr></thead><tbody>
<tr><td>Eyebrow</td><td class="num">IBM Plex Mono 500</td><td>Türkçe büyük harf (İ, Ş), harf aralığı 0,153 em, satır 1,45, renk beyaz</td></tr>
<tr><td>Eyebrow çizgisi</td><td class="num">1,65 × 0,12 em</td><td>cobalt 300; metinle arası 0,82 em. Ortalı satırda iki yanda, sola hizalıda yalnız başta</td></tr>
<tr><td>Adres ve alan adı</td><td class="num">küçük harf</td><td>handijit.com ve github.com/handijit eyebrow'da da yazıldığı gibi kalır</td></tr>
<tr><td>Başlık</td><td class="num">Archivo 600</td><td>Harf aralığı −0,03 em, satır 1,06, renk beyaz (on-primary)</td></tr>
<tr><td>Nokta</td><td class="num">accent</td><td>Başlığın son harfine bitişik normal nokta, mercan. Ortalı başlıkta nokta ortalamaya katılmaz</td></tr>
<tr><td>Dönüşüm düğmesi</td><td class="num">accent · on-accent</td><td>Archivo 600, köşe 0,22 × yükseklik, sağda çapraz ok. Yüzey başına tek</td></tr>
<tr><td>Bilgi şeridi</td><td class="num">cobalt 800</td><td>Üstte 2 px cobalt 500; değer Archivo 600 beyaz, etiket Inter 500 beyaz, aralarda 2 px cobalt 500</td></tr></tbody></table></div><div class="example"><span class="lbl">Beyaz yüzeyde</span><div class="h" style="margin:18px 0 20px">Proje teklifi${stop}</div><p>Renkli beyaz yüzeylerde (web, sunum içerik sayfası) başlık mürekkep, nokta yine mercandır. Siyah-beyaz belgelerde (teklif, <span lang="en">Word</span> antetli) başlık imleç noktasıyla biter: harf gövdesi kalınlığında (0,13 em), 45° pahlı siyah bir kare${cdot}</p></div>`)}

${section('b09', '09 · Kobalt yüzey', `<h2>Kobalt yüzey${stop}</h2><p class="lead">Kapak, kartvizit arka yüzü, sticker ve sosyal medya görselleri kobalt yüzeydir: kobalt zemin, beyaz metin, mercan nokta ve mercan düğme. Beş katman sırayla kurulur; içerik her zaman en üstte ve platformun kırpmadığı alandadır.</p><div class="layers">
${figure(layer1!, '1 · Degrade', '1 · Zemin · cobalt 600 → 800')}
${figure(layer2!, '2 · Parıltı', `2 · Beyaz parıltı · ${pct(tint.glow)} → 0`)}
${figure(layer3!, '3 · Nokta ızgarası', `3 · Beyaz nokta ızgarası · kenarlarda ${pct(tint.dots)}`)}
${figure(layer4!, '4 · Süper grafik', '4 · Süper grafik · tek, alttan taşar')}</div><div class="cols">${figure(thumb('og-gorsel-1200x630', 1100), 'OG görseli', '5 · İçerik ve bilgi şeridi · <span class="file">og-gorsel-1200x630</span>')}</div><ul class="rules do">
<li>Zemin dikey degradedir: cobalt 600 %0–50, cobalt 700 %100. Lacivert ya da siyaha inilmez. Bilgi şeridi düz cobalt 800'dür.</li>
<li>Parıltı beyazdır: merkezde ${pct(tint.glow)}, kenarda saydam bir daire. Bir yüzeyde en fazla iki parıltı.</li>
<li>Nokta ızgarası beyaz noktalardır (1200 px genişlikte 22 px aralık, 1,6 px yarıçap, en çok ${pct(tint.dots)}); içeriğe doğru söner, metnin altına girmez.</li>
<li>Bir yüzeyde tek süper grafik. Logo ya da karo ile birlikte kullanılabilir; ikinci bir büyük işaret eklenmez.</li>
<li>Kobalt yüzeydeki karo cobalt 800'dür, yazı beyazdır. Beyaz yüzeyde karo kobalt, yazı mürekkeptir.</li>
<li>Mercan yüzeyde nokta olarak kalır: işaretin noktası, süper grafiğin noktası, başlığın noktası ve tek düğme.</li></ul>`)}

${section('b10', '10 · Süper grafik', `<h2>Mavi kopya süper grafik${stop}</h2><p class="lead">İşaret büyütülür ve bir mimari çizim gibi çizilir: gövde aşağı doğru sönen beyaz bir degrade (${pct(tint.fillTop)} → ${pct(tint.fillBottom)}), ince beyaz bir kontur (${pct(tint.outline)}), nokta ise dolu mercan. Süper grafik bir çerçeve değil, sahnedeki ikinci karakterdir.</p><div class="cols">${figure(anatomy, 'Süper grafiğin parçaları', 'Dolgu, kontur, nokta')}</div><div class="cases">${cases
    .map(c => `<figure><img src="${c.src}" alt="${esc(c.caption)}"><figcaption><span class="${c.ok ? 'mark-ok' : 'mark-no'}" aria-label="${c.ok ? 'Doğru' : 'Yanlış'}"></span><span class="lbl">${c.caption}</span></figcaption></figure>`)
    .join('')}</div><ul class="rules do">
<li>Yükseklik yüzey yüksekliğinin %60–90'ı kadardır; kontur kalınlığı işaret yüksekliğinin %0,9'u (440 px'te 4 px).</li>
<li>Alttan ya da soldan taşabilir. Nokta sağ üstte olduğu için sağdan ve üstten kesilmez: nokta asla kesilmez.</li>
<li>Bilgi şeridi varsa süper grafik şeridin arkasından yükselir.</li>
<li>Beyaz yüzeylerde (teklif kapağı) süper grafik düz siyahtır ve yine yalnızca alttan taşar.</li></ul>
<h3 style="margin-top:48px"><span lang="en">WhatsApp</span> karekodu</h3><p>Kartvizitte ve sunum kapanışında yer alır. Modüller, işaretin pah oranıyla (0,236) kesilmiş karelerdir. Konumlandırma kareleri okunabilirlik için düz kalır. Kobalt yüzeyde karekod beyaz bir karo üzerinde mürekkep rengindedir; ters (açık modüllü) karekod kullanılmaz.</p><div class="tbl" style="margin-top:16px"><table style="min-width:0"><tbody><tr><td>Veri</td><td class="num">HTTPS://WA.ME/905525799321</td></tr><tr><td>Modül pahı</td><td class="num">0,236 modül</td></tr><tr><td>Sessiz alan</td><td class="num">en az 4 modül</td></tr><tr><td>Hata düzeltme</td><td class="num">H</td></tr></tbody></table></div><p style="margin-top:14px">Üretici her çalıştığında kartvizitteki karekodu okutarak doğrular.</p>`)}

${section('b11', '11 · Güvenli alan', `<h2>Sosyal medya güvenli alanları${stop}</h2><p class="lead">Her platform görseli kendi biçiminde kırpar ya da üstüne arayüz koyar. Şablonlar buna göre kuruldu; metni değiştirirken anlam taşıyan öğeler işaretli alanın içinde kalır.</p><div class="gallery">
${figure(safeOg, 'OG görseli güvenli alan', 'OG 1200 × 630 · kare kırpma ve X 2:1', 'wide')}
${figure(safeLinkedin, 'LinkedIn kapak güvenli alan', '<span lang="en">LinkedIn</span> kapak 1584 × 396', 'wide')}
${figure(safePost, 'Sosyal gönderi güvenli alan', 'Gönderi 1080 × 1080 · ızgara 3:4')}
${figure(safeStory, 'Hikâye güvenli alan', 'Hikâye 1080 × 1920 · üst 250, alt 340 px')}
${figure(safeProfile, 'Profil görseli daire kırpma', 'Profil 400 × 400 · daire')}
${figure(safeMeeting, 'Toplantı arka planı', 'Toplantı 1920 × 1080 · konuşmacı alanı', 'wide')}</div><div class="tbl"><table><thead><tr><th>Görsel</th><th>Kırpma ve arayüz</th><th>Kural</th></tr></thead><tbody>
<tr><td>OG 1200 × 630</td><td>Facebook, <span lang="en">LinkedIn</span>, <span lang="en">WhatsApp</span> büyük kart tam gösterir; X 2:1 kırpar; küçük kartlar ortadaki kareyi alır</td><td>Logo, eyebrow, başlık ve düğme ortadaki 630 × 630 kare içinde, ortalı</td></tr>
<tr><td><span lang="en">LinkedIn</span> 1584 × 396</td><td>Profil fotoğrafı sol altı kapatır, mobil uygulama kenarları kırpar</td><td>Mesaj 560–1320 px arasında, dikeyde ortalı</td></tr>
<tr><td>Gönderi 1080 × 1080</td><td>Profil ızgarası 3:4 gösterir: yanlardan 135 px gider</td><td>Logo, metin ve düğme ortadaki 810 px içinde</td></tr>
<tr><td>Hikâye 1080 × 1920</td><td>Üstte ilerleme çubuğu ve hesap adı, altta yanıt alanı</td><td>Üst 250 px ve alt 340 px'e yalnızca zemin ve süper grafik</td></tr>
<tr><td>Profil 400 × 400</td><td>Bütün platformlar daire kırpar</td><td>İşaret yüksekliği %50, ortalı</td></tr>
<tr><td><span lang="en">GitHub</span> 1280 × 640</td><td>Önizlemeler kenarları kırpabilir</td><td>Anlam ortadaki 640 × 640 içinde</td></tr>
<tr><td>Toplantı 1920 × 1080</td><td>Konuşmacı ortada; görüntü yalnızca kendi ekranınızda aynalanır</td><td>Logo sol üstte, süper grafik sağda; ortaya metin konmaz</td></tr></tbody></table></div>`)}

${section('b12', '12 · Basılı', `<h2>Baskıya hazır dosyalar${stop}</h2><p class="lead">Kartvizit ön yüzü ve antetli kâğıt beyaz kalır; işaretin noktası mercandır. Kartvizit arka yüzü ve sticker kobalt yüzeydir. Kartvizitte 3 mm, stickerda 2 mm taşma payı ve kesim kutusu (TrimBox) tanımlıdır.</p><div class="gallery">
${figure(svgUri(print.cardFront), 'Kartvizit ön', 'Kartvizit ön · 90 × 50 mm')}
${figure(svgUri(print.cardBack), 'Kartvizit arka', 'Kartvizit arka · kobalt', 'flat')}
${figure(svgUri(print.sticker), 'Sticker', 'Sticker · 60 × 60 mm', 'flat')}
${figure(svgUri(print.letterheadFirst), 'Antetli kâğıt ilk sayfa', 'Antetli kâğıt · ilk sayfa')}
${figure(svgUri(print.letterheadNext), 'Antetli kâğıt devam sayfası', 'Antetli kâğıt · devam sayfası')}</div><div class="tbl"><table><thead><tr><th>Dosya</th><th>Ölçü</th><th>Önerilen baskı</th></tr></thead><tbody><tr><td><a class="path" href="../04-basili/kartvizit-90x50-baski.pdf">04-basili/kartvizit-90x50-baski.pdf</a></td><td class="num">90 × 50 mm + 3 mm</td><td>350 g mat kuşe, çift yön; arka yüz kobalt</td></tr><tr><td><a class="path" href="../04-basili/antetli-kagit-a4-baski.pdf">04-basili/antetli-kagit-a4-baski.pdf</a></td><td class="num">A4, 2 sayfa</td><td>90–100 g 1. hamur; ilk sayfa ve devam sayfası</td></tr><tr><td><a class="path" href="../04-basili/sticker-60x60-baski.pdf">04-basili/sticker-60x60-baski.pdf</a></td><td class="num">60 × 60 mm + 2 mm</td><td>Mat vinil; 2. sayfa kesim hattı</td></tr></tbody></table></div><p class="note"><b>Matbaaya not.</b> PDF'ler RGB'dir. Baskıdan önce matbaa dosyaları kendi kâğıt ve makine profiliyle CMYK'ya çevirmeli ve prova göndermelidir. Kobalt zemin ve mercan nokta prova onaylanmadan basılmaz; geniş kobalt zeminde siyah (K) eklenmemesi istenir, yoksa kobalt kirlenir. Siyah metinler tek kanal K100 kalmalıdır. Arka yüzdeki nokta ızgarası 300 ppi resim olarak gömülüdür, diğer her şey vektördür.</p><p>Düzenlenebilir kaynaklar <span class="path">04-basili/kaynak</span> klasöründedir (SVG, metinler canlı). İsim ve unvan değiştirilecekse fontları yükleyip SVG'yi düzenleyin ya da üreticide <span class="path">src/config.ts</span> dosyasını değiştirip yeniden üretin.</p>`)}

${section('b13', '13 · Ofis', `<h2>Teklif, yazışma ve sunum${stop}</h2><p class="lead">Teklif oluşturucu, örnek teklif ve <span lang="en">Word</span> antetli kâğıt bilinçli olarak siyah-beyazdır: ofis yazıcısında aynı görünür ve web sitesinin teklif PDF'i bunları birebir izler. Sunum şablonunda kapak, bölüm ayracı ve kapanış kobalt yüzeydir.</p>
<h3>Teklif oluşturucu</h3><p><a class="path" href="../05-ofis/teklif-olusturucu.html">05-ofis/teklif-olusturucu.html</a> dosyası internet bağlantısı gerektirmeyen bir araçtır. Chrome veya Edge ile açın, bilgileri doldurun, PDF olarak kaydedin. Kapak, özet, kapsam, takvim, fiyatlandırma (KDV hesabıyla), bakım ve destek, koşullar ve imza sayfası otomatik dizilir; sayfa numaraları ve üst bilgi kendiliğinden gelir.</p><ol class="steps">
<li>Dosyayı açın. İlk açılışta örnek teklif yüklüdür; <b>Yeni teklif</b> ile boş bir teklife başlayın.</li>
<li>Soldaki alanları doldurun. Kalem ve takvim satırı ekleyip silebilirsiniz; toplamlar anında hesaplanır.</li>
<li><b>PDF olarak kaydet</b> düğmesine basın. Yazdırma penceresinde hedef olarak "PDF olarak kaydet" seçin, kenar boşluklarını varsayılan bırakın.</li>
<li>Teklifi tekrar düzenlemek için <b>Dosyaya kaydet</b> ile .json dosyası alın; sonra <b>Dosyadan aç</b> ile yükleyin.</li></ol><div class="pages">${[1, 2, 3, 4, 5].map(n => figure(uri(input(`teklif-sayfa-${n}.png`)), `Örnek teklif sayfa ${n}`, `Sayfa ${n}`)).join('')}</div><p style="margin-top:16px">Örnek çıktı: <a class="path" href="../05-ofis/ornek-teklif-HD-2026-001.pdf">05-ofis/ornek-teklif-HD-2026-001.pdf</a></p>
<h3 style="margin-top:48px"><span lang="en">Word</span> antetli kâğıt</h3><p><a class="path" href="../05-ofis/antetli-kagit-a4.docx">05-ofis/antetli-kagit-a4.docx</a>: ilk sayfada logo ve iletişim bilgisi, sonraki sayfalarda işaret ve sayfa numarası otomatik gelir. Fontlar dosyanın içine gömülüdür. Köşeli parantezli alanları değiştirip yazınızı yazın.</p><div style="margin-top:20px;max-width:440px">${figure(uri(input('word-antetli-kagit.png')), 'Word antetli kâğıt', '<span lang="en">Word</span> şablonu · ilk sayfa')}</div>
<h3 style="margin-top:48px"><span lang="en">PowerPoint</span> sunum şablonu</h3><p><a class="path" href="../05-ofis/sunum-sablonu-16x9.pptx">05-ofis/sunum-sablonu-16x9.pptx</a>: 16:9, dört düzen (kapak, bölüm ayracı, içerik, kapanış) ve 11 örnek slayt. Kapak, bölüm ayracı ve kapanış kobalt yüzeydir: yüzey, düzenin arka plan resmidir; metinler düzenlenebilir kalır. Bölüm başlıkları mercan noktayla biter. Yeni slayt eklerken "Yeni slayt" menüsünden HD_ düzenlerini seçin. Fontların bilgisayarda yüklü olması gerekir.</p><div class="slides">
${figure(svgUri(slides.cover), 'Sunum kapak', 'Slayt 1 · kapak')}
${figure(svgUri(slides.section), 'Sunum bölüm ayracı', 'Slayt 2 · bölüm ayracı')}
${figure(uri(input('slayt-04.png')), 'Sunum slaytı 4', 'Slayt 4 · içerik')}
${figure(uri(input('slayt-05.png')), 'Sunum slaytı 5', 'Slayt 5 · içerik')}
${figure(uri(input('slayt-08.png')), 'Sunum slaytı 8', 'Slayt 8 · içerik')}
${figure(uri(input('slayt-10.png')), 'Sunum slaytı 10', 'Slayt 10 · içerik')}
${figure(svgUri(slides.closing), 'Sunum kapanış', 'Slayt 11 · kapanış')}</div>`)}

${section('b14', '14 · Dijital', `<h2>Ekran ve sosyal medya${stop}</h2><p class="lead">Dijital görseller kobalt yüzeydir ve PNG olarak kullanıma hazırdır. SVG kaynakları metni canlı tutar (fontlar gömülü); metin değişecekse fontları yükleyip SVG'yi düzenleyin ya da üreticide değiştirip yeniden üretin.</p><div class="gallery">
${figure(thumb('og-gorsel-1200x630'), 'OG görseli', 'OG görseli · 1200 × 630', 'wide')}
${figure(thumb('linkedin-kapak-1584x396', 1100), 'LinkedIn kapak', '<span lang="en">LinkedIn</span> kapak · 1584 × 396', 'wide')}
${figure(thumb('sosyal-gonderi-1080x1080', 600), 'Sosyal gönderi', 'Sosyal gönderi · 1080 × 1080', 'flat')}
${figure(thumb('hikaye-durum-1080x1920', 450), 'Hikâye ve WhatsApp durum', 'Hikâye ve <span lang="en">WhatsApp</span> durum · 1080 × 1920', 'flat')}
${figure(thumb('profil-gorseli-400x400', 400), 'Profil görseli', 'Profil görseli · 400 × 400', 'flat')}
${figure(thumb('github-banner-1280x640'), 'GitHub sosyal önizleme', '<span lang="en">GitHub</span> sosyal önizleme · 1280 × 640', 'flat')}
${figure(thumb('toplanti-arka-plani-1920x1080'), 'Toplantı arka planı', 'Toplantı arka planı · 1920 × 1080', 'flat')}</div>
<div style="break-inside:avoid"><h3 style="margin-top:48px">Web sitesi ikonları</h3><p><a class="path" href="../06-dijital/favicon">06-dijital/favicon</a> klasöründeki dosyaları sitenin kök dizinine koyun ve head-etiketleri.html içindeki satırları sayfanın &lt;head&gt; bölümüne ekleyin. İkon kobalt karo, beyaz işaret ve mercan noktadır. Set favicon.ico (16, 32, 48), favicon.svg, apple-touch-icon (180, köşesiz), 192 ve 512 px ikonlar, maskelenebilir ikon ve site.webmanifest dosyasından oluşur. Tek renk sürüm gerekmez: hiçbir hedef platform tek renk ikon istemez.</p><div style="display:flex;gap:20px;align-items:end;margin-top:20px;flex-wrap:wrap">${[16, 32, 48, 96, 180].map(size => `<img src="${uri(readFileSync(path.join(dir.digital, 'favicon', size === 180 ? 'apple-touch-icon.png' : 'icon-192.png')))}" width="${size}" height="${size}" alt="İkon ${size} px">`).join('')}</div></div>`)}

${section('b15', '15 · Dosya dizini', `<h2>Paket içeriği${stop}</h2><div class="tbl" style="margin-top:0"><table><thead><tr><th>Klasör</th><th>İçerik</th><th>Adet</th></tr></thead><tbody><tr><td class="num">00-kilavuz</td><td>Bu kılavuz (HTML ve PDF)</td><td class="num">2</td></tr><tr><td class="num">01-logo</td><td>Logo, işaret, karo logo ve uygulama ikonu: renkli ve tek renk; svg, png, pdf</td><td class="num">${files.logo}</td></tr><tr><td class="num">02-font</td><td>Archivo, Inter, <span lang="en">IBM Plex Mono</span> (TTF) ve lisanslar</td><td class="num">${files.font}</td></tr><tr><td class="num">03-konstruksiyon</td><td>Konstrüksiyon, koruma alanı, minimum boyut (svg, png)</td><td class="num">${files.construction}</td></tr><tr><td class="num">04-basili</td><td>Baskı PDF'leri ve düzenlenebilir SVG kaynakları</td><td class="num">${files.print}</td></tr><tr><td class="num">05-ofis</td><td>Teklif oluşturucu, örnek teklif PDF, <span lang="en">Word</span> antetli, <span lang="en">PowerPoint</span> sunum</td><td class="num">${files.office}</td></tr><tr><td class="num">06-dijital</td><td>PNG görseller, SVG kaynaklar, favicon seti</td><td class="num">${files.digital}</td></tr><tr><td class="num">07-gelistirici</td><td>Marka token CSS dosyası (üretilir)</td><td class="num">1</td></tr><tr><td class="num">kaynak/uretici</td><td>Üretici: <span class="path">npm run uret</span> 01, 04, 05 (sunum), 06, 07 ve bu kılavuzu tasarım tokenlarından yeniden üretir</td><td class="num">—</td></tr></tbody></table></div><p style="margin-top:24px">Renk ve logo kaynağı <span class="path">@handijitcom/ui/design</span> paketidir. Bir token değişince <span class="path">kaynak/uretici</span> içinde <span class="path">npm install</span> ve <span class="path">npm run uret</span> çalıştırın; bütün dosyalar ve bu kılavuz yeniden üretilir.</p>`)}
<footer class="foot"><span class="lbl">Han Dijit · Kurumsal kimlik kılavuzu ${GUIDE_VERSION} · ${GUIDE_DATE}</span><span class="lbl">Archivo, Inter, <span lang="en">IBM Plex Mono</span> · <span lang="en">SIL Open Font License</span> · Renkler @handijitcom/ui/design</span></footer></main>`;

  const fonts = await fontCss(body);
  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${color.primary}">
<title>Han Dijit Kurumsal Kimlik</title>
<link rel="icon" href="${svgUri(readFileSync(path.join(dir.digital, 'favicon', 'favicon.svg'), 'utf8'))}">
<style>${fonts}
${css()}</style>
</head>
<body>
${body}
</body>
</html>
`;
  const file = path.join(dir.guide, 'kurumsal-kimlik-kilavuzu.html');
  write(file, html);

  const page = await (await getBrowser()).newPage();
  await page.goto(`file://${file}`);
  await page.evaluate(() => document.fonts.ready);
  const bytes = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.close();
  write(path.join(dir.guide, 'kurumsal-kimlik-kilavuzu.pdf'), await assemblePdf([{ bytes, width: 210, height: 297 }], { title: 'Han Dijit kurumsal kimlik kılavuzu', subject: `Kurumsal kimlik kılavuzu ${GUIDE_VERSION}` }));
}
