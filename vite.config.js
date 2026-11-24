// Builds the Tailwind-styled version of the extension into dist/.
// Logic modules are shared with ../vietqr-account-manager-extension/src (single source of
// truth); only the view layer (popup layout, list cards, modal/toast/icons) lives here.
import { defineConfig } from 'vite';
import { resolve, basename, join } from 'node:path';
import { cpSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createReadStream } from 'node:fs';

const ROOT = import.meta.dirname;
const BASE_EXTENSION = resolve(ROOT, '../vietqr-account-manager-extension');
const SHARED_SRC = join(BASE_EXTENSION, 'src');
// Static files the shared code loads by URL at runtime (QR libs, OCR model, icons, Apps Script).
const SHARED_ASSET_DIRS = ['lib', 'icons', 'google-apps-script'];
// Shared modules import these view files relatively; point them at the restyled versions.
const VIEW_OVERRIDES = {
  'ui-helpers.js': resolve(ROOT, 'src/ui-helpers.js'),
  'account-list-view.js': resolve(ROOT, 'src/account-list-view.js'),
};

function viewOverrides() {
  return {
    name: 'vietqr-view-overrides',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) return null;
      const target = VIEW_OVERRIDES[basename(source)];
      return target && importer.startsWith(SHARED_SRC) ? target : null;
    },
  };
}

/** Serves the shared static folders in dev and copies them + manifest.json into dist on build. */
function sharedExtensionAssets() {
  let outDir = resolve(ROOT, 'dist');
  return {
    name: 'vietqr-shared-assets',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir); // honours --outDir
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = decodeURIComponent((req.url || '').split('?')[0]);
        const dir = SHARED_ASSET_DIRS.find((d) => path.startsWith(`/${d}/`));
        const file = dir ? join(BASE_EXTENSION, path) : '';
        if (!file || !file.startsWith(BASE_EXTENSION) || !existsSync(file) || !statSync(file).isFile()) return next();
        createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      const out = outDir;
      SHARED_ASSET_DIRS.forEach((dir) => cpSync(join(BASE_EXTENSION, dir), join(out, dir), { recursive: true }));
      const manifest = JSON.parse(readFileSync(join(BASE_EXTENSION, 'manifest.json'), 'utf8'));
      manifest.background = { service_worker: 'background.js', type: 'module' };
      writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [viewOverrides(), sharedExtensionAssets()],
  resolve: { alias: { '@shared': SHARED_SRC } },
  server: { port: 5188, fs: { allow: [ROOT, BASE_EXTENSION] } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome120',
    modulePreload: false, // extension pages load from disk; no preload polyfill needed
    rollupOptions: {
      input: {
        popup: resolve(ROOT, 'popup.html'),
        options: resolve(ROOT, 'options.html'),
        background: join(SHARED_SRC, 'background.js'),
      },
      output: {
        // Chrome needs a fixed service-worker path; other chunks keep hashed names.
        entryFileNames: (chunk) => (chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
});
