// ── Branded PDF report (jsPDF, drawn programmatically for reliability) ──────────
import { jsPDF } from "jspdf";

// theme colours (RGB)
const TEAL_DARK = [70, 57, 15];
const TEAL = [128, 99, 19];
const AMBER = [232, 163, 61];
const CREAM = [255, 253, 240];
const MINT = [253, 239, 178];
const INK = [58, 47, 16];
const GREY = [120, 110, 90];

const scoreColor = (s) =>
  s >= 80 ? [46, 139, 87] : s >= 65 ? [90, 140, 40] : s >= 45 ? AMBER : [200, 90, 60];

// Load any same-origin image into a dataURL (+ its dimensions) so jsPDF can embed
// it. Use "image/png" to PRESERVE TRANSPARENCY (JPEG turns transparent pixels
// black — that was the all-black logo bug). Returns null on failure.
export function toDataUrl(src, maxW = 480, type = "image/jpeg", quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve({ url: c.toDataURL(type, quality), w: c.width, h: c.height });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// payload: { name, mobile, date, ticketId, analysis, photoDataUrl, logo, consultUrl, websiteUrl }
export function buildReportPdf(payload) {
  const { name, mobile, date, ticketId, analysis, photoDataUrl, logo, consultUrl, websiteUrl } =
    payload;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = 210;
  let y = 0;

  // ── Header band ──────────────────────────────────────────────────────────────
  doc.setFillColor(...TEAL_DARK);
  doc.rect(0, 0, PW, 34, "F");
  // Logo sits on a cream chip so the dark brand logo stays visible on the dark
  // header, and is drawn as PNG to keep its transparency.
  let textX = 14;
  if (logo?.url) {
    try {
      const maxH = 15,
        maxW = 40;
      let w = maxW,
        h = (logo.h / logo.w) * maxW;
      if (h > maxH) {
        h = maxH;
        w = (logo.w / logo.h) * maxH;
      }
      const pad = 2.5;
      const chipY = (34 - h) / 2 - pad;
      doc.setFillColor(...CREAM);
      doc.roundedRect(12, chipY, w + pad * 2, h + pad * 2, 2, 2, "F");
      doc.addImage(logo.url, "PNG", 12 + pad, chipY + pad, w, h);
      textX = 12 + w + pad * 2 + 5;
    } catch {
      /* ignore */
    }
  }
  doc.setTextColor(...CREAM);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("AI Skin Analysis Report", textX, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...AMBER);
  doc.text("Devriz Healthcare  ·  Free AI Skin Screening", textX, 23);
  doc.setTextColor(...CREAM);
  doc.setFontSize(8);
  doc.text(`Report ID: ${ticketId}`, PW - 14, 14, { align: "right" });
  doc.text(date, PW - 14, 20, { align: "right" });

  y = 44;

  // ── Patient + photo row ──────────────────────────────────────────────────────
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(name || "Guest", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  if (mobile) doc.text(`Mobile: ${mobile}`, 14, y + 6);

  if (photoDataUrl) {
    try {
      doc.setFillColor(...MINT);
      doc.roundedRect(PW - 46, y - 8, 32, 32, 2, 2, "F");
      doc.addImage(photoDataUrl, "JPEG", PW - 45, y - 7, 30, 30);
    } catch {
      /* ignore */
    }
  }

  // ── Score summary cards ──────────────────────────────────────────────────────
  y += 16;
  const cardW = 56,
    cardH = 26,
    gap = 6;
  const cards = [
    { label: "Skin Health Score", value: `${analysis.overall}/100`, sub: analysis.overallLevel, color: scoreColor(analysis.overall) },
    { label: "Estimated Skin Age", value: `${analysis.skinAge} yrs`, sub: "AI estimate", color: TEAL },
    { label: "Top Focus Area", value: analysis.concerns[0]?.label?.split(" ")[0] || "—", sub: "Priority", color: AMBER },
  ];
  cards.forEach((c, i) => {
    const x = 14 + i * (cardW + gap);
    doc.setFillColor(...CREAM);
    doc.setDrawColor(230, 224, 200);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
    doc.setTextColor(...GREY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(c.label.toUpperCase(), x + 5, y + 7);
    doc.setTextColor(...c.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(String(c.value), x + 5, y + 16);
    doc.setTextColor(...GREY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(String(c.sub), x + 5, y + 22);
  });

  // ── Metric bars ──────────────────────────────────────────────────────────────
  y += cardH + 12;
  doc.setTextColor(...TEAL_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Detailed Skin Assessment", 14, y);
  y += 7;

  const barX = 74,
    barW = 96;
  analysis.metrics.forEach((m) => {
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(m.label, 14, y + 3);
    // track
    doc.setFillColor(238, 232, 210);
    doc.roundedRect(barX, y, barW, 4, 2, 2, "F");
    // fill
    const col = scoreColor(m.score);
    doc.setFillColor(...col);
    doc.roundedRect(barX, y, Math.max(3, (barW * m.score) / 100), 4, 2, 2, "F");
    doc.setTextColor(...col);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(`${m.score}`, barX + barW + 4, y + 3.5);
    y += 9;
  });

  // ── Recommendations ──────────────────────────────────────────────────────────
  y += 4;
  doc.setFillColor(...MINT);
  const recH = 8 + analysis.concerns.length * 6 + 6;
  doc.roundedRect(14, y, PW - 28, recH, 2, 2, "F");
  doc.setTextColor(...TEAL_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("What we recommend focusing on", 19, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  analysis.concerns.forEach((c, i) => {
    doc.text(`•  ${c.label}: ${c.note}`, 19, y + 13 + i * 6, { maxWidth: PW - 40 });
  });
  y += recH + 8;

  // ── CTA (whole box links back to the ₹49 booking on the site) ────────────────
  doc.setFillColor(...TEAL_DARK);
  doc.roundedRect(14, y, PW - 28, 22, 2, 2, "F");
  doc.setTextColor(...CREAM);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Get a personalised treatment plan from our doctors", 19, y + 9);
  doc.setTextColor(...AMBER);
  doc.setFontSize(10);
  doc.text("Book a video consultation for just Rs. 49  ->", 19, y + 16);
  if (consultUrl) doc.link(14, y, PW - 28, 22, { url: consultUrl });
  y += 30;

  // ── Disclaimer + footer ──────────────────────────────────────────────────────
  doc.setTextColor(...GREY);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.text(
    "Disclaimer: This AI screening is an automated, preliminary assessment based on a single photo and is NOT a medical " +
      "diagnosis. Lighting and camera quality affect results. For an accurate evaluation and treatment, please consult a " +
      "qualified dermatologist.",
    14,
    y,
    { maxWidth: PW - 28 }
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEAL);
  const footer = "devrizhealthcare.com  ·  WhatsApp +91 97739 89550";
  doc.text(footer, 105, 289, { align: "center" });
  if (websiteUrl) {
    const fw = doc.getTextWidth(footer);
    doc.link(105 - fw / 2, 285, fw, 6, { url: websiteUrl });
  }

  return doc;
}
