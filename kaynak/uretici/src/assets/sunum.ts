import { readFileSync } from 'node:fs';
import path from 'node:path';

import JSZip from 'jszip';

import { bandBackdrop, lockup, lockupWidth, mark } from '../brand.ts';
import { brand, dir } from '../config.ts';
import { baselineInBox } from '../fonts.ts';
import { png, write } from '../render.ts';
import { esc, round, svgDocument, text } from '../svg.ts';
import { color } from '../tokens.ts';
import { qrPath } from './basili.ts';

// The PowerPoint template (05-ofis/sunum-sablonu-16x9.pptx) keeps its master and its four HD_ layouts; this step
// rewrites the three band layouts (cover, section divider, closing) and the colours of the sample slides that use
// them. The content layout and its slides stay white. The band itself is a background picture (gradient, glow,
// dot grid and supergraphic cannot be built from PowerPoint shapes faithfully); every text stays editable.
// Rerunning is safe: the band layouts are written whole and the slide patches only touch what is not done yet.

const FILE = path.join(dir.office, 'sunum-sablonu-16x9.pptx');
const SLIDE_W = 9144000;
const PX = 1920 / SLIDE_W; // background picture pixels per EMU
const ZIP_DATE = new Date('2026-11-27T09:00:00+03:00');

const hex = (value: string) => value.replace('#', '').toUpperCase();
const WHITE = hex(color.bandText);
const SOFT = hex(color.bandText2);
const CORAL = hex(color.accent);

const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const REL_IMAGE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
const REL_MASTER = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster';

type Font = 'Archivo SemiBold' | 'IBM Plex Mono Medium';

function rPr(font: Font, size: number, fill: string, spacing = 0): string {
  const spc = spacing ? ` spc="${spacing}" kern="0"` : '';
  const face = `<a:latin typeface="${font}" pitchFamily="34" charset="0"/><a:ea typeface="${font}" pitchFamily="34" charset="-122"/><a:cs typeface="${font}" pitchFamily="34" charset="-120"/>`;
  return `<a:rPr lang="tr-TR" sz="${size}"${spc} dirty="0"><a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>${face}</a:rPr>`;
}

function defRPr(font: Font, size: number, fill: string, spacing = 0): string {
  return rPr(font, size, fill, spacing).replace('<a:rPr', '<a:defRPr').replace('</a:rPr>', '</a:defRPr>');
}

type Box = { x: number; y: number; cx: number; cy: number };

function xfrm({ x, y, cx, cy }: Box): string {
  return `<a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>`;
}

function pic(id: number, descr: string, rId: string, box: Box): string {
  return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="Image ${id}" descr="${esc(descr)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xfrm(box)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
}

