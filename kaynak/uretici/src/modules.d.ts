// subset-font ships no types.
declare module 'subset-font' {
  type Options = { targetFormat?: 'sfnt' | 'woff' | 'woff2'; preserveNameIds?: number[]; variationAxes?: Record<string, number> };
  export default function subsetFont(font: Buffer, text: string, options?: Options): Promise<Buffer>;
}
