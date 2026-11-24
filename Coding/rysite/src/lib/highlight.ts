// Just enough C/C++ highlighting to read a sketch: comments, strings and
// preprocessor lines. Every character of the source lands in exactly one
// segment, in order, so the listing can never alter the code it shows.

export type Kind = 'code' | 'comment' | 'string' | 'pp';

export interface Segment {
  text: string;
  kind: Kind;
}

/** Splits each line into segments. Every character lands in exactly one segment, in order. */
export function tokenize(source: string): Segment[][] {
  let inBlock = false;
  return source
    .replace(/\r\n/g, '\n')
    .replace(/\n$/, '')
    .split('\n')
    .map((line) => {
      const segs: Segment[] = [];
      const push = (text: string, kind: Kind) => {
        if (text) segs.push({ text, kind });
      };
      const isPP = !inBlock && /^\s*#/.test(line);
      let code = '';
      const flush = () => {
        push(code, isPP ? 'pp' : 'code');
        code = '';
      };
      let i = 0;
      while (i < line.length) {
        if (inBlock) {
          const end = line.indexOf('*/', i);
          const stop = end < 0 ? line.length : end + 2;
          push(line.slice(i, stop), 'comment');
          if (end >= 0) inBlock = false;
          i = stop;
          continue;
        }
        const ch = line[i];
        const next = line[i + 1];
        if (ch === '/' && next === '/') {
          flush();
          push(line.slice(i), 'comment');
          i = line.length;
        } else if (ch === '/' && next === '*') {
          flush();
          inBlock = true;
          push('/*', 'comment');
          i += 2;
        } else if (ch === '"' || ch === "'") {
          flush();
          let j = i + 1;
          while (j < line.length && line[j] !== ch) j += line[j] === '\\' ? 2 : 1;
          const stop = Math.min(j + 1, line.length);
          push(line.slice(i, stop), 'string');
          i = stop;
        } else {
          code += ch;
          i++;
        }
      }
      flush();
      return segs;
    });
}
