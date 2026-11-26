import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { Resvg } from '@resvg/resvg-js';
import { PDFDocument, PDFName, PDFNumber, type PDFPage } from 'pdf-lib';
import { type Browser, chromium } from 'playwright';

import { ROOT } from './config.ts';
import { fontPaths } from './fonts.ts';

// Fixed document date, so a regeneration without changes keeps the PDFs byte-stable.
const DOCUMENT_DATE = new Date('2026-11-27T09:00:00+03:00');
const MM_TO_PT = 72 / 25.4;

const written: string[] = [];

export function write(file: string, data: string | Buffer | Uint8Array): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, data);
  written.push(path.relative(ROOT, file));
}

export function writtenFiles(): string[] {
  return written;
}

/** SVG → PNG with resvg and the brand fonts (no system fonts, so a missing glyph shows up as a gap). */
export function png(svg: string, width?: number): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: width ? { mode: 'width', value: width } : { mode: 'original' },
    font: { loadSystemFonts: false, fontFiles: fontPaths, defaultFontFamily: 'Inter' },
    shapeRendering: 2,
    textRendering: 1,
    imageRendering: 0,
  });
  return resvg.render().asPng();
}

// One browser for the whole run; the promise is shared so parallel callers do not launch their own.
let browser: Promise<Browser> | undefined;

export function getBrowser(): Promise<Browser> {
  browser ??= chromium.launch();
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) await (await browser).close();
  browser = undefined;
}

/** One PDF page per SVG, printed by Chromium (vector, fonts embedded as subsets). Sizes in mm. */
export type PdfPart = { bytes: Uint8Array; width: number; height: number };

export async function pdfPages(pages: { svg: string; width: number; height: number }[]): Promise<PdfPart[]> {
  const page = await (await getBrowser()).newPage();
  const out: PdfPart[] = [];
  for (const { svg, width, height } of pages) {
    await page.setContent(
      `<!doctype html><meta charset="utf-8"><style>@page{size:${width}mm ${height}mm;margin:0}html,body{margin:0;padding:0}svg{display:block;width:${width}mm;height:${height}mm}</style>${svg}`,
    );
    await page.evaluate(() => document.fonts.ready);
    const bytes = await page.pdf({ width: `${width}mm`, height: `${height}mm`, printBackground: true, preferCSSPageSize: true });
    out.push({ bytes, width, height });
  }
  await page.close();
  return out;
}

export type PdfMeta = { title: string; subject?: string; trimInset?: number };

function setBox(page: PDFPage, name: 'TrimBox' | 'BleedBox', inset: number): void {
  const { width, height } = page.getSize();
  const box = [inset, inset, width - inset, height - inset].map(value => PDFNumber.of(Number(value.toFixed(3))));
  page.node.set(PDFName.of(name), page.doc.context.obj(box));
}

/**
 * Merges single-page PDFs onto pages of the exact size in mm (Chromium rounds its page size to the CSS pixel grid;
 * the printed page is placed as a vector form, so nothing is rasterised), sets trim and bleed boxes (inset in mm)
 * and the document metadata.
 */
export async function assemblePdf(parts: PdfPart[], meta: PdfMeta): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const part of parts) {
    const source = await PDFDocument.load(part.bytes);
    const width = part.width * MM_TO_PT;
    const height = part.height * MM_TO_PT;
    for (const embedded of await doc.embedPdf(part.bytes, source.getPageIndices())) {
      const page = doc.addPage([width, height]);
      // Chromium's page is a fraction of a point larger; the content starts at its top-left corner, at true size.
      page.drawPage(embedded, { x: 0, y: height - embedded.height });
    }
  }
  for (const page of doc.getPages()) {
    setBox(page, 'BleedBox', 0);
    setBox(page, 'TrimBox', (meta.trimInset ?? 0) * MM_TO_PT);
  }
  doc.setTitle(meta.title);
  doc.setAuthor('Han Dijit');
  doc.setSubject(meta.subject ?? 'Han Dijit kurumsal kimlik');
  doc.setCreator('Han Dijit kurumsal kimlik üreticisi');
  doc.setProducer('Chromium · pdf-lib');
  doc.setCreationDate(DOCUMENT_DATE);
  doc.setModificationDate(DOCUMENT_DATE);
  return doc.save({ useObjectStreams: false });
}

/** Screenshot of an HTML page (guide previews of print and office files). */
export async function screenshot(html: string, width: number, height: number, scale = 1): Promise<Buffer> {
  const page = await (await getBrowser()).newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const shot = await page.screenshot({ type: 'png' });
  await page.close();
  return shot;
}
