import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';

// Use the existing Vite loader for .txt?raw maps. Middleware mode opens no HTTP listener.
const loader = await createServer({
  configFile: false,
  server: { middlewareMode: true, watch: null, hmr: false },
  appType: 'custom',
  logLevel: 'error',
});
try {
  const { checkMaps, formatMapCheck } = (await loader.ssrLoadModule(
    '/src/game/map-check.ts',
  )) as typeof import('../src/game/map-check.ts');
  const report = checkMaps();
  const summary = formatMapCheck(report);
  const output = resolve(process.argv[2] ?? 'output/map-checks');
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(resolve(output, 'report.txt'), summary);
  console.log(summary);
  console.log(`Full traces and clue proofs: ${resolve(output, 'report.json')}`);
  if (report.errors.length) process.exitCode = 1;
} finally {
  await loader.close();
}
