import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const modulePath = process.argv[2];
if (!modulePath) {
  throw new Error('Pass the installed Pele module path as the first argument.');
}

const { render } = await import(pathToFileURL(resolve(modulePath)).href);
const source = await readFile(
  new URL('./architecture.mmd', import.meta.url),
  'utf8',
);
const result = render(source, {
  fontFamily: 'Arial, sans-serif',
  fontSize: 16,
  autoDirection: false,
  padding: 28,
  idPrefix: 'metiers360-architecture',
});

// Keep the SVG readable when embedded as an image without the host page's CSS.
const theme = [
  '--pele-bg:#ffffff',
  '--pele-fg:#172033',
  '--pele-muted:#475569',
  '--pele-line:#64748b',
  '--pele-surface:#f8fafc',
  '--pele-surface-alt:#eff6ff',
  '--pele-border:#94a3b8',
  '--pele-accent:#1d4ed8',
  'background:#ffffff',
].join(';');
const svg = result.svg.replace('style="', `style="${theme};`);
await writeFile(new URL('./architecture.svg', import.meta.url), `${svg}\n`);
console.log(`Pele rendered ${result.type}: ${result.width} × ${result.height}`);
