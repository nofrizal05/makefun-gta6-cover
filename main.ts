// Vice City Nights — the entry program for make.fun's gta6-cover-art-01.
// Node 22, standard library only. It hands the app in: it copies this
// repository's app/ (the offline cover maker) and screenshots/ (its captures)
// into the output directory and writes /output/dossier.json with buildDossier
// from the kit's vendored library, so the judge can read the entry.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader MAKEFUN_OUTPUT_DIR is unset and the output is /output.
// The run is deterministic: the same files in always give the same bytes out.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(from, to) {
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree(join(repoRoot, 'app'), join(outputDir, 'app'));
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));
}

// The gate's caps from the kit (reference/gate.json): at most 4 screenshots of
// at most 256 KiB, app/ at most 993 files and 48 MiB, paths at most 1000 bytes,
// and the dossier text at most 160 KiB. Anything over a cap is refused here
// before the scorer ever sees it, so a bad hand-in fails loudly and early.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`Vice City Nights handed in: ${outputDir}/dossier.json (${dossier.length} bytes)`);
