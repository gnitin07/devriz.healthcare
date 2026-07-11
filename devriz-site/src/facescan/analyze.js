// ── Heuristic skin analysis ────────────────────────────────────────────────────
// Real, explainable metrics computed from the captured frame's pixels sampled
// inside face-landmark regions. This is a PRELIMINARY screening — it is framed
// everywhere as "AI screening, not a diagnosis" and always routes to the ₹49
// human consult. Nothing here is a medical claim.

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const round = (v) => Math.round(v);

// Average colour + texture stats for a rectangle of the ImageData.
function sampleRegion(data, W, H, x, y, w, h) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.floor(x + w));
  const y1 = Math.min(H, Math.floor(y + h));
  let n = 0,
    sr = 0,
    sg = 0,
    sb = 0,
    sl = 0,
    sl2 = 0,
    spec = 0;
  const step = Math.max(1, Math.floor((x1 - x0) / 40)); // subsample for speed
  for (let py = y0; py < y1; py += step) {
    for (let px = x0; px < x1; px += step) {
      const i = (py * W + px) * 4;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const mx = Math.max(r, g, b),
        mn = Math.min(r, g, b);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      sr += r;
      sg += g;
      sb += b;
      sl += luma;
      sl2 += luma * luma;
      if (luma > 225 && sat < 0.18) spec++; // bright + desaturated ≈ specular shine
      n++;
    }
  }
  if (!n) return null;
  const mL = sl / n;
  const variance = Math.max(0, sl2 / n - mL * mL);
  return {
    n,
    r: sr / n,
    g: sg / n,
    b: sb / n,
    luma: mL,
    std: Math.sqrt(variance), // texture proxy
    redness: sr / n - (sg / n + sb / n) / 2, // R vs G/B
    specular: spec / n, // shine fraction
  };
}

const bounds = (pts) => {
  const xs = pts.map((p) => p.x),
    ys = pts.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
};

const level = (s) =>
  s >= 80 ? "Excellent" : s >= 65 ? "Good" : s >= 45 ? "Fair" : "Needs care";

