import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

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
        if (html) html.fileName = 'ui.html';
      }
    }
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2020'
  }
});
