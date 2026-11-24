// Scenario links. The page is static, so a link has to carry the whole
// scenario itself: the inputs that differ from the defaults and the prism
// list, plus which solution and carton to open. It is compressed with the
// browser's built-in deflate, base64url-encoded and put in the URL hash, which
// is never sent to a server. The optimizer is deterministic, so reopening the
// link reproduces the same cartons; a fingerprint of them travels along to
// catch the case where a later version of the optimizer would not.

import type { SolutionK } from './engine';

export interface SharePayload {
  /** Form fields that differ from the defaults. */
  f: Record<string, unknown>;
  /** Prism rows as entered: name, width, height, depth, usage, per carton. */
  p: string[][];
  /** Carton SKU count to show. */
  k?: number;
  /** Carton label to open at. */
  c?: string;
  /** Drawing number and revision the link was printed on. */
  d?: string;
  r?: string;
  /** Fingerprint of the solution's cartons when the link was made. */
  fp?: string;
}

/** The hash key: `#cpk=<token>`. */
export const HASH_KEY = 'cpk';

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: GenericTransformStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

const canCompress = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

/** Token for the hash: `1.` + deflated JSON, or `0.` + plain JSON where deflate is unavailable. */
export async function encodePayload(payload: SharePayload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  if (canCompress()) return `1.${toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))}`;
  return `0.${toBase64Url(json)}`;
}

/** Inverse of encodePayload; null for anything malformed. */
export async function decodePayload(token: string): Promise<SharePayload | null> {
  try {
    const dot = token.indexOf('.');
    const version = token.slice(0, dot);
    const body = fromBase64Url(token.slice(dot + 1));
    let json: Uint8Array;
    if (version === '1') {
      if (!canCompress()) return null;
      json = await pipe(body, new DecompressionStream('deflate-raw'));
    } else if (version === '0') {
      json = body;
    } else {
      return null;
    }
    const data = JSON.parse(new TextDecoder().decode(json)) as SharePayload | null;
    if (!data || typeof data !== 'object' || typeof data.f !== 'object' || data.f === null) return null;
    const rowsOk = Array.isArray(data.p) && data.p.every((r) => Array.isArray(r) && r.every((x) => typeof x === 'string'));
    return rowsOk ? data : null;
  } catch {
    return null;
  }
}

/** The token in a location hash such as `#cpk=1.abc`, or null. */
export function tokenFromHash(hash: string): string | null {
  const m = hash.match(new RegExp(`[#&]${HASH_KEY}=([0-9]\\.[A-Za-z0-9_-]+)`));
  return m ? m[1] : null;
}

export function shareUrl(base: string, token: string): string {
  return `${base}#${HASH_KEY}=${token}`;
}

/**
 * Short hash of what a solution's cartons are: each carton's inside dims and
 * which prisms it holds (by size and usage), how many per carton. Row ids
 * and names are left out: ids differ between sessions, and a link too long
 * for a QR code drops the names.
 */
export function solutionFingerprint(sol: SolutionK): string {
  const r = (v: number) => (Math.round(v * 100) / 100).toString();
  const text = [...sol.cartons]
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((c) => {
      const members = c.members
        .map((m) => `${r(m.prism.width)}x${r(m.prism.height)}x${r(m.prism.depth)}@${r(m.prism.usage)}*${m.unitsPerCarton}`)
        .sort()
        .join(',');
      return `${c.label}:${r(c.inner.l)}x${r(c.inner.w)}x${r(c.inner.d)}:${members}`;
    })
    .join(';');
  // FNV-1a, 32-bit.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${sol.k}-${(h >>> 0).toString(36)}`;
}
