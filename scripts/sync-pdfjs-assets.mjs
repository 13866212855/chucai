#!/usr/bin/env node
/**
 * Sync the client-side PDF.js runtime from node_modules/pdfjs-dist into public/.
 *
 * - public/pdf.min.js / public/pdf.worker.min.js  (library + worker, same version as the package)
 * - public/pdfjs/cmaps/                           (CJK CMaps needed to extract text from Chinese PDFs)
 * - public/pdfjs/standard_fonts/                  (standard fonts needed to render pages)
 *
 * Runs automatically on `npm run dev` and `npm run build` (predev / prebuild hooks).
 * Deliberately NOT a postinstall hook: the Dockerfile runs `npm install` before the sources
 * are copied, where this file does not exist yet. Keeping these assets same-origin avoids the public
 * CDNs (jsdelivr / cdnjs), which are unreachable on many domestic networks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const pdfjsDir = path.join(projectRoot, 'node_modules', 'pdfjs-dist');
const publicDir = path.join(projectRoot, 'public');

function log(msg) {
  console.log(`[sync-pdfjs-assets] ${msg}`);
}

function copyDir(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
}

function main() {
  if (!fs.existsSync(pdfjsDir)) {
    log(`node_modules/pdfjs-dist not found, skipped (run npm install first).`);
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(pdfjsDir, 'package.json'), 'utf8'));
  const buildDir = path.join(pdfjsDir, 'build');

  for (const file of ['pdf.min.js', 'pdf.worker.min.js']) {
    const src = path.join(buildDir, file);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing ${src}`);
    }
    fs.copyFileSync(src, path.join(publicDir, file));
  }

  copyDir(path.join(pdfjsDir, 'cmaps'), path.join(publicDir, 'pdfjs', 'cmaps'));
  copyDir(path.join(pdfjsDir, 'standard_fonts'), path.join(publicDir, 'pdfjs', 'standard_fonts'));

  const cmapCount = fs.readdirSync(path.join(publicDir, 'pdfjs', 'cmaps')).length;
  log(`pdfjs-dist@${pkg.version} -> public/ (pdf.min.js, pdf.worker.min.js, ${cmapCount} cmaps, standard_fonts).`);
}

try {
  main();
} catch (err) {
  // Never break the build because of asset syncing: the app still works for non-CJK PDFs.
  console.warn(`[sync-pdfjs-assets] WARNING: ${err?.message || err}`);
}
