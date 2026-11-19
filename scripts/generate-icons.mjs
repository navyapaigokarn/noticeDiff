import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = paint(x, y, size);
      const index = row + 1 + x * 4;
      raw[index] = r;
      raw[index + 1] = g;
      raw[index + 2] = b;
      raw[index + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function insideRoundedRect(x, y, size, radius) {
  const left = radius;
  const right = size - radius - 1;
  const top = radius;
  const bottom = size - radius - 1;
  if (x >= left && x <= right) return y >= 0 && y < size;
  if (y >= top && y <= bottom) return x >= 0 && x < size;
  const cx = x < left ? left : right;
  const cy = y < top ? top : bottom;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function paint(x, y, size) {
  const radius = Math.round(size * 0.22);
  if (!insideRoundedRect(x, y, size, radius)) return [0, 0, 0, 0];
  const nx = x / size;
  const ny = y / size;
  const line = (target, thickness) => Math.abs(ny - target) < thickness && nx > 0.22 && nx < 0.78;
  if (line(0.36, 0.045)) return [255, 255, 255, 255];
  if (line(0.52, 0.045) && nx < 0.62) return [255, 255, 255, 255];
  if (line(0.68, 0.045) && nx < 0.55) return [255, 255, 255, 255];
  const dot = (nx - 0.72) ** 2 + (ny - 0.68) ** 2;
  if (dot < 0.012) return [52, 211, 153, 255];
  return [55, 48, 163, 255];
}

const directory = path.resolve('public');
fs.mkdirSync(directory, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  fs.writeFileSync(path.join(directory, `icon-${size}.png`), png(size, paint));
}