// canvas: full captured frame; det: {box, landmarks[68], age, gender}
export function analyzeSkin(canvas, det) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width,
    H = canvas.height;
  const { data } = ctx.getImageData(0, 0, W, H);
  const L = det.landmarks;
  const box = det.box;

  // Landmark groups (68-point model)
  const browsL = L.slice(17, 22);
  const browsR = L.slice(22, 27);
  const nose = L.slice(27, 36);
  const eyeL = L.slice(36, 42);
  const eyeR = L.slice(42, 48);
  const mouth = L.slice(48, 68);

  const bL = bounds(browsL),
    bR = bounds(browsR);
  const eL = bounds(eyeL),
    eR = bounds(eyeR);
  const nB = bounds(nose),
    mB = bounds(mouth);
  const browTop = Math.min(bL.minY, bR.minY);
  const eyeW = eL.maxX - eL.minX || box.width * 0.18;

  // Region rectangles (fall back gracefully to box fractions)
  const foreheadH = Math.max(10, (browTop - box.y) * 0.7);
  const R = {
    forehead: [bL.minX, box.y + (browTop - box.y) * 0.15, bR.maxX - bL.minX, foreheadH],
    tzone: [nB.minX - eyeW * 0.2, nB.minY, nB.maxX - nB.minX + eyeW * 0.4, nB.maxY - nB.minY],
    cheekL: [box.x + box.width * 0.06, eL.maxY + eyeW * 0.2, eyeW * 1.3, eyeW * 1.3],
    cheekR: [eR.minX + eyeW * 0.2, eR.maxY + eyeW * 0.2, eyeW * 1.3, eyeW * 1.3],
    underL: [eL.minX, eL.maxY, eL.maxX - eL.minX, eyeW * 0.5],
    underR: [eR.minX, eR.maxY, eR.maxX - eR.minX, eyeW * 0.5],
    chin: [mB.minX, mB.maxY, mB.maxX - mB.minX, eyeW * 0.9],
  };
  const s = {};
  for (const k in R) s[k] = sampleRegion(data, W, H, ...R[k]);

  // reference "healthy" cheek brightness for relative comparisons
  const cheek = [s.cheekL, s.cheekR].filter(Boolean);
  const cheekLuma = cheek.length
    ? cheek.reduce((a, c) => a + c.luma, 0) / cheek.length
    : 140;

  // ── Metrics (score: higher = healthier) ─────────────────────────────────────
  const metrics = [];
  const push = (key, label, score, note) =>
    metrics.push({ key, label, score: round(clamp(score)), level: level(clamp(score)), note });

  // Oil / shine balance — from T-zone specular highlights
  const shine = ((s.tzone?.specular ?? 0) + (s.forehead?.specular ?? 0)) / 2;
  const oilScore = 100 - shine * 900;
  push(
    "oil",
    "Oil & Shine Balance",
    oilScore,
    shine > 0.06 ? "Visible shine in the T-zone — oil control may help." : "T-zone oil looks well balanced."
  );

  // Evenness / tone — variance of mean colour across facial regions
  const tones = [s.forehead, s.cheekL, s.cheekR, s.chin].filter(Boolean);
  const avgTone = tones.reduce((a, c) => a + c.luma, 0) / (tones.length || 1);
  const toneSpread = Math.sqrt(
    tones.reduce((a, c) => a + (c.luma - avgTone) ** 2, 0) / (tones.length || 1)
  );
  const evenScore = 100 - toneSpread * 3.2;
  push(
    "even",
    "Tone Evenness",
    evenScore,
    toneSpread > 12 ? "Some uneven tone / patchiness detected." : "Skin tone reads fairly even."
  );

  // Redness / sensitivity — cheeks tend to flush first
  const redness = ((s.cheekL?.redness ?? 0) + (s.cheekR?.redness ?? 0)) / 2;
  const redScore = 100 - Math.max(0, redness - 6) * 4;
  push(
    "redness",
    "Redness & Sensitivity",
    redScore,
    redness > 14 ? "Elevated redness — possible sensitivity or irritation." : "Redness within a calm range."
  );

  // Texture / smoothness — local luma std across cheeks + forehead
  const texAreas = [s.cheekL, s.cheekR, s.forehead].filter(Boolean);
  const texture = texAreas.reduce((a, c) => a + c.std, 0) / (texAreas.length || 1);
  const texScore = 100 - Math.max(0, texture - 8) * 3.2;
  push(
    "texture",
    "Texture & Smoothness",
    texScore,
    texture > 18 ? "Uneven texture — pores or roughness may be present." : "Surface texture looks smooth."
  );

  // Dark circles — under-eye darkness relative to cheeks
  const under = [s.underL, s.underR].filter(Boolean);
  const underLuma = under.length
    ? under.reduce((a, c) => a + c.luma, 0) / under.length
    : cheekLuma;
  const darkDrop = Math.max(0, cheekLuma - underLuma);
  const darkScore = 100 - darkDrop * 2.4;
  push(
    "darkcircles",
    "Under-eye Freshness",
    darkScore,
    darkDrop > 18 ? "Noticeable under-eye darkness / puffiness." : "Under-eye area looks fresh."
  );

  // Radiance / glow — healthy brightness without dullness
  const radiance = 100 - Math.abs(avgTone - 165) * 0.9;
  push(
    "radiance",
    "Radiance & Glow",
    radiance,
    avgTone < 120 ? "Skin looks a little dull — could use a glow boost." : "Skin has a healthy natural glow."
  );

  // Symmetry — left vs right cheek luma + brow height
  const symLuma =
    s.cheekL && s.cheekR ? 100 - Math.abs(s.cheekL.luma - s.cheekR.luma) * 1.6 : 82;
  const symBrow = 100 - Math.abs(bL.minY - bR.minY) * 1.2;
  push("symmetry", "Facial Symmetry", (symLuma + symBrow) / 2, "Left/right balance of key facial zones.");

  // Hydration — smooth + not too dull + calm redness
  const hydration = 0.5 * texScore + 0.3 * radiance + 0.2 * redScore;
  push(
    "hydration",
    "Hydration Level",
    hydration,
    hydration < 55 ? "Skin may be under-hydrated." : "Hydration appears adequate."
  );

  // Overall skin health (weighted)
  const weights = {
    oil: 0.12,
    even: 0.15,
    redness: 0.12,
    texture: 0.16,
    darkcircles: 0.1,
    radiance: 0.13,
    symmetry: 0.07,
    hydration: 0.15,
  };
  let overall = 0;
  metrics.forEach((m) => (overall += m.score * (weights[m.key] || 0)));
  overall = round(clamp(overall));

  // Estimated skin age — anchor on face-api age, nudged by skin health
  const baseAge = det.age && det.age > 5 ? det.age : 28;
  const skinAge = round(clamp(baseAge + (70 - overall) * 0.18, 12, 90));

  // Top concerns = lowest-scoring metrics
  const concerns = [...metrics].sort((a, b) => a.score - b.score).slice(0, 3);

  return {
    metrics,
    overall,
    overallLevel: level(overall),
    skinAge,
    concerns,
    detectedAge: baseAge ? round(baseAge) : null,
    gender: det.gender || null,
  };
}

// Map a skin analysis to the closest consult concern chips (matches booking.js CONCERNS)
export function recommendedConcerns(analysis) {
  const map = {
    oil: "Open Pores",
    even: "Uneven Tone",
    redness: "Acne",
    texture: "Open Pores",
    darkcircles: "Under-eye Circles",
    radiance: "Dull Skin",
    hydration: "Dryness",
    symmetry: "Uneven Tone",
  };
  return [...new Set(analysis.concerns.map((c) => map[c.key]).filter(Boolean))];
}
