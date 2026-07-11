// ── Branded PDF report (jsPDF, drawn programmatically for reliability) ──────────
import { jsPDF } from "jspdf";

// theme colours (RGB)
const TEAL_DARK = [70, 57, 15];
const TEAL = [128, 99, 19];
const AMBER = [232, 163, 61];
const CREAM = [255, 253, 240];
const MINT = [253, 239, 178];
const AMBER_LIGHT = [246, 197, 107];
const INK = [58, 47, 16];
const GREY = [120, 110, 90];

// Formal clinic details for the report footer (mirrors src/lib/defaults.js).
const CLINIC = {
  name: "Devriz Healthcare",
  tagline: "Consultation-first skin, hair & body care",
  address: "Plot No-8, Shankar Vihar, Preet Vihar, New Delhi 110092",
  email: "info@devrizhealthcare.com",
  phone: "+91 97739 89550",
  website: "devrizhealthcare.com",
  social: "@devrizhealthcare",
  year: new Date().getFullYear(),
};

const scoreColor = (s) =>
  s >= 80 ? [46, 139, 87] : s >= 65 ? [90, 140, 40] : s >= 45 ? AMBER : [200, 90, 60];

// Load any same-origin image into a dataURL (+ its dimensions) so jsPDF can embed
// it. Use "image/png" to PRESERVE TRANSPARENCY (JPEG turns transparent pixels
// black — that was the all-black logo bug). Returns null on failure.
export function toDataUrl(src, maxW = 480, type = "image/jpeg", quality = 0.85, filter = null) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext("2d");
        // e.g. "brightness(0) invert(1)" recolours the dark logo to solid white
        // (transparency preserved) so it reads on the dark header/footer bands.
        if (filter) ctx.filter = filter;
        ctx.drawImage(img, 0, 0, c.width, c.height);
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

  // ── Header band (buttercream, brand logo in original black/gold) ─────────────
  doc.setFillColor(...MINT);
  doc.rect(0, 0, PW, 34, "F");
  // amber accent line under the header
  doc.setFillColor(...AMBER);
  doc.rect(0, 33.2, PW, 0.8, "F");
  let textX = 14;
  if (logo?.url) {
    try {
      const maxH = 14,
        maxW = 38;
      let w = maxW,
        h = (logo.h / logo.w) * maxW;
      if (h > maxH) {
        h = maxH;
        w = (logo.w / logo.h) * maxH;
      }
      doc.addImage(logo.url, "PNG", 14, (34 - h) / 2, w, h);
      textX = 14 + w + 6;
      // subtle divider between logo and title
      doc.setDrawColor(...TEAL_DARK);
      doc.setLineWidth(0.3);
      doc.line(textX - 3, 10, textX - 3, 24);
    } catch {
      /* ignore */
    }
  }
  doc.setTextColor(...TEAL_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("AI Skin Analysis Report", textX, 15.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEAL);
  doc.text("Free AI Skin Screening", textX, 22.5);
  doc.setTextColor(...TEAL_DARK);
  doc.setFontSize(8);
  doc.text(`Report ID: ${ticketId}`, PW - 14, 13.5, { align: "right" });
  doc.text(date, PW - 14, 19.5, { align: "right" });

  y = 46;

  // ── Patient details (left) ───────────────────────────────────────────────────
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(name || "Guest", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  if (mobile) doc.text(`Mobile: ${mobile}`, 14, y + 6);
  doc.text(`Report date: ${date}`, 14, y + 11);

  // ── Captured photo (top-right, real aspect ratio, sized to clear the cards) ──
  let photoBottom = y;
  if (photoDataUrl) {
    try {
      const maxW = 30,
        maxH = 24;
      let pw = maxW,
        ph = maxH;
      try {
        const p = doc.getImageProperties(photoDataUrl);
        pw = maxW;
        ph = (p.height / p.width) * maxW;
        if (ph > maxH) {
          ph = maxH;
          pw = (p.width / p.height) * maxH;
        }
      } catch {
        /* fall back to the max box */
      }
      const px = PW - 14 - pw,
        py = 40;
      doc.setFillColor(...MINT);
      doc.roundedRect(px - 1.5, py - 1.5, pw + 3, ph + 3, 2, 2, "F");
      doc.addImage(photoDataUrl, "JPEG", px, py, pw, ph);
      photoBottom = py + ph + 1.5;
    } catch {
      /* ignore */
    }
  }

  // ── Score summary cards (start below BOTH the patient text and the photo) ─────
  y = Math.max(y + 15, photoBottom + 6);
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

  // ── Disclaimer ───────────────────────────────────────────────────────────────
  doc.setTextColor(...GREY);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.text(
    "Disclaimer: This AI screening is an automated, preliminary assessment based on a single photo and is NOT a medical " +
      "diagnosis. Lighting and camera quality affect results. For an accurate evaluation and treatment, please consult a " +
      "qualified dermatologist.",
    14,
    Math.max(Math.min(y, 253), 251), // sit just above the footer band (262)
    { maxWidth: PW - 28 }
  );

  // ── Branded footer band (buttercream, pinned to page bottom) ─────────────────
  const fy = 262; // band top
  doc.setFillColor(...MINT);
  doc.rect(0, fy, PW, 297 - fy, "F");
  // thin amber accent line on top of the band
  doc.setFillColor(...AMBER);
  doc.rect(0, fy, PW, 0.8, "F");

  // brand logo (original colours)
  if (logo?.url) {
    try {
      const lh = 9;
      const lw = (logo.w / logo.h) * lh;
      doc.addImage(logo.url, "PNG", 14, fy + 7, lw, lh);
    } catch {
      /* ignore */
    }
  }
  doc.setTextColor(...TEAL_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(CLINIC.name, 14, fy + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...TEAL);
  doc.text(CLINIC.tagline, 14, fy + 27);

  // formal details, right-aligned
  const rx = PW - 14;
  doc.setFontSize(8);
  doc.setTextColor(...TEAL_DARK);
  doc.setFont("helvetica", "bold");
  doc.text("Contact", rx, fy + 8, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(CLINIC.address, rx, fy + 13, { align: "right" });
  doc.text(`${CLINIC.email}   ·   ${CLINIC.phone}`, rx, fy + 18, { align: "right" });
  // website + social (website is a link back to the site)
  doc.setTextColor(...TEAL);
  doc.setFont("helvetica", "bold");
  const wline = `${CLINIC.website}   ·   ${CLINIC.social}`;
  doc.text(wline, rx, fy + 23, { align: "right" });
  if (websiteUrl) {
    const ww = doc.getTextWidth(CLINIC.website);
    doc.link(rx - doc.getTextWidth(wline), fy + 20, ww, 5, { url: websiteUrl });
  }

  // bottom copyright strip
  doc.setDrawColor(...TEAL_DARK);
  doc.setLineWidth(0.2);
  doc.line(14, fy + 30, rx, fy + 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...TEAL);
  doc.text(
    `© ${CLINIC.year} ${CLINIC.name}. All rights reserved.  ·  Report ID: ${ticketId}`,
    105,
    fy + 33.5,
    { align: "center" }
  );

  return doc;
}
