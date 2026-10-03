// Startar Skepnad-motorn för den byggda appen (dist/).
//   node serve.mjs [--open] [--port 5174] [--exit-when-idle]
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startServer } from './server/main.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const root = join(here, 'dist');
if (!existsSync(join(root, 'index.html'))) {
  console.error('Hittar inte dist/. Bygg först med: npm run build');
  process.exit(1);
}
await startServer({
  root,
  port: Number(args[args.indexOf('--port') + 1]) || Number(process.env.PORT) || 5174,
  open: args.includes('--open'),
  exitWhenIdle: args.includes('--exit-when-idle'),
  extensionDir: join(here, 'extension'),
});
