import { Resvg } from '@resvg/resvg-js';

import { type FontKey, measure } from './fonts.ts';
import { contrast } from './tokens.ts';

// Legibility guard for the cobalt surface. White and cobalt 50 sit only a little above 4.5:1 on cobalt 600, so a
// glow or the dot grid drifting under small text would break it. Each text is checked against the lightest pixel
// of the image beneath it (the same SVG with its text removed); a text below its threshold stops the run.

const toHex = (r: number, g: number, b: number) => `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;

export type Legibility = { worst: number; text: string };

export function checkLegibility(name: string, svg: string, width: number, renderWidth = width): Legibility {
  const texts = [...svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)];
  const ground = new Resvg(svg.replace(/<text\b[\s\S]*?<\/text>/g, '').replace(/<style>[\s\S]*?<\/style>/, ''), { fitTo: { mode: 'width', value: renderWidth } }).render();
  const scale = ground.width / width;
  const { pixels } = ground;
  let worst: Legibility = { worst: 21, text: '' };
  for (const [, attrs, raw] of texts) {
    const attr = (key: string) => new RegExp(`${key}="([^"]+)"`).exec(attrs!)?.[1];
    const fill = attr('fill')!;
    const content = raw!.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
    const size = Number(attr('font-size'));
    const spacing = Number(attr('letter-spacing') ?? 0);
    const font = `${attr('font-family')}/${attr('font-weight')}` as FontKey;
    const w = measure(content, font, size, spacing / size);
    const anchor = attr('text-anchor') ?? 'start';
    const x0 = Number(attr('x')) - (anchor === 'middle' ? w / 2 : anchor === 'end' ? w : 0);
    const y = Number(attr('y'));
    // Small text needs 4.5:1, large text (24 px and up, or 18.7 px bold) 3:1 (WCAG 1.4.3).
    const threshold = size >= 24 ? 3 : 4.5;
    let lightest = 21;
    for (let py = Math.max(0, Math.floor((y - size * 0.75) * scale)); py < Math.min(ground.height, Math.ceil(y * scale)); py += 1) {
      for (let px = Math.max(0, Math.floor(x0 * scale)); px < Math.min(ground.width, Math.ceil((x0 + w) * scale)); px += 2) {
        const i = (py * ground.width + px) * 4;
        const ratio = contrast(fill, toHex(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!));
        if (ratio < lightest) lightest = ratio;
      }
    }
    if (lightest < threshold) throw new Error(`${name}: "${content}" is ${lightest.toFixed(2)}:1 on its ground (needs ${threshold}:1)`);
    if (size < 24 && lightest < worst.worst) worst = { worst: lightest, text: content };
  }
  return worst;
}
