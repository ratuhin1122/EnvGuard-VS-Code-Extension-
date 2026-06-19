// Builds an animated slideshow GIF from the static screenshots in views/.
// Usage: node scripts/make-gif.js
// Requires (dev-only): sharp, gifenc  ->  npm install --no-save sharp gifenc

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

const VIEWS = path.join(__dirname, '..', 'views');
const OUT = path.join(VIEWS, 'demo.gif');

// Frame order: full view first, then each highlighted section.
const FRAMES = ['4.png', '1.png', '2.png', '3.png'];

// Common canvas. 4.png is the largest (913x957); everything is fit inside it.
const WIDTH = 913;
const HEIGHT = 957;
const BG = { r: 255, g: 255, b: 255, alpha: 1 }; // flatten onto white (matches GitHub/Marketplace)
const DELAY_MS = 1800; // time each frame is shown

async function main() {
  const gif = GIFEncoder();

  for (const name of FRAMES) {
    const input = path.join(VIEWS, name);
    const { data } = await sharp(input)
      .resize(WIDTH, HEIGHT, { fit: 'contain', background: BG })
      .flatten({ background: BG })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const palette = quantize(data, 256, { format: 'rgba4444' });
    const index = applyPalette(data, palette, 'rgba4444');
    gif.writeFrame(index, WIDTH, HEIGHT, { palette, delay: DELAY_MS });
    console.log(`+ ${name}`);
  }

  gif.finish();
  fs.writeFileSync(OUT, Buffer.from(gif.bytes()));
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`\nWrote ${path.relative(path.join(__dirname, '..'), OUT)} (${kb} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
