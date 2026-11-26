import { buildPrint } from './assets/basili.ts';
import { buildDigital } from './assets/dijital.ts';
import { buildGuide } from './assets/kilavuz.ts';
import { buildLogo } from './assets/logo.ts';
import { buildSlides } from './assets/sunum.ts';
import { buildTokensCss } from './assets/tokenlar.ts';
import { ROOT } from './config.ts';
import { closeBrowser, writtenFiles } from './render.ts';

// Regenerates every asset of the pack from the design tokens, then the guide that shows them.
const started = Date.now();
try {
  buildTokensCss();
  const logos = await buildLogo();
  const digital = await buildDigital();
  const print = await buildPrint();
  const slides = await buildSlides();
  await buildGuide({ logos, digital, print, slides });
} finally {
  await closeBrowser();
}
const files = writtenFiles();
console.info(`${files.length} files written to ${ROOT} in ${((Date.now() - started) / 1000).toFixed(1)} s`);
