// ── FILL THESE ────────────────────────────────────────────────────────────────
// Only the PUBLIC Razorpay Key ID belongs here (it is sent to the browser anyway).
// NEVER put the Razorpay *secret* in the frontend — it stays only in your Apps Script.
export const RAZORPAY_KEY_ID = "rzp_live_StwoxJlDC4IMUs"; // swap to rzp_test_… while testing

// Paste your deployed Apps Script Web App URL (…/exec). Deploy: GAS → Deploy →
// New deployment → Web app → Execute as "Me", access "Anyone" → copy the /exec URL.
export const GAS_WEB_APP_URL = ""; // e.g. "https://script.google.com/macros/s/AKfyc.../exec"

// WhatsApp number to redirect to after payment: country code + number, digits only.
export const WHATSAPP_NUMBER = ""; // e.g. "919812345678"

export const CONSULT_AMOUNT = 49; // ₹
// ───────────────────────────────────────────────────────────────────────────────

// Pre-defined concerns + their common issues (shown as chips)
export const CONCERNS = [
  {
    key: "Skin",
    emoji: "✨",
    desc: "Acne, pigmentation, dullness…",
    issues: [
      "Acne & pimples",
      "Pigmentation & dark spots",
      "Dullness & uneven tone",
      "Open pores",
      "Blackheads",
      "Dryness",
      "Ageing & wrinkles",
      "Under-eye dark circles",
    ],
  },
  {
    key: "Hair",
    emoji: "💆",
    desc: "Hair fall, dandruff, thinning…",
    issues: [
      "Hair fall",
      "Dandruff",
      "Thinning / low density",
      "Premature greying",
      "Scalp itch / irritation",
      "Bald patches",
      "Beard growth",
    ],
  },
  {
    key: "Body",
    emoji: "🧴",
    desc: "Body acne, marks, dryness…",
    issues: [
      "Body acne",
      "Stretch marks",
      "Body pigmentation",
      "Dry / rough skin",
      "Tanning",
    ],
  },
];

export const DURATIONS = [
  "Less than a month",
  "1–3 months",
  "3–6 months",
  "6–12 months",
  "More than a year",
];

export const PREFERRED_TIMES = [
  "Morning (9–12)",
  "Afternoon (12–4)",
  "Evening (4–8)",
  "Anytime",
];

// Load the Razorpay checkout script on demand.
export function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// Human-friendly booking id, e.g. DC-0712-4831
export function makeTicketId() {
  const d = new Date();
  const mmdd = `${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const n = Math.floor(1000 + Math.random() * 9000);
  return `DC-${mmdd}-${n}`;
}

// Best-effort log to the Google Sheet via the Apps Script web app.
// text/plain avoids a CORS preflight; the response is opaque but the row is written.
export async function submitBooking(payload) {
  if (!GAS_WEB_APP_URL) return;
  try {
    await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "logBooking", ...payload }),
    });
  } catch {
    /* payment already succeeded — logging is best-effort */
  }
}

export function whatsappUrl(ticketId, category, issue) {
  const text =
    `Hi Devriz Healthcare! I just booked a ₹${CONSULT_AMOUNT} consultation.\n` +
    `Booking ID: ${ticketId}\n` +
    `Concern: ${category}${issue ? " – " + issue : ""}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
