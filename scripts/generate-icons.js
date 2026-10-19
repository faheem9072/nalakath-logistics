const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  const svgPath = path.join(publicDir, 'nalakath-logo.svg');
  const svgRaw = fs.readFileSync(svgPath, 'utf8');

  // Strip outer <svg ...>, </svg>, and the outer circle so it doesn't leave an offset arc
  const svgInner = svgRaw
    .replace(/<\?xml[^>]*\?>/gi, '')
    .replace(/<svg[^>]*>/gi, '')
    .replace(/<\/svg>/gi, '')
    .replace(/<circle[^>]*r="145"[^>]*\/>/gi, '')
    .replace(/<!-- Outer circular black background -->/gi, '');

  // Midpoint of logo graphic is (168.5, 152).
  // Target center of 512x512 is (256, 256).
  // Scale factor: 2.0x gives 374px width on 512px canvas (73% width), perfectly inside iOS/Android safe zones.
  const paddedSvg = `<svg viewBox="0 0 512 512" width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <!-- Solid deep background matching Nalakath dark brand theme -->
  <rect width="512" height="512" fill="#0A0A0A" />
  
  <g transform="translate(256, 256) scale(2.0) translate(-168.5, -152)">
    ${svgInner}
  </g>
</svg>`;

  console.log('Rendering 512x512...');
  await sharp(Buffer.from(paddedSvg))
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'icon-512.png'));

  console.log('Rendering 192x192...');
  await sharp(Buffer.from(paddedSvg))
    .resize(192, 192)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'icon-192.png'));

  console.log('Rendering 180x180 (apple-touch-icon)...');
  await sharp(Buffer.from(paddedSvg))
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('Rendering favicon-32x32...');
  await sharp(Buffer.from(paddedSvg))
    .resize(32, 32)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  console.log('All icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
