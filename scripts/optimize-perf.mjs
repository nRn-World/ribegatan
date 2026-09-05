/**
 * Performance optimization for ribegatan homepage:
 * - Generate WebP (+ compressed fallbacks) for heavy images
 * - Patch index.html: preload LCP, lazy-load, non-blocking fonts/icons
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'index.html');

const JOBS = [
  // Hero / LCP candidates
  { rel: 'ribegatan.se/res/Standard/ribehead.png', maxWidth: 620, quality: 82 },
  { rel: 'logo-removebg-preview.png', maxWidth: 280, quality: 80 },
  // Welcome / gallery drones
  { rel: 'ribegatan.se/res/Bilderhost/Drone1.jpg', maxWidth: 1200, quality: 72 },
  { rel: 'ribegatan.se/res/Bilderhost/Drone2.jpg', maxWidth: 1200, quality: 72 },
  { rel: 'ribegatan.se/res/Bilderhost/Drone3.jpg', maxWidth: 1200, quality: 72 },
  { rel: 'ribegatan.se/res/Bilderhost/Drone4.jpg', maxWidth: 1200, quality: 72 },
  // Thumbs for drone switcher (small)
  { rel: 'ribegatan.se/res/Bilderhost/Drone1.jpg', maxWidth: 240, quality: 70, suffix: '-thumb' },
  { rel: 'ribegatan.se/res/Bilderhost/Drone2.jpg', maxWidth: 240, quality: 70, suffix: '-thumb' },
  { rel: 'ribegatan.se/res/Bilderhost/Drone3.jpg', maxWidth: 240, quality: 70, suffix: '-thumb' },
  { rel: 'ribegatan.se/res/Bilderhost/Drone4.jpg', maxWidth: 240, quality: 70, suffix: '-thumb' },
  // Other heavy images
  { rel: 'ribegatan.se/res/Grannsamverkan/P1030922.png', maxWidth: 900, quality: 75 },
  { rel: 'ribegatan.se/res/Bilderkvarteretbygg/byggstartribe.png', maxWidth: 1000, quality: 75 },
  { rel: 'ribegatan.se/res/Bilderkvarteretbygg/histo_bild2.png', maxWidth: 1000, quality: 75 },
  { rel: 'ribegatan.se/res/Bilderkvarteretbygg/histo_bild3.png', maxWidth: 1000, quality: 75 },
  { rel: 'ribegatan.se/res/Bilderkvarteretbygg/histo_bild4.png', maxWidth: 1000, quality: 75 },
  { rel: 'ribegatan.se/res/Bilderkvarteretbygg/histo_bild5.png', maxWidth: 1000, quality: 75 },
  { rel: 'ribegatan.se/res/Bilderkvarteretbygg/histo_bild6.png', maxWidth: 1000, quality: 75 },
  { rel: 'ribegatan.se/res/Bilderlekplats/1_planritningribe3lekplats.png', maxWidth: 1000, quality: 75 },
  { rel: 'ribegatan.se/res/Bilderlekplats/4_lekplats3.png', maxWidth: 1000, quality: 75 },
  { rel: 'ribegatan.se/res/Bilderlekplats/5_lekplats3.png', maxWidth: 1000, quality: 75 },
  { rel: 'ribegatan.se/res/Bilderlekplats/6_lekplats3.png', maxWidth: 1000, quality: 75 },
  { rel: 'ribegatan.se/res/Bilderlekplats/7_lekplats3.png', maxWidth: 1000, quality: 75 },
  { rel: 'ribegatan.se/res/Bilderlekplats/8_lekplats3.png', maxWidth: 1000, quality: 75 },
  { rel: 'ribegatan.se/res/Renovering/bottenstycke.jpg', maxWidth: 1000, quality: 75 },
  { rel: 'boappa.png', maxWidth: 400, quality: 80 },
];

function webpPath(rel, suffix = '') {
  const ext = path.extname(rel);
  return rel.slice(0, -ext.length) + suffix + '.webp';
}

async function optimizeOne(job) {
  const input = path.join(root, job.rel);
  if (!fs.existsSync(input)) {
    console.warn('SKIP missing:', job.rel);
    return null;
  }
  const outRel = webpPath(job.rel, job.suffix || '');
  const output = path.join(root, outRel);
  const before = fs.statSync(input).size;
  await sharp(input)
    .rotate()
    .resize({ width: job.maxWidth, withoutEnlargement: true })
    .webp({ quality: job.quality, effort: 6 })
    .toFile(output);
  const after = fs.statSync(output).size;
  console.log(
    `${(before / 1024).toFixed(0).padStart(6)} KB → ${(after / 1024).toFixed(0).padStart(5)} KB  ${outRel}`
  );
  return outRel;
}

function patchHead(html) {
  // Already patched?
  if (html.includes('ribehead.webp" fetchpriority="high"') && html.includes("media=\"print\" onload=\"this.media='all'\"")) {
    return html;
  }

  const faRe = /[ \t]*<link rel="stylesheet" href="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.4\.0\/css\/all\.min\.css">\r?\n/;
  const fontsRe = /[ \t]*<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Playfair\+Display:[^"]+" rel="stylesheet">\r?\n/;
  const mobileRe = /[ \t]*<link rel="stylesheet" href="mobile\.css">\r?\n/;
  const iconRe = /[ \t]*<link rel="icon" type="image\/png" href="logo-removebg-preview\.png">/;

  if (!faRe.test(html) || !fontsRe.test(html)) {
    throw new Error('Could not find expected Font Awesome / Google Fonts links to patch');
  }

  const newHeadLinks = `    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
    <link rel="preload" as="image" type="image/webp" href="ribegatan.se/res/Standard/ribehead.webp" fetchpriority="high">
    <link rel="preload" as="image" type="image/webp" href="logo-removebg-preview.webp" fetchpriority="high">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&amp;family=Inter:wght@400;500;600&amp;display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <noscript><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&amp;family=Inter:wght@400;500;600&amp;display=swap" rel="stylesheet"></noscript>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></noscript>
    <link rel="stylesheet" href="mobile.css">
    <link rel="icon" type="image/webp" href="logo-removebg-preview.webp">`;

  html = html.replace(faRe, '');
  html = html.replace(fontsRe, '');
  html = html.replace(mobileRe, '');
  html = html.replace(iconRe, newHeadLinks);
  return html;
}

function toWebpSrc(src) {
  return src.replace(/\.(png|jpe?g)$/i, '.webp');
}

function patchImages(html) {
  // Hero LCP images: high priority, eager
  html = html.replace(
    /<img class="hero-head-logo" src="ribegatan\.se\/res\/Standard\/ribehead\.(?:png|webp)"[^>]*>/,
    `<img class="hero-head-logo" src="ribegatan.se/res/Standard/ribehead.webp" width="620" height="114" alt="Ribe Samfällighet" fetchpriority="high" decoding="async">`
  );
  html = html.replace(
    /<img src="logo-removebg-preview\.(?:png|webp)"[^>]*aria-hidden="true"[^>]*>/,
    `<img src="logo-removebg-preview.webp" width="280" height="280" alt="" aria-hidden="true" fetchpriority="high" decoding="async">`
  );

  // Main welcome image
  html = html.replace(
    /id="mainWelcomeImage" src="ribegatan\.se\/res\/Bilderhost\/Drone1\.(?:jpg|webp)"[^>]*(?=>)/,
    `id="mainWelcomeImage" src="ribegatan.se/res/Bilderhost/Drone1.webp" width="1200" height="899" loading="lazy" decoding="async"`
  );

  // Thumbnail strip: use -thumb.webp and update onclick targets to webp
  for (let i = 1; i <= 4; i++) {
    const jpg = `ribegatan.se/res/Bilderhost/Drone${i}.jpg`;
    const webp = `ribegatan.se/res/Bilderhost/Drone${i}.webp`;
    const thumb = `ribegatan.se/res/Bilderhost/Drone${i}-thumb.webp`;
    html = html.replace(
      new RegExp(`src="ribegatan\\.se/res/Bilderhost/Drone${i}(?:-thumb)?\\.(?:jpg|webp)" alt="Drönarbild ${i}"[^>]*`, 'g'),
      `src="${thumb}" alt="Drönarbild ${i}" width="120" height="80" loading="lazy" decoding="async"`
    );
    html = html.replaceAll(
      `document.getElementById('mainWelcomeImage').src = '${jpg}'`,
      `document.getElementById('mainWelcomeImage').src = '${webp}'`
    );
    html = html.replaceAll(
      `document.getElementById('mainWelcomeImage').src = '${webp}'`,
      `document.getElementById('mainWelcomeImage').src = '${webp}'`
    );
  }

  // Generic: remaining png/jpg in img src → webp + lazy (skip already patched)
  html = html.replace(/<img\b([^>]*?)>/gi, (full, attrs) => {
    if (/hero-head-logo|logo-removebg-preview\.webp|mainWelcomeImage|Drone\d-thumb\.webp/.test(attrs)) {
      return full;
    }
    let next = attrs;
    const srcMatch = next.match(/\bsrc="([^"]+)"/i);
    if (!srcMatch) return full;
    const src = srcMatch[1];
    if (/\.webp$/i.test(src)) {
      if (!/\bloading=/.test(next)) next += ' loading="lazy"';
      if (!/\bdecoding=/.test(next)) next += ' decoding="async"';
      return `<img${next}>`;
    }
    if (!/\.(png|jpe?g)$/i.test(src)) {
      // gif etc: still lazy if missing
      if (!/\bloading=/.test(next)) {
        next += ' loading="lazy" decoding="async"';
      }
      return `<img${next}>`;
    }
    const webp = toWebpSrc(src);
    next = next.replace(src, webp);
    if (!/\bloading=/.test(next)) next += ' loading="lazy"';
    if (!/\bdecoding=/.test(next)) next += ' decoding="async"';
    return `<img${next}>`;
  });

  return html;
}

async function main() {
  console.log('Optimizing images…');
  for (const job of JOBS) {
    await optimizeOne(job);
  }

  console.log('\nPatching index.html…');
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = patchHead(html);
  html = patchImages(html);
  fs.writeFileSync(htmlPath, html);

  const sizeKb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log(`Done. index.html is now ${sizeKb} KB.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
