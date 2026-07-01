// Dependency-free PWA icon generator.
// Produces solid pink PNGs with a subtle chat-bubble mark using a raw PNG encoder.
// Run: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

// Encode an RGBA pixel buffer (width*height*4) into a PNG.
function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // rest zero (compression, filter, interlace)
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function makeIcon(size, maskable) {
  const rgba = Buffer.alloc(size * size * 4);
  const pad = maskable ? 0 : Math.round(size * 0.0); // full-bleed background
  const radius = size * 0.22;
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Diagonal indigo gradient background (#818cf8 → #4338ca).
      const t = (x + y) / (2 * size);
      let r = lerp(0x81, 0x43, t);
      let g = lerp(0x8c, 0x38, t);
      let b = lerp(0xf8, 0xca, t);
      let a = 255;

      // Rounded corners (only when not maskable — maskable keeps full square).
      if (!maskable) {
        const rx = Math.max(pad - x, x - (size - 1 - pad), 0);
        const ry = Math.max(pad - y, y - (size - 1 - pad), 0);
        // corner rounding
        const inCornerX = x < radius ? radius - x : x > size - radius ? x - (size - radius) : 0;
        const inCornerY = y < radius ? radius - y : y > size - radius ? y - (size - radius) : 0;
        if (inCornerX > 0 && inCornerY > 0) {
          const d = Math.hypot(inCornerX, inCornerY);
          if (d > radius) a = 0;
        }
        void rx;
        void ry;
      }

      // White chat bubble in the center.
      const bw = size * 0.5;
      const bh = size * 0.36;
      const bx0 = cx - bw / 2;
      const by0 = cy - bh / 2 - size * 0.03;
      if (x >= bx0 && x <= bx0 + bw && y >= by0 && y <= by0 + bh) {
        r = 255;
        g = 255;
        b = 255;
      }
      // three dots
      const dotY = by0 + bh / 2;
      for (let d = -1; d <= 1; d++) {
        const dx = cx + d * size * 0.12;
        if (Math.hypot(x - dx, y - dotY) < size * 0.028) {
          r = 0x4f;
          g = 0x46;
          b = 0xe5;
        }
      }

      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = a;
    }
  }
  return encodePng(size, size, rgba);
}

writeFileSync(join(outDir, 'icon-192.png'), makeIcon(192, false));
writeFileSync(join(outDir, 'icon-512.png'), makeIcon(512, false));
writeFileSync(join(outDir, 'icon-512-maskable.png'), makeIcon(512, true));
console.log('Generated PWA icons in', outDir);