/** Fixed text (not a placeholder). */
function label(id: number, box: Box, run: string, value: string, align: 'l' | 'r' = 'l'): string {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${xfrm(box)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln/></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="${align}" indent="0" marL="0"><a:buNone/></a:pPr><a:r>${run}<a:t>${esc(value)}</a:t></a:r></a:p></p:txBody></p:sp>`;
}

/** Placeholder with a custom prompt; the slide fills it. */
function placeholder(id: number, idx: number, type: 'body' | 'title', box: Box, font: Font, size: number, fill: string, prompt: string, spacing = 0, stop = false): string {
  const tail = stop ? `<a:r>${rPr(font, size, CORAL, spacing)}<a:t>.</a:t></a:r>` : '';
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${type === 'title' ? 'Title' : 'Text'} ${id}"/><p:cNvSpPr/><p:nvPr><p:ph idx="${idx}" type="${type}" hasCustomPrompt="1"/></p:nvPr></p:nvSpPr><p:spPr>${xfrm(box)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln/></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="t"/><a:lstStyle><a:lvl1pPr algn="l" indent="0" marL="0"><a:buNone/>${defRPr(font, size, fill, spacing)}</a:lvl1pPr></a:lstStyle><a:p><a:pPr algn="l" indent="0" marL="0"><a:buNone/></a:pPr><a:r>${rPr(font, size, fill, spacing)}<a:t>${esc(prompt)}</a:t></a:r>${tail}</a:p></p:txBody></p:sp>`;
}

function layout(name: string, shapes: string[]): string {
  const background = `<p:bg><p:bgPr><a:blipFill dpi="0" rotWithShape="1"><a:blip r:embed="rIdBg"/><a:srcRect/><a:stretch><a:fillRect/></a:stretch></a:blipFill><a:effectLst/></p:bgPr></p:bg>`;
  const group = `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sldLayout ${NS} preserve="1"><p:cSld name="${name}">${background}<p:spTree>${group}${shapes.join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
}

function rels(images: Record<string, string>): string {
  const entries = Object.entries(images).map(([id, file]) => `<Relationship Id="${id}" Type="${REL_IMAGE}" Target="../media/${file}"/>`);
  entries.push(`<Relationship Id="rIdMaster" Type="${REL_MASTER}" Target="../slideMasters/slideMaster1.xml"/>`);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${entries.join('')}</Relationships>`;
}

// ---- Pictures --------------------------------------------------------------------------------------------------

/** Background pictures, 1920 × 1080. Cover and divider share one, with the supergraphic at the right bleeding off the bottom. */
async function background(kind: 'kapak' | 'kapanis'): Promise<string> {
  const W = 1920;
  const H = 1080;
  const sg = kind === 'kapanis' ? undefined : { x: 1302, y: 394, height: 845, stroke: 6 };
  const back = bandBackdrop({
    width: W,
    height: H,
    glows: kind === 'kapanis' ? [{ cx: 200, cy: 150, r: 760 }, { cx: W - 260, cy: H - 200, r: 700 }] : [{ cx: 200, cy: 150, r: 760 }, { cx: W - 220, cy: 300, r: 680 }],
    dots: { pitch: 28, radius: 2, fade: kind === 'kapanis' ? 'sides' : 'left' },
    supergraphic: sg,
  });
  return svgDocument({ width: W, height: H, title: `Sunum arka planı · ${kind}`, defs: back.defs, body: back.body, embedFonts: false });
}

/** A display heading with the coral full stop, as a transparent picture (fonts may be missing on the viewer's PC). */
async function headingPicture(value: string, width: number, height: number, size: number, baseline: number, inset: number): Promise<string> {
  return svgDocument({ width, height, title: value, body: text({ x: inset, y: baseline, text: value, font: 'Archivo/600', size, fill: color.bandText, tracking: -0.03, stop: color.accent }) });
}

async function qrCard(size: number): Promise<string> {
  const modules = 29 + 8;
  const m = size / modules;
  return svgDocument({
    width: size,
    height: size,
    title: 'WhatsApp karekodu',
    body: `<rect width="${size}" height="${size}" rx="${round(size * 0.06)}" fill="${color.paper}"/><path fill="${color.ink}" fill-rule="evenodd" d="${qrPath(brand.whatsappUrl.toUpperCase(), 4 * m, 4 * m, 29 * m)}"/>`,
    embedFonts: false,
  });
}

// ---- Layouts ---------------------------------------------------------------------------------------------------

const LOCKUP_TILE = 384048; // 0.42 in
const lockupBox: Box = { x: 457200, y: 411480, cx: Math.round(LOCKUP_TILE * lockupWidth(1)), cy: LOCKUP_TILE };
const coverHeadingBox: Box = { x: 384048, y: 1143000, cx: 3839547, cy: 1143000 };
const closingHeadingBox: Box = { x: 411480, y: 1097280, cx: 4833584, cy: 868680 };
const qrBox: Box = { x: 7086600, y: 2743200, cx: 1600200, cy: 1600200 };
const markBox: Box = { x: 457200, y: 411480, cx: 254309, cy: 411480 };
/** Text column of the band layouts: clear of the supergraphic (which starts at 6.78 in). */
const TEXT_WIDTH = 5486400;

function coverLayout(): string {
  return layout('HD_KAPAK', [
    pic(2, 'Han Dijit', 'rId1', lockupBox),
    pic(3, 'Sunum', 'rId2', coverHeadingBox),
    label(4, { x: 457200, y: 4645152, cx: 2743200, cy: 228600 }, rPr('IBM Plex Mono Medium', 1000, SOFT, 150), brand.web),
    placeholder(5, 104, 'body', { x: 457200, y: 3063240, cx: TEXT_WIDTH, cy: 868680 }, 'Archivo SemiBold', 2200, WHITE, 'Proje adı'),
    placeholder(6, 105, 'body', { x: 457200, y: 4023360, cx: TEXT_WIDTH, cy: 457200 }, 'IBM Plex Mono Medium', 1100, SOFT, 'MÜŞTERİ · TARİH', 150),
  ]);
}

function sectionLayout(): string {
  return layout('HD_BOLUM', [
    pic(2, 'Han Dijit işareti', 'rId1', markBox),
    label(3, { x: 457200, y: 4645152, cx: 2743200, cy: 228600 }, rPr('IBM Plex Mono Medium', 1000, SOFT, 150), brand.web),
    placeholder(4, 102, 'body', { x: 457200, y: 2240280, cx: 2743200, cy: 320040 }, 'IBM Plex Mono Medium', 1200, SOFT, '01', 150),
    placeholder(5, 103, 'title', { x: 457200, y: 2606040, cx: TEXT_WIDTH, cy: 1188720 }, 'Archivo SemiBold', 4000, WHITE, 'Bölüm başlığı', 0, true),
  ]);
}

function closingLayout(): string {
  const mono = rPr('IBM Plex Mono Medium', 1000, SOFT, 150);
  return layout('HD_KAPANIS', [
    pic(2, 'Teşekkürler', 'rId1', closingHeadingBox),
    label(3, { x: 457200, y: 2834640, cx: 3657600, cy: 228600 }, mono, 'TELEFON · WHATSAPP'),
    label(4, { x: 457200, y: 3090672, cx: 4572000, cy: 457200 }, rPr('Archivo SemiBold', 2400, WHITE), brand.phone),
    label(5, { x: 457200, y: 3749040, cx: 3657600, cy: 228600 }, mono, 'WEB'),
    label(6, { x: 457200, y: 4005072, cx: 4572000, cy: 411480 }, rPr('Archivo SemiBold', 2000, WHITE), brand.web),
    pic(7, 'WhatsApp karekodu', 'rId2', qrBox),
    label(8, { x: 7086600, y: 4434840, cx: 1600200, cy: 228600 }, mono, 'WHATSAPP', 'r'),
  ]);
}

// ---- Sample slides -----------------------------------------------------------------------------------------------

/** Re-colours the runs a slide sets explicitly, for the band behind it. */
function recolour(xml: string): string {
  return xml
    .replace(/<a:solidFill><a:schemeClr val="(tx1|bg1)"\/><\/a:solidFill>(<a:latin typeface="IBM Plex Mono Medium")/g, `<a:solidFill><a:srgbClr val="${SOFT}"/></a:solidFill>$2`)
    .replace(/<a:solidFill><a:schemeClr val="(tx1|bg1)"\/><\/a:solidFill>(<a:latin typeface="Archivo SemiBold")/g, `<a:solidFill><a:srgbClr val="${WHITE}"/></a:solidFill>$2`)
    .replace(/<a:ext cx="(5120640|7772400)"/g, `<a:ext cx="${TEXT_WIDTH}"`);
}

/** Adds the coral full stop after a divider title, once. */
function addStop(xml: string): string {
  if (xml.includes(`<a:srgbClr val="${CORAL}"/>`)) return xml;
  return xml.replace(/(type="title"[\s\S]*?<\/a:r>)/, `$1<a:r>${rPr('Archivo SemiBold', 4000, CORAL)}<a:t>.</a:t></a:r>`);
}

// ---- Previews for the guide ---------------------------------------------------------------------------------------

type Overlay = { box: Box; value: string; font: 'Archivo/600' | 'IBM Plex Mono/500'; pt: number; fill: string; spacing?: number; stop?: boolean; anchor?: 'start' | 'end' };

async function preview(bg: string, pictures: { image: Buffer; box: Box }[], overlays: Overlay[]): Promise<string> {
  const ptToPx = (pt: number) => (pt / 72) * 914400 * PX;
  const inner = bg.replace(/^<svg[^>]*>/, '').replace(/<title>[^<]*<\/title>/, '').replace(/<\/svg>\s*$/, '');
  const pics = pictures.map(({ image, box }) => {
    const data = image.toString('base64');
    return `<image x="${round(box.x * PX)}" y="${round(box.y * PX)}" width="${round(box.cx * PX)}" height="${round(box.cy * PX)}" href="data:image/png;base64,${data}"/>`;
  });
  const texts = overlays.map(o => {
    const size = ptToPx(o.pt);
    const top = o.box.y * PX;
    const isCentred = o.box.cy * PX < size * 2;
    const y = isCentred ? top + (o.box.cy * PX - size * 1.2) / 2 + baselineInBox(o.font, size, 1.2) : top + baselineInBox(o.font, size, 1.2);
    const x = o.anchor === 'end' ? (o.box.x + o.box.cx) * PX : o.box.x * PX;
    return text({ x, y, text: o.value, font: o.font, size, fill: o.fill, tracking: (o.spacing ?? 0) / 100 / o.pt, anchor: o.anchor ?? 'start', stop: o.stop ? color.accent : undefined });
  });
  return svgDocument({ width: 1920, height: 1080, title: 'Slayt önizlemesi', body: `${inner}${pics.join('')}${texts.join('')}` });
}

export type SlidePreviews = Record<'cover' | 'section' | 'closing', string>;

export async function buildSlides(): Promise<SlidePreviews> {
  const zip = await JSZip.loadAsync(readFileSync(FILE));
  const put = (name: string, data: string | Buffer) => zip.file(name, data, { date: ZIP_DATE });

  const bgCover = await background('kapak');
  const bgClosing = await background('kapanis');
  const lockupSvg = await svgDocument({ width: lockupWidth(1000), height: 1000, title: 'Han Dijit', body: lockup(0, 0, 1000, 'band'), embedFonts: false });
  const coverHeading = await headingPicture('Sunum', 2400, 714, 600, 560, 34);
  const closingHeading = await headingPicture('Teşekkürler', 2400, 431, 352, 330, 16);
  const markSvg = await svgDocument({ width: 600, height: 971, title: 'Han Dijit işareti', body: mark(0, 0, 971, { body: color.bandText, dot: color.accent }), embedFonts: false });
  const qr = await qrCard(900);

  const media: Record<string, Buffer> = {
    'hd-bant-kapak.png': png(bgCover),
    'hd-bant-kapanis.png': png(bgClosing),
    'hd-karo-logo.png': png(lockupSvg, 1200),
    'hd-baslik-sunum.png': png(coverHeading),
    'hd-baslik-tesekkurler.png': png(closingHeading),
    'hd-isaret-negatif.png': png(markSvg),
    'hd-karekod.png': png(qr),
  };
  for (const [name, data] of Object.entries(media)) put(`ppt/media/${name}`, data);
  for (const old of ['hd-bant-bolum.png', 'image-1002-1.png', 'image-1002-2.png', 'image-1002-3.png', 'image-1003-1.png', 'image-1005-1.png', 'image-1005-2.png']) {
    zip.remove(`ppt/media/${old}`);
  }

  put('ppt/slideLayouts/slideLayout2.xml', coverLayout());
  put('ppt/slideLayouts/_rels/slideLayout2.xml.rels', rels({ rIdBg: 'hd-bant-kapak.png', rId1: 'hd-karo-logo.png', rId2: 'hd-baslik-sunum.png' }));
  put('ppt/slideLayouts/slideLayout3.xml', sectionLayout());
  put('ppt/slideLayouts/_rels/slideLayout3.xml.rels', rels({ rIdBg: 'hd-bant-kapak.png', rId1: 'hd-isaret-negatif.png' }));
  put('ppt/slideLayouts/slideLayout5.xml', closingLayout());
  put('ppt/slideLayouts/_rels/slideLayout5.xml.rels', rels({ rIdBg: 'hd-bant-kapanis.png', rId1: 'hd-baslik-tesekkurler.png', rId2: 'hd-karekod.png' }));

  // Sample slides on the band layouts: their runs carry explicit colours.
  for (let n = 1; n <= 11; n += 1) {
    const relsXml = await zip.file(`ppt/slides/_rels/slide${n}.xml.rels`)!.async('string');
    const layoutNo = /slideLayout(\d+)\.xml/.exec(relsXml)?.[1];
    if (!layoutNo || !['2', '3', '5'].includes(layoutNo)) continue;
    const file = `ppt/slides/slide${n}.xml`;
    let xml = recolour(await zip.file(file)!.async('string'));
    if (layoutNo === '3') xml = addStop(xml);
    put(file, xml);
  }

  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 }, mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  write(FILE, out);

  // Previews of slides 1, 2 and 11 with the template's sample text.
  const lockupPic = { image: media['hd-karo-logo.png']!, box: lockupBox };
  const cover = await preview(bgCover, [lockupPic, { image: media['hd-baslik-sunum.png']!, box: coverHeadingBox }], [
    { box: { x: 457200, y: 3063240, cx: TEXT_WIDTH, cy: 868680 }, value: 'Giyim e-ticaret sitesi ve mobil uygulama', font: 'Archivo/600', pt: 22, fill: color.bandText },
    { box: { x: 457200, y: 4023360, cx: TEXT_WIDTH, cy: 457200 }, value: 'ÖRNEK TEKSTİL A.Ş. · 1 KASIM 2026', font: 'IBM Plex Mono/500', pt: 11, fill: color.bandText2, spacing: 150 },
    { box: { x: 457200, y: 4645152, cx: 2743200, cy: 228600 }, value: brand.web, font: 'IBM Plex Mono/500', pt: 10, fill: color.bandText2, spacing: 150 },
  ]);
  const section = await preview(bgCover, [{ image: media['hd-isaret-negatif.png']!, box: markBox }], [
    { box: { x: 457200, y: 2240280, cx: 2743200, cy: 320040 }, value: '01', font: 'IBM Plex Mono/500', pt: 12, fill: color.bandText2, spacing: 150 },
    { box: { x: 457200, y: 2606040, cx: TEXT_WIDTH, cy: 1188720 }, value: 'Biz kimiz', font: 'Archivo/600', pt: 40, fill: color.bandText, stop: true },
    { box: { x: 457200, y: 4645152, cx: 2743200, cy: 228600 }, value: brand.web, font: 'IBM Plex Mono/500', pt: 10, fill: color.bandText2, spacing: 150 },
  ]);
  const closing = await preview(bgClosing, [{ image: media['hd-baslik-tesekkurler.png']!, box: closingHeadingBox }, { image: media['hd-karekod.png']!, box: qrBox }], [
    { box: { x: 457200, y: 2834640, cx: 3657600, cy: 228600 }, value: 'TELEFON · WHATSAPP', font: 'IBM Plex Mono/500', pt: 10, fill: color.bandText2, spacing: 150 },
    { box: { x: 457200, y: 3090672, cx: 4572000, cy: 457200 }, value: brand.phone, font: 'Archivo/600', pt: 24, fill: color.bandText },
    { box: { x: 457200, y: 3749040, cx: 3657600, cy: 228600 }, value: 'WEB', font: 'IBM Plex Mono/500', pt: 10, fill: color.bandText2, spacing: 150 },
    { box: { x: 457200, y: 4005072, cx: 4572000, cy: 411480 }, value: brand.web, font: 'Archivo/600', pt: 20, fill: color.bandText },
    { box: { x: 7086600, y: 4434840, cx: 1600200, cy: 228600 }, value: 'WHATSAPP', font: 'IBM Plex Mono/500', pt: 10, fill: color.bandText2, spacing: 150, anchor: 'end' },
  ]);
  return { cover, section, closing };
}
