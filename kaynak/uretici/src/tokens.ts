import { fonts, logos, themes } from '@handijitcom/ui/design';

// Every colour comes from the design tokens of @handijitcom/ui/design (the website's source of truth). The band
// tokens are the same in both themes; the light theme supplies the ink and paper of the white surfaces.
// Turquoise (the `highlight` role) is not part of the brand and is never read here.
const light = themes.light;

export const color = {
  primary: light.primary,
  primaryHover: light['primary-hover'],
  onPrimary: light['on-primary'],
  accent: light.accent,
  onAccent: light['on-accent'],
  band: light['band-bg'],
  bandDeep: light['band-deep'],
  bandLine: light['band-line'],
  bandLineStrong: light['band-line-strong'],
  bandText: light['band-text'],
  bandText2: light['band-text-2'],
  ink: light.text,
  ink2: light['text-2'],
  ink3: light['text-3'],
  paper: light['bg-surface'],
  page: light['bg-page'],
  border: light.border,
} as const;

export { cssVarName } from '@handijitcom/ui/design';
export { fonts, logos, themes };
