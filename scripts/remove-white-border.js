/**
 * Makes edge-connected near-white pixels transparent (outer canvas).
 * Does not affect white inside the icon (cart, etc.) — blocked by non-white gradient.
 */
const { Jimp } = require('jimp');
const path = require('path');

const THRESHOLD = 248;

async function main() {
  const input = process.argv[2] || path.join(__dirname, '../assets/images/zoomcart-logo.png');
  const output = process.argv[3] || input;

  const img = await Jimp.read(input);
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  const data = img.bitmap.data;

  const whiteLike = (byteIndex) => {
    const r = data[byteIndex];
    const g = data[byteIndex + 1];
    const b = data[byteIndex + 2];
    return r >= THRESHOLD && g >= THRESHOLD && b >= THRESHOLD;
  };

  const visited = new Uint8Array(w * h);
  const q = [];

  const push = (i) => {
    if (visited[i]) return;
    const bi = i * 4;
    if (!whiteLike(bi)) return;
    visited[i] = 1;
    q.push(i);
  };

  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + (w - 1));
  }

  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi];
    const x = i % w;
    const y = (i / w) | 0;
    if (x > 0) {
      const ni = i - 1;
      if (!visited[ni]) push(ni);
    }
    if (x + 1 < w) {
      const ni = i + 1;
      if (!visited[ni]) push(ni);
    }
    if (y > 0) {
      const ni = i - w;
      if (!visited[ni]) push(ni);
    }
    if (y + 1 < h) {
      const ni = i + w;
      if (!visited[ni]) push(ni);
    }
  }

  for (let i = 0; i < visited.length; i++) {
    if (visited[i]) data[i * 4 + 3] = 0;
  }

  await img.write(output);
  console.log('Wrote', output, `(${w}x${h})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
