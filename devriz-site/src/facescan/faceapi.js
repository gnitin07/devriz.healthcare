// ── face-api.js loader (isolated to the /ai-scan route) ────────────────────────
// Everything in this folder is code-split: importing it pulls face-api + the
// model weights into a SEPARATE chunk that the main site never downloads.
//
// Models are SELF-HOSTED in /public/models (served from your own domain, cached
// immutably by the /models/* rule already in vercel.json — no third-party CDN at
// runtime). If you upgrade @vladmandic/face-api, re-copy the weights with
// `node scripts/fetch-face-models.mjs`.
import * as faceapi from "@vladmandic/face-api";

export const MODEL_URL = "/models";

let loadPromise = null;

// Load exactly the three nets the report needs, once, and cache the promise so
// repeat scans don't re-download.
export function loadModels() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
    ]);
    return true;
  })().catch((err) => {
    loadPromise = null; // allow a retry on failure
    throw err;
  });
  return loadPromise;
}

const detectorOptions = () =>
  new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 });

// Run a full detection (box + 68 landmarks + age/gender) on a video/image/canvas.
// Returns null when no face is found.
export async function detect(input) {
  const res = await faceapi
    .detectSingleFace(input, detectorOptions())
    .withFaceLandmarks()
    .withAgeAndGender();
  if (!res) return null;
  return {
    box: res.detection.box, // {x, y, width, height}
    score: res.detection.score,
    landmarks: res.landmarks.positions.map((p) => ({ x: p.x, y: p.y })),
    age: res.age,
    gender: res.gender,
    genderProbability: res.genderProbability,
  };
}

export { faceapi };
