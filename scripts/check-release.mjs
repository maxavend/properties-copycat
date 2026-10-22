// Checks that the built plugin is ready to submit from Figma's "Publish" dialog.
// Run with `npm run release` (builds and lints first).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (file) => readFileSync(join(root, file), 'utf8');
const mtime = (file) => statSync(join(root, file)).mtimeMs;

const problems = [];
const ok = [];
const check = (condition, message) => (condition ? ok : problems).push(message);

const manifest = JSON.parse(read('manifest.json'));

check(Boolean(manifest.name), `manifest: nombre "${manifest.name}"`);
check(/^\d+$/.test(manifest.id ?? ''), `manifest: id ${manifest.id}`);
check(manifest.documentAccess === 'dynamic-page', 'manifest: documentAccess "dynamic-page"');
check(Array.isArray(manifest.networkAccess?.allowedDomains), 'manifest: networkAccess declarado');
check(Array.isArray(manifest.editorType) && manifest.editorType.length > 0, `manifest: editorType ${JSON.stringify(manifest.editorType)}`);

for (const key of ['main', 'ui']) {
  check(existsSync(join(root, manifest[key])), `manifest.${key}: ${manifest[key]} existe`);
}

// The files Figma uploads must be built from the current sources
const newest = (dir) => Math.max(...readdirSync(join(root, dir)).map(f => mtime(join(dir, f))));
if (existsSync(join(root, manifest.main))) {
  check(mtime(manifest.main) >= mtime('code.ts'), `${manifest.main} está compilado desde el code.ts actual`);
}
if (existsSync(join(root, manifest.ui))) {
  check(mtime(manifest.ui) >= newest('ui'), `${manifest.ui} está compilado desde ui/ actual`);

  const html = read(manifest.ui);
  const allowed = new Set(['http://www.w3.org/2000/svg', 'https://fig.local']);
  const urls = [...new Set(html.match(/https?:\/\/[a-zA-Z0-9.-]+[^\s"'`)<>]*/g) ?? [])]
    .filter(url => ![...allowed].some(a => url.startsWith(a)))
    .filter(url => !/^https:\/\/github\.com\//.test(url)); // license notices
  const allowsNetwork = manifest.networkAccess.allowedDomains.some(d => d !== 'none');
  check(allowsNetwork || urls.length === 0, `la UI no carga recursos externos${urls.length ? `: ${urls.slice(0, 3).join(', ')}` : ''}`);
  check(html.includes('Rogie King') && html.includes('Yuan Qing Lim'), 'la UI incluye los avisos de licencias de terceros');

  const kb = Math.round(Buffer.byteLength(html) / 1024);
  ok.push(`tamaño de ${manifest.ui}: ${kb} KB`);
}

// Listing images (recommended sizes from Figma's publishing guide)
function pngSize(file) {
  const buffer = readFileSync(join(root, file));
  return buffer.toString('ascii', 1, 4) === 'PNG' ? [buffer.readUInt32BE(16), buffer.readUInt32BE(20)] : null;
}
const LISTING_IMAGES = [
  ['publish/icon.png', [128, 128]],
  ['publish/cover.png', [1920, 1080]],
  ...Array.from({ length: 7 }, (_, i) => [`publish/carousel-${i + 1}.png`, [1920, 1080]])
];
for (const [file, [w, h]] of LISTING_IMAGES) {
  const size = existsSync(join(root, file)) ? pngSize(file) : null;
  const matches = Boolean(size) && size[0] === w && size[1] === h;
  const actual = size ? ` (es ${size[0]}×${size[1]})` : ' (no existe o no es PNG)';
  check(matches, `${file}: ${w}×${h} PNG${matches ? '' : actual}`);
}

for (const message of ok) console.log(`✓ ${message}`);
for (const message of problems) console.log(`✗ ${message}`);
console.log(problems.length ? `\n${problems.length} problema(s) antes de publicar.` : '\nListo para publicar desde Figma: Plugins → Manage plugins → Publish.');
process.exit(problems.length ? 1 : 0);
