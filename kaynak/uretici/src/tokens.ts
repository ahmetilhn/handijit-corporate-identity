import { effectValues, fonts, logos, scales, themes } from '@handijitcom/ui/design';

// Every colour comes from the design tokens of @handijitcom/ui/design (the website's source of truth). The brand
// is cobalt, coral and ink with the neutrals derived from ink; there is no navy, no turquoise and no other hue.
// The cobalt surface (cover, card back, social images) is the primary colour with its deeper steps for depth;
// its glow, dot grid and supergraphic are white at low opacity, drawn in the image itself.
const light = themes.light;

export const color = {
  primary: light.primary,
  primaryHover: light['primary-hover'],
  primaryActive: light['primary-active'],
  onPrimary: light['on-primary'],
  accent: light.accent,
  onAccent: light['on-accent'],
  // Cobalt surface.
  surface: light.primary,
  /** End of the surface gradient (`brand-surface-deep`, as on the website). */
  surfaceDeep: light['brand-surface-deep'],
  /** Facts strip, and the logo tile when it stands on the cobalt surface (cobalt 800). */
  surfaceStrip: light['primary-active'],
  onSurface: light['on-primary'],
  /** Secondary text on the surface: pure white as on the website (no tint keeps 4.5:1 on cobalt 600). */
  onSurface2: light['on-primary'],
  /** Eyebrow rules and strip separators. */
  surfaceRule: scales.cobalt[300],
  stripRule: scales.cobalt[500],
  // White surfaces.
  ink: light.text,
  ink2: light['text-2'],
  ink3: light['text-3'],
  paper: light['bg-surface'],
  page: light['bg-page'],
  border: light.border,
} as const;

/** Opacities of the white drawing on the cobalt surface. */
// The website's recipe (`effectValues.light.brandSurface` of @handijitcom/ui/design), so the pack and the site draw
// the same surface.
const surfaceRecipe = effectValues.light.brandSurface;
export const tint = {
  glow: surfaceRecipe.glow.alpha,
  dots: surfaceRecipe.dots.alpha,
  fillTop: surfaceRecipe.blueprint.fillAlpha,
  fillBottom: 0,
  fillHold: surfaceRecipe.blueprint.hold,
  outline: surfaceRecipe.blueprint.strokeAlpha,
} as const;

export const cobalt = scales.cobalt;
export const coral = scales.coral;
/** Ink and its lightness steps (the neutral scale). */
export const ink = scales.ink;

export { cssVarName, contrast, hexToOklch } from '@handijitcom/ui/design';
export { fonts, logos, themes };
