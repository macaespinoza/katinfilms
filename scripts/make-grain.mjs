// Grano de los marcos (.frame::after en main.css): PNG de ruido gris, sin dependencias (zlib de Node).
// Sustituye a un SVG con feTurbulence, que se calculaba al pintar y trababa la primera aparición de
// cada marco. Con contraste 0.24 iguala su intensidad medida y es neutro en overlay (no oscurece ni aclara).
//   node scripts/make-grain.mjs public/media/img/grain.png 128 0.24
import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync } from 'node:fs';
const [out, sideArg = '128', kArg = '1'] = process.argv.slice(2);
const k = +kArg; // contraste: 1 = todo el rango; menos = más cerca del gris medio (neutro en overlay)
const side = +sideArg;
// Generador determinista (mulberry32): el mismo grano en cada build
let seed = 0x6b617469;
const rand = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const raw = Buffer.alloc((side + 1) * side);
for (let y = 0; y < side; y++) {
  raw[y * (side + 1)] = 0; // filtro "none" por fila
  for (let x = 0; x < side; x++) {
    // Suma de dos uniformes: grano centrado en el gris medio, como el fractalNoise de feTurbulence
    raw[y * (side + 1) + 1 + x] = Math.round(128 + ((rand() + rand()) / 2 - 0.5) * 255 * k);
  }
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(side, 0); ihdr.writeUInt32BE(side, 4); ihdr[8] = 8; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
writeFileSync(out, png);
console.log(`${out}: ${side}x${side}, ${png.length} bytes`);
