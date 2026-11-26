import path from 'node:path';

import { dir, GUIDE_VERSION } from '../config.ts';
import { write } from '../render.ts';
import { cssVarName, fonts, themes } from '../tokens.ts';

// 07-gelistirici/marka-tokenlari.css: the brand roles of the design tokens for pages outside the website
// (landing pages, e-mail signatures, documents). Variable names are the website's (--hd-*), so CSS moves
// between the two unchanged. Turquoise (highlight) and the UI-only roles are left out on purpose.

const roles = [
  ['primary', 'cobalt: everyday action, link, logo tile'],
  ['primary-hover', ''],
  ['on-primary', ''],
  ['accent', 'coral: the dot and the one conversion button'],
  ['accent-hover', ''],
  ['on-accent', ''],
  ['band-bg', 'band: navy ground'],
  ['band-deep', 'band: deep strip, end of the gradient'],
  ['band-line', 'band: hairline, top of the supergraphic fill'],
  ['band-line-strong', 'band: supergraphic outline, dot grid, eyebrow rules'],
  ['band-text', 'band: headings and text'],
  ['band-text-2', 'band: secondary text, eyebrow'],
  ['text', 'white surfaces: ink'],
  ['text-2', ''],
  ['text-3', ''],
  ['bg-page', 'white surfaces: page'],
  ['bg-surface', 'white surfaces: card, paper'],
  ['border', ''],
] as const;

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
 * Source of truth: @handijitcom/ui/design (themes.light, fonts). The website uses the same values under the
 * same --hd-* names; the band tokens are identical in the light and the dark theme.
 * Turquoise is not part of the brand. Gradients and opacity belong only inside band imagery.
 */
:root {
${lines.join('\n')}

  --hd-font-display: ${fonts.display};
  --hd-font-body: ${fonts.body};
  --hd-font-mono: ${fonts.mono};

  --hd-tile-radius: 27.64%;   /* logo tile and app icon corner */
  --hd-tracking-logo: 0.13em;
  --hd-tracking-eyebrow: 0.153em;
  --hd-tracking-heading: -0.03em;
  --hd-phi: 1.618034;

  /* Band ground: navy into the deep strip */
  --hd-band-gradient: linear-gradient(180deg, var(--hd-band-bg) 0%, var(--hd-band-bg) 55%, var(--hd-band-deep) 100%);
}
`;
  write(path.join(dir.developer, 'marka-tokenlari.css'), css);
}
