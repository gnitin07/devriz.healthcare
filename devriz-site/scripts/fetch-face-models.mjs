// Copies the face-api model weights the AI scan needs from the installed
// @vladmandic/face-api package into public/models. Run after installing or
// upgrading the package:  node scripts/fetch-face-models.mjs
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../node_modules/@vladmandic/face-api/model");
const dest = resolve(here, "../public/models");
mkdirSync(dest, { recursive: true });

const nets = ["tiny_face_detector_model", "face_landmark_68_model", "age_gender_model"];
for (const n of nets) {
  for (const f of [`${n}-weights_manifest.json`, `${n}.bin`]) {
    copyFileSync(resolve(src, f), resolve(dest, f));
    console.log("copied", f);
  }
}
console.log("Done → public/models");
