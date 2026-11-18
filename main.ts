import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const source = fileURLToPath(new URL('.', import.meta.url));
const output = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const withinSource = relative(source, output);
const sourceWithinOutput = relative(output, source);
function contained(path: string) {
  return !path || (!path.startsWith('..') && !isAbsolute(path));
}
if (contained(withinSource) || contained(sourceWithinOutput)) {
  throw new Error('Packaging output must be outside the source tree.');
}

const screenshots = readdirSync(join(source, 'screenshots'), { withFileTypes: true });
const screenshotCount = screenshots.length;
if (screenshotCount < 3 || screenshotCount > 4) {
  throw new Error('Expected three or four browser screenshots.');
}
if (screenshots.some(entry => !entry.isFile() || !/\.(png|jpe?g)$/i.test(entry.name))) {
  throw new Error('Screenshots must contain only PNG or JPEG files.');
}

const limits = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};
// Preflight with the exact vendor implementation before writing output.
buildDossier(source, limits);
mkdirSync(output, { recursive: true });
for (const artifact of ['game', 'screenshots']) {
  // Only replace generated artifact directories, after the source preflight passes.
  rmSync(join(output, artifact), { recursive: true, force: true });
  cpSync(join(source, artifact), join(output, artifact), { recursive: true, errorOnExist: true, force: false });
}
writeFileSync(join(output, 'dossier.json'), buildDossier(output, limits));
