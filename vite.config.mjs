import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The bundled FigUI3 and icon code is MIT: their notices must ship with the plugin
const notices = readFileSync(new URL('./THIRD_PARTY_NOTICES.md', import.meta.url), 'utf8').replaceAll('--', '—');

// Figma loads the UI as a single HTML string, so everything is inlined into dist/ui.html
export default defineConfig({
  root: 'ui',
  base: './',
  plugins: [
    viteSingleFile(),
    {
      name: 'rename-ui-html',
      enforce: 'post',
      generateBundle(_options, bundle) {
        const html = bundle['index.html'];
        if (!html) return;
        html.fileName = 'ui.html';
        html.source = String(html.source).replace(/^(<!DOCTYPE html>)/i, `$1\n<!--\n${notices}\n-->`);
      }
    }
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2020'
  }
});
