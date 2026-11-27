import path from 'node:path';

import { dir, GUIDE_VERSION } from '../config.ts';
import { write } from '../render.ts';
import { cobalt, color, contrast, coral, cssVarName, fonts, ink, themes } from '../tokens.ts';

// 07-gelistirici/marka-tokenlari.css: the brand roles of the design tokens for pages outside the website
// (landing pages, e-mail signatures, documents). Role names are the website's (--hd-*), so CSS moves between the
// two unchanged. Only cobalt, coral and ink (with its neutral steps) are brand colours: status and chart roles
// are left out on purpose.

const roles = [
  ['primary', 'cobalt 600: everyday action, link, logo tile, cobalt surface'],
  ['primary-hover', 'cobalt 700: end of the surface gradient'],
  ['primary-active', 'cobalt 800: facts strip, tile on the cobalt surface'],
  ['on-primary', 'text on cobalt'],
  ['primary-soft', ''],
  ['primary-text', ''],
  ['accent', 'coral: the dot, the full stop and the one conversion button'],
  ['accent-hover', ''],
  ['on-accent', 'ink on coral'],
  ['text', 'ink'],
  ['text-2', ''],
  ['text-3', ''],
  ['bg-page', ''],
  ['bg-surface', 'paper'],
  ['border', ''],
] as const;

function scale(name: string, values: Record<string | number, string>): string[] {
  return Object.entries(values).map(([step, value]) => `  --hd-${name}-${step}: ${value};`);
}

export function buildTokensCss(): void {
  const light = themes.light as Record<string, string>;
  const width = Math.max(...roles.map(([role]) => cssVarName(role).length));
  const lines = roles.map(([role, note]) => {
    const value = light[role];
    if (!value) throw new Error(`Token ${role} is missing in @handijitcom/ui/design`);
    const declaration = `  ${`${cssVarName(role)}:`.padEnd(width + 1)} ${value};`;
    return note ? `${declaration} /* ${note} */` : declaration;
  });
  const css = `/*
 * Han Dijit brand tokens · corporate identity ${GUIDE_VERSION}
 *
 * Generated, do not edit: run \`npm run uret\` in kaynak/uretici.
 * Source of truth: @handijitcom/ui/design (themes.light, scales, fonts); the website uses the same role names.
 * The palette is cobalt, coral and ink with ink's neutral steps. No navy, no turquoise, no other hue.
 * Gradients and opacity belong only inside cobalt-surface imagery (glow, dot grid, supergraphic).
 */
:root {
${lines.join('\n')}

  /* Cobalt surface: secondary text and rules (cobalt 50: ${contrast(color.onSurface2, color.primary).toFixed(2)}:1 on cobalt 600) */
  --hd-surface-text-2: ${color.onSurface2};
  --hd-surface-rule: ${color.surfaceRule};
  --hd-surface-gradient: linear-gradient(180deg, var(--hd-primary) 0%, var(--hd-primary) 50%, var(--hd-primary-hover) 100%);

  /* Scales */
${scale('cobalt', cobalt).join('\n')}
${scale('coral', coral).join('\n')}
${scale('ink', ink).join('\n')}

  --hd-font-display: ${fonts.display};
  --hd-font-body: ${fonts.body};
  --hd-font-mono: ${fonts.mono};

  --hd-tile-radius: 27.64%;   /* logo tile and app icon corner */
  --hd-tracking-logo: 0.13em;
  --hd-tracking-eyebrow: 0.153em;
  --hd-tracking-heading: -0.03em;
  --hd-phi: 1.618034;
}
`;
  write(path.join(dir.developer, 'marka-tokenlari.css'), css);
}
