// Arduino sketches are imported as their source text (next.config.mjs has an
// asset/source rule for .ino), so a page can show the exact file it links to.
declare module '*.ino' {
  const source: string;
  export default source;
}
