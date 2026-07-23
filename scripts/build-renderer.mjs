// Bundles the renderer (UI + Monaco workers) with esbuild and copies static assets.
import { build } from 'esbuild';
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, 'dist', 'renderer');
const minify = process.argv.includes('--minify');
mkdirSync(out, { recursive: true });

// Monaco ships language/editor web-workers that must be bundled as separate entry points.
const workerEntry = {
  'editor.worker': 'monaco-editor/esm/vs/editor/editor.worker.js',
  'json.worker': 'monaco-editor/esm/vs/language/json/json.worker.js',
  'ts.worker': 'monaco-editor/esm/vs/language/typescript/ts.worker.js',
};

await build({
  entryPoints: {
    renderer: join(root, 'src', 'renderer', 'renderer.ts'),
    ...workerEntry,
  },
  bundle: true,
  minify,
  format: 'iife',
  platform: 'browser',
  target: 'chrome122',
  outdir: out,
  loader: { '.ttf': 'file', '.png': 'file', '.svg': 'file' },
  logLevel: 'info',
});

// Static files
cpSync(join(root, 'src', 'renderer', 'index.html'), join(out, 'index.html'));
cpSync(join(root, 'src', 'renderer', 'styles.css'), join(out, 'styles.css'));
if (existsSync(join(root, 'assets'))) {
  cpSync(join(root, 'assets'), join(out, 'assets'), { recursive: true });
}
console.log('renderer built ->', out);
