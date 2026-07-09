import { useState } from "react";

/**
 * Right-side visual for a hero slide. Tries the drop-in PNG first
 * (/images/hero-visual-<key>.png); if missing, renders a built-in
 * medical line-art illustration so the slide always communicates.
 */

const S = {
  line: "#e9f2ee",
  dim: "#9db8b0",
  amber: "#e8a33d",
  teal: "#2e8f86",
};

const Illustrations = {
  // face with magnified skin circle
  skin: (
    <svg viewBox="0 0 420 340" fill="none" aria-hidden>
      <ellipse cx="160" cy="170" rx="88" ry="112" stroke={S.line} strokeWidth="3" />
      <path d="M118 150c8-10 26-10 34 0M188 150c8-10 26-10 34 0" stroke={S.line} strokeWidth="3" strokeLinecap="round" />
      <path d="M152 196c5 6 15 6 20 0" stroke={S.line} strokeWidth="3" strokeLinecap="round" />
      <path d="M96 120c10-52 118-52 128 0" stroke={S.line} strokeWidth="3" strokeLinecap="round" />
      <circle cx="205" cy="215" r="6" fill={S.amber} opacity=".9" />
      <line x1="211" y1="211" x2="292" y2="164" stroke={S.dim} strokeWidth="2" strokeDasharray="5 5" />
      <circle cx="322" cy="148" r="58" stroke={S.amber} strokeWidth="3" fill="#0e3b3a55" />
      <circle cx="304" cy="132" r="5" fill={S.amber} />
      <circle cx="332" cy="150" r="7" fill={S.amber} opacity=".7" />
      <circle cx="314" cy="168" r="4" fill={S.amber} opacity=".5" />
      <circle cx="342" cy="128" r="3.5" fill={S.amber} opacity=".6" />
      <text x="322" y="230" textAnchor="middle" fill={S.dim} fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Pigmentation · Acne</text>
    </svg>
  ),

  // head with scalp magnifier
  hair: (
    <svg viewBox="0 0 420 340" fill="none" aria-hidden>
      <path d="M92 260c0-96 24-150 78-150s78 54 78 150" stroke={S.line} strokeWidth="3" strokeLinecap="round" />
      <path d="M96 128c18-46 130-46 148 0" stroke={S.line} strokeWidth="3" strokeLinecap="round" />
      <path d="M120 108c14-10 24-10 34-4M160 96c14-8 26-8 36 0M204 102c12-4 22-2 30 6" stroke={S.dim} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="176" cy="96" r="6" fill={S.amber} />
      <line x1="182" y1="92" x2="268" y2="70" stroke={S.dim} strokeWidth="2" strokeDasharray="5 5" />
      <circle cx="316" cy="88" r="58" stroke={S.amber} strokeWidth="3" fill="#0e3b3a55" />
      <path d="M296 116v-32M312 118v-40M328 116v-34M344 112v-26" stroke={S.line} strokeWidth="3" strokeLinecap="round" />
      <circle cx="296" cy="80" r="4" fill={S.amber} />
      <circle cx="312" cy="74" r="4" fill={S.amber} />
      <circle cx="328" cy="78" r="4" fill={S.amber} />
      <circle cx="344" cy="82" r="4" fill={S.amber} />
      <text x="316" y="180" textAnchor="middle" fill={S.dim} fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Hair fall · Dandruff</text>
    </svg>
  ),

  // shoulder/back with texture magnifier
  body: (
    <svg viewBox="0 0 420 340" fill="none" aria-hidden>
      <path d="M70 300c6-70 40-96 78-108 26-8 40-24 44-48" stroke={S.line} strokeWidth="3" strokeLinecap="round" />
      <path d="M192 144c2-26 22-44 48-44 30 0 52 24 50 56-2 38-24 56-24 92v52" stroke={S.line} strokeWidth="3" strokeLinecap="round" />
      <circle cx="150" cy="216" r="6" fill={S.amber} />
      <line x1="156" y1="212" x2="252" y2="196" stroke={S.dim} strokeWidth="2" strokeDasharray="5 5" />
      <circle cx="306" cy="188" r="58" stroke={S.amber} strokeWidth="3" fill="#0e3b3a55" />
      <circle cx="290" cy="172" r="4" fill={S.amber} opacity=".8" />
      <circle cx="316" cy="180" r="6" fill={S.amber} opacity=".6" />
      <circle cx="300" cy="204" r="5" fill={S.amber} opacity=".7" />
      <circle cx="326" cy="206" r="3.5" fill={S.amber} opacity=".5" />
      <text x="306" y="270" textAnchor="middle" fill={S.dim} fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Body care · Texture</text>
    </svg>
  ),

  // AI face scan: grid + brackets + score
  ai: (
    <svg viewBox="0 0 420 340" fill="none" aria-hidden>
      <ellipse cx="190" cy="176" rx="82" ry="104" stroke={S.line} strokeWidth="3" />
      <path d="M152 158c7-9 23-9 30 0M218 158c7-9 23-9 30 0" stroke={S.line} strokeWidth="3" strokeLinecap="round" />
      <path d="M180 200c6 6 14 6 20 0" stroke={S.line} strokeWidth="3" strokeLinecap="round" />
      <path d="M120 132c8-46 132-46 140 0" stroke={S.line} strokeWidth="3" strokeLinecap="round" />
      <path d="M124 150h132M124 186h132M124 222h132M156 96v192M190 88v200M224 96v190" stroke={S.teal} strokeWidth="1.5" opacity=".55" />
      <path d="M92 76h-24v24M288 76h24v24M92 292h-24v-24M288 292h24v-24" stroke={S.amber} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="86" y1="176" x2="296" y2="176" stroke={S.amber} strokeWidth="2.5" opacity=".9">
        <animate attributeName="y1" values="100;250;100" dur="4s" repeatCount="indefinite" />
        <animate attributeName="y2" values="100;250;100" dur="4s" repeatCount="indefinite" />
      </line>
      <rect x="300" y="128" width="88" height="60" rx="12" fill="#0e3b3acc" stroke={S.teal} strokeWidth="2" />
      <text x="344" y="155" textAnchor="middle" fill={S.line} fontFamily="Inter, sans-serif" fontSize="13" fontWeight="600">Skin score</text>
      <text x="344" y="178" textAnchor="middle" fill={S.amber} fontFamily="Antonio, sans-serif" fontSize="22" fontWeight="700">82%</text>
      <text x="190" y="320" textAnchor="middle" fill={S.dim} fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Free AI face scan</text>
    </svg>
  ),
};

const SlideVisual = ({ visual }) => {
  const [imgFailed, setImgFailed] = useState(false);
  if (!visual) return null;

  return (
    <div className="hero-visual">
      <div className="visual-glow" />
      {!imgFailed ? (
        <img
          src={`/images/hero-visual-${visual}.png`}
          alt=""
          aria-hidden
          draggable={false}
          onError={() => setImgFailed(true)}
        />
      ) : (
        Illustrations[visual] || null
      )}
    </div>
  );
};

export default SlideVisual;
