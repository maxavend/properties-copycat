// Renders the Figma Community images (publish/icon.png, cover.png, carousel-*.png) with headless Chrome.
// The cover and carousel embed the real UI, so run `npm run build` first (`npm run listing` does).
// Set CHROME to the browser binary if it is not in the default macOS location.
//
// Screenshots go through the DevTools protocol: `--window-size` + `--screenshot` leaves the
// viewport shorter than the window, so pages were laid out at the wrong height.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url).pathname;
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const CAROUSEL = 7;
const PAGES = [
  ['publish/src/cover.html', 'publish/cover.png', [1920, 1080]],
  ...Array.from({ length: CAROUSEL }, (_, i) =>
    [`publish/src/carousel-${i + 1}.html`, `publish/carousel-${i + 1}.png`, [1920, 1080]])
];

async function connect(profile) {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !(existsSync(portFile) && readFileSync(portFile, 'utf8').includes('\n')); i++) await sleep(100);
  const [port, path] = readFileSync(portFile, 'utf8').split('\n');
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

  let nextId = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) {
      listeners.forEach((listener) => listener(msg));
    }
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const once = (method, sessionId) => new Promise((resolve) => {
    const listener = (msg) => {
      if (msg.method === method && msg.sessionId === sessionId) {
        listeners.splice(listeners.indexOf(listener), 1);
        resolve(msg.params);
      }
    };
    listeners.push(listener);
  });
  return { ws, send, once };
}

async function screenshot({ send, once }, url, out, [width, height]) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] }, sessionId);
  await send('Page.enable', {}, sessionId);
  const loaded = once('Page.loadEventFired', sessionId);
  await send('Page.navigate', { url }, sessionId);
  await loaded;
  await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => true)', awaitPromise: true }, sessionId);
  await sleep(1500); // the embedded UI renders after its own load and messages
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(out, Buffer.from(data, 'base64'));
  await send('Target.closeTarget', { targetId });
  console.log(`${out.replace(root, '')} (${width}×${height})`);
}

const work = mkdtempSync(join(tmpdir(), 'listing-'));
const browser = spawn(chrome, [
  '--headless', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--force-dark-mode',
  '--remote-debugging-port=0', `--user-data-dir=${join(work, 'profile')}`, 'about:blank'
], { stdio: 'ignore' });

try {
  const cdp = await connect(join(work, 'profile'));

  const iconPage = join(work, 'icon.html');
  writeFileSync(iconPage, `<!doctype html><style>html,body{margin:0}img{display:block}</style>
<img src="${pathToFileURL(join(root, 'publish/icon.svg')).href}" width="128" height="128">`);
  await screenshot(cdp, pathToFileURL(iconPage).href, join(root, 'publish/icon.png'), [128, 128]);

  for (const [page, out, size] of PAGES) {
    await screenshot(cdp, pathToFileURL(join(root, page)).href, join(root, out), size);
  }
  cdp.ws.close();
} finally {
  browser.kill();
  await sleep(300);
  rmSync(work, { recursive: true, force: true });
}
