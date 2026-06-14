// One-off: rasterize the marketplace icon to a 128x128 PNG.
// Run: npm install sharp --no-save && node scripts/make-icon.js
const sharp = require('sharp');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2b8a9e"/>
      <stop offset="1" stop-color="#1c5f6e"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="26" fill="url(#bg)"/>
  <path d="M64 22 L98 36 V64 C98 87 84 104 64 110 C44 104 30 87 30 64 V36 Z"
        fill="none" stroke="#ffffff" stroke-width="6" stroke-linejoin="round"/>
  <path d="M48 66 L59 77 L82 51"
        fill="none" stroke="#ffffff" stroke-width="7"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .toFile(path.join(__dirname, '..', 'resources', 'icon.png'))
  .then((info) => console.log(`icon.png written: ${info.width}x${info.height}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
