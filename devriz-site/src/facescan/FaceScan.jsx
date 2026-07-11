import { useCallback, useEffect, useRef, useState } from "react";
import { useBooking } from "../lib/BookingContext";
import { loadModels, detect } from "./faceapi";
import { analyzeSkin } from "./analyze";
import { buildReportPdf, toDataUrl } from "./report";
import { submitFaceScanLead, makeTicketId } from "../lib/booking";
import "./facescan.css";

const scoreHex = (s) =>
  s >= 80 ? "#2e8b57" : s >= 65 ? "#5a8c28" : s >= 45 ? "#e8a33d" : "#c85a3c";

// phases: intro → scanning → details → analyzing → report | error
export default function FaceScan() {
  const { openBooking } = useBooking();
  const [phase, setPhase] = useState("intro");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [form, setForm] = useState({ name: "", mobile: "" });
  const [analyzePct, setAnalyzePct] = useState(0);
  const [ticketId] = useState(makeTicketId);

  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const stableRef = useRef(0);
  const capturedRef = useRef(false);
  const fileRef = useRef(null);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Draw detection landmarks onto the overlay canvas (native-res coords).
  const drawOverlay = useCallback((det, vw, vh) => {
    const cv = overlayRef.current;
    if (!cv) return;
    if (cv.width !== vw) cv.width = vw;
    if (cv.height !== vh) cv.height = vh;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, vw, vh);
    if (!det) return;
    const { box, landmarks } = det;
    ctx.strokeStyle = "rgba(246,197,107,0.9)";
    ctx.lineWidth = Math.max(2, vw / 260);
    const r = 10;
    ctx.beginPath();
    ctx.roundRect?.(box.x, box.y, box.width, box.height, r);
    ctx.stroke();
    ctx.fillStyle = "rgba(232,163,61,0.85)";
    const dot = Math.max(1.5, vw / 360);
    landmarks.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, dot, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  // Freeze the current frame, run a final detection on it, analyze.
  const captureFrom = useCallback(
    async (source, vw, vh) => {
      if (capturedRef.current) return;
      capturedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      const canvas = document.createElement("canvas");
      canvas.width = vw;
      canvas.height = vh;
      canvas.getContext("2d").drawImage(source, 0, 0, vw, vh);

      setStatus("Reading your skin…");
      let det = await detect(canvas);
      if (!det) {
        capturedRef.current = false;
        setError(
          "We couldn't clearly detect a face. Please use good, even lighting, face the camera straight on, and try again."
        );
        setPhase("error");
        return;
      }
      const result = analyzeSkin(canvas, det);
      setAnalysis(result);
      setPhotoUrl(canvas.toDataURL("image/jpeg", 0.9));
      stopCamera();
      setPhase("details");
    },
    [stopCamera]
  );

  const loop = useCallback(() => {
    const v = videoRef.current;
    if (!v || v.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    const vw = v.videoWidth,
      vh = v.videoHeight;
    (async () => {
      const det = await detect(v);
      drawOverlay(det, vw, vh);
      // "good" face = confident, large enough, roughly centred
      const good =
        det &&
        det.score > 0.5 &&
        det.box.width > vw * 0.24 &&
        det.box.x + det.box.width / 2 > vw * 0.3 &&
        det.box.x + det.box.width / 2 < vw * 0.7;
      if (good) {
        stableRef.current += 1;
        setStatus(
          stableRef.current < 6
            ? "Face detected — hold still…"
            : "Capturing…"
        );
        if (stableRef.current >= 8) {
          captureFrom(v, vw, vh);
          return;
        }
      } else {
        stableRef.current = 0;
        setStatus("Center your face inside the oval");
      }
      rafRef.current = requestAnimationFrame(loop);
    })();
  }, [drawOverlay, captureFrom]);

  const startScan = useCallback(async () => {
    setError("");
    capturedRef.current = false;
    stableRef.current = 0;
    setPhase("scanning");
    setStatus("Loading AI models…");
    try {
      await loadModels();
    } catch {
      setError(
        "The AI models failed to load. Check your internet connection and try again."
      );
      setPhase("error");
      return;
    }
    try {
      setStatus("Requesting camera…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      v.srcObject = stream;
      await v.play();
      setStatus("Center your face inside the oval");
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setError(
        "Camera access was blocked. Allow camera permission, or use “Upload a photo instead” below."
      );
      setPhase("error");
    }
  }, [loop]);

  // Fallback: analyze an uploaded photo (no camera needed).
  const onFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setPhase("scanning");
    setStatus("Loading AI models…");
    try {
      await loadModels();
    } catch {
      setError("The AI models failed to load. Check your connection and retry.");
      setPhase("error");
      return;
    }
    const img = new Image();
    img.onload = async () => {
      capturedRef.current = false;
      await captureFrom(img, img.naturalWidth, img.naturalHeight);
    };
    img.onerror = () => {
      setError("That image couldn't be read. Try a different photo.");
      setPhase("error");
    };
    img.src = URL.createObjectURL(file);
  }, [captureFrom]);

  const submitDetails = useCallback(
    async (e) => {
      e.preventDefault();
      const name = form.name.trim();
      const mobile = form.mobile.trim();
      if (name.length < 2) return setError("Please enter your name.");
      if (!/^[0-9]{10}$/.test(mobile.replace(/\D/g, "").slice(-10)))
        return setError("Please enter a valid 10-digit mobile number.");
      setError("");
      // best-effort lead log (never blocks the UX)
      submitFaceScanLead({
        ticketId,
        name,
        mobile,
        overall: analysis?.overall,
        skinAge: analysis?.skinAge,
        concerns: analysis?.concerns?.map((c) => c.label).join(", "),
      });
      setPhase("analyzing");
      setAnalyzePct(0);
    },
    [form, analysis, ticketId]
  );

  // Analyzing theatrics → reveal report
  useEffect(() => {
    if (phase !== "analyzing") return;
    let p = 0;
    const id = setInterval(() => {
      p += Math.random() * 14 + 6;
      if (p >= 100) {
        p = 100;
        clearInterval(id);
        setTimeout(() => setPhase("report"), 350);
      }
      setAnalyzePct(Math.round(p));
    }, 260);
    return () => clearInterval(id);
  }, [phase]);

  const downloadPdf = useCallback(async () => {
    setStatus("Preparing your PDF…");
    // PNG keeps the logo's transparency (JPEG would render it as a black block).
    const logo = await toDataUrl("/images/logo-r.png", 240, "image/png");
    const origin = window.location.origin;
    const doc = buildReportPdf({
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      ticketId,
      analysis,
      photoDataUrl: photoUrl,
      logo,
      consultUrl: `${origin}/consult`, // ₹49 booking landing page
      websiteUrl: origin,
    });
    doc.save(`Devriz-Skin-Report-${ticketId}.pdf`);
    setStatus("");
  }, [analysis, photoUrl, form, ticketId]);

  const restart = () => {
    stopCamera();
    capturedRef.current = false;
    stableRef.current = 0;
    setAnalysis(null);
    setPhotoUrl(null);
    setForm({ name: "", mobile: "" });
    setError("");
    setPhase("intro");
  };

  return (
    <div className="fs-wrap">
      <div className="fs-card">
        {/* ── INTRO ── */}
        {phase === "intro" && (
          <div className="text-center">
            <p className="section-eyebrow text-teal">Free · AI Powered · 30 seconds</p>
            <h1 className="general-title !text-4xl md:!text-5xl mt-2 mb-3 text-teal-dark">
              AI Skin Analysis
            </h1>
            <p className="max-w-md mx-auto text-[15px] text-ink/80 mb-6">
              Get an instant, AI-powered read on your skin — hydration, oil balance,
              tone, texture, redness and more — with a downloadable report. Then get a
              personalised plan from our doctors for just ₹49.
            </p>
            <div className="fs-stage fs-preview mb-4">
              <div className="fs-preview-glow" />
              <svg
                className="fs-face"
                viewBox="0 0 220 260"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M62 96 C62 60 88 44 110 44 C132 44 158 60 158 96 C158 124 150 154 132 180 C124 192 118 200 110 200 C102 200 96 192 88 180 C70 154 62 124 62 96 Z" />
                <path d="M64 92 C70 62 92 50 110 50 C128 50 150 62 156 92" />
                <path d="M78 104 q10 -6 20 -1" />
                <path d="M122 103 q10 -5 20 1" />
                <path d="M80 114 q8 -6 16 0 q-8 6 -16 0 Z" />
                <path d="M124 114 q8 -6 16 0 q-8 6 -16 0 Z" />
                <circle cx="88" cy="114" r="1.7" fill="currentColor" stroke="none" />
                <circle cx="132" cy="114" r="1.7" fill="currentColor" stroke="none" />
                <path d="M110 120 L106 144 q4 4 9 1" />
                <path d="M96 164 q14 -8 28 0 q-14 10 -28 0 Z" />
                {/* analysis nodes */}
                <circle className="fs-node n1" cx="80" cy="150" r="2.4" fill="currentColor" stroke="none" />
                <circle className="fs-node n2" cx="140" cy="150" r="2.4" fill="currentColor" stroke="none" />
                <circle className="fs-node n3" cx="110" cy="78" r="2.4" fill="currentColor" stroke="none" />
              </svg>

              <span className="fs-bracket tl" />
              <span className="fs-bracket tr" />
              <span className="fs-bracket bl" />
              <span className="fs-bracket br" />
              <div className="fs-scanline" />

              <div className="fs-chip fs-chip-1"><span className="fs-cdot" /> Hydration</div>
              <div className="fs-chip fs-chip-2"><span className="fs-cdot" /> Texture</div>
              <div className="fs-chip fs-chip-3"><span className="fs-cdot" /> Tone &amp; Glow</div>

              <div className="fs-ai-badge">✨ Powered by AI</div>
            </div>
            <p className="text-xs text-ink/60 mb-6 flex items-center justify-center gap-1.5">
              🔒 Private — analysed on your device, never uploaded.
            </p>
            <button className="fs-btn fs-btn-primary w-full max-w-xs" onClick={startScan}>
              Start Free Scan →
            </button>
            <div className="mt-4">
              <button
                className="text-sm text-teal underline underline-offset-4"
                onClick={() => fileRef.current?.click()}
              >
                Or upload a photo instead
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFile}
              />
            </div>
          </div>
        )}

        {/* ── SCANNING ── */}
        {phase === "scanning" && (
          <div className="text-center">
            <div className="fs-stage">
              <div className="fs-mirror">
                <video ref={videoRef} className="fs-video" playsInline muted />
                <canvas ref={overlayRef} className="fs-overlay" />
              </div>
              <div className="fs-guide" />
              <div className="fs-scanline" />
              <div className="fs-badge">
                <span className="fs-dot" /> {status || "Scanning…"}
              </div>
            </div>
            <p className="text-sm text-ink/70 mt-5">
              Keep still, look straight at the camera, and make sure your face is well lit.
            </p>
            <button className="fs-btn fs-btn-ghost mt-4" onClick={restart}>
              Cancel
            </button>
          </div>
        )}

        {/* ── DETAILS ── */}
        {phase === "details" && (
          <div>
            <div className="text-center mb-6">
              <p className="section-eyebrow text-teal">Almost there</p>
              <h2 className="text-2xl md:text-3xl font-bold text-teal-dark mt-1">
                Where should we send your report?
              </h2>
              <p className="text-sm text-ink/70 mt-2">
                Enter your details to unlock your skin analysis results.
              </p>
            </div>
            {photoUrl && (
              <img
                src={photoUrl}
                alt="Your scan"
                className="w-24 h-24 object-cover rounded-2xl mx-auto mb-5 shadow"
              />
            )}
            <form onSubmit={submitDetails} className="max-w-sm mx-auto flex flex-col gap-3">
              <input
                className="fs-input"
                placeholder="Your name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <input
                className="fs-input"
                placeholder="Mobile number"
                inputMode="numeric"
                value={form.mobile}
                onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
              />
              {error && <p className="text-sm text-[#c85a3c]">{error}</p>}
              <button type="submit" className="fs-btn fs-btn-primary mt-1">
                Reveal my results →
              </button>
              <p className="text-[11px] text-ink/50 text-center">
                By continuing you agree to be contacted about your consultation.
              </p>
            </form>
          </div>
        )}

        {/* ── ANALYZING ── */}
        {phase === "analyzing" && (
          <div className="text-center py-6">
            <div className="fs-rings">
              <div className="fs-ring" />
              <div className="fs-ring r2" />
              <div className="fs-ring r3" />
              <div className="fs-pct">{analyzePct}%</div>
            </div>
            <h2 className="text-xl font-bold text-teal-dark mt-4">
              Analysing 8 skin parameters…
            </h2>
            <p className="text-sm text-ink/70 mt-1">
              {analyzePct < 40
                ? "Mapping facial zones…"
                : analyzePct < 75
                ? "Measuring tone, texture & oil balance…"
                : "Building your personalised report…"}
            </p>
          </div>
        )}

        {/* ── REPORT ── */}
        {phase === "report" && analysis && (
          <div>
            <div className="text-center">
              <p className="section-eyebrow text-teal">Your results</p>
              <h2 className="text-2xl md:text-3xl font-bold text-teal-dark mt-1 mb-5">
                Skin Analysis Report
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-7">
              <div
                className="fs-score-ring"
                style={{ "--pct": analysis.overall }}
              >
                <div>
                  <div className="text-3xl font-extrabold text-teal-dark leading-none">
                    {analysis.overall}
                  </div>
                  <div className="text-[11px] text-ink/60 mt-1">/ 100</div>
                </div>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-lg font-bold text-teal-dark">
                  {analysis.overallLevel} skin health
                </p>
                <p className="text-sm text-ink/70">
                  Estimated skin age: <b>{analysis.skinAge} yrs</b>
                </p>
                <p className="text-sm text-ink/70">
                  Top focus:{" "}
                  <b>{analysis.concerns.map((c) => c.label).join(", ")}</b>
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 mb-7">
              {analysis.metrics.map((m) => (
                <div key={m.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-ink/80">{m.label}</span>
                    <span className="font-semibold" style={{ color: scoreHex(m.score) }}>
                      {m.score} · {m.level}
                    </span>
                  </div>
                  <div className="fs-bar-track">
                    <div
                      className="fs-bar-fill"
                      style={{ width: `${m.score}%`, background: scoreHex(m.score) }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-mint rounded-2xl p-5 mb-6">
              <p className="font-bold text-teal-dark mb-2">What to focus on</p>
              <ul className="flex flex-col gap-2">
                {analysis.concerns.map((c) => (
                  <li key={c.key} className="text-sm text-ink/80">
                    <b>{c.label}:</b> {c.note}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-teal-dark text-cream rounded-2xl p-5 text-center mb-5">
              <p className="font-bold text-lg">Turn this into a real treatment plan</p>
              <p className="text-sm text-cream/80 mb-4">
                Our dermatology experts will review your concerns and build a
                personalised plan — video consultation for just ₹49.
              </p>
              <button className="fs-btn fs-btn-amber w-full max-w-xs" onClick={openBooking}>
                Book my ₹49 consultation →
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button className="fs-btn fs-btn-primary flex-1" onClick={downloadPdf}>
                ⬇ Download PDF report
              </button>
              <button className="fs-btn fs-btn-ghost flex-1" onClick={restart}>
                Scan again
              </button>
            </div>
            {status && <p className="text-center text-sm text-ink/60 mt-3">{status}</p>}

            <p className="text-[11px] text-ink/50 text-center mt-5 leading-relaxed">
              This AI screening is a preliminary, automated assessment based on a single
              photo and is not a medical diagnosis. Results vary with lighting and camera
              quality. Please consult a qualified dermatologist for accurate evaluation.
            </p>
          </div>
        )}

        {/* ── ERROR ── */}
        {phase === "error" && (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">😕</div>
            <h2 className="text-xl font-bold text-teal-dark mb-2">Something went wrong</h2>
            <p className="text-sm text-ink/75 max-w-sm mx-auto mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="fs-btn fs-btn-primary" onClick={startScan}>
                Try camera again
              </button>
              <button className="fs-btn fs-btn-ghost" onClick={() => fileRef.current?.click()}>
                Upload a photo instead
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFile}
              />
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-ink/50 mt-6">
        🔒 Your photo never leaves your device — all analysis runs locally in your browser.
      </p>
    </div>
  );
}
