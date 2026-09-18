import { useEffect } from "react";
import { useContent } from "../lib/ContentContext";

// A static merchant QR carries the payee, not an amount — and the amount is
// something a Devriz telecaller confirms on the call. So this page deliberately
// does NOT ask for one: the visitor scans, types the figure they were quoted,
// and pays. One decision less on the screen.
const QR_SRC = "/images/payment-qr.png";

// What the visitor's UPI app will show them at confirmation time. Printing it
// here first means the unfamiliar name isn't a surprise mid-payment.
const PAYEE_NAME = "DEVRIZ FASHION LIFESTYLE";

// Drawn rather than emoji: emoji render as a different picture on every phone,
// and a checkout is the one page where the padlock should look the same to
// everyone who sees it.
const PILL_ICONS = {
  lock: "M12 2a4.5 4.5 0 0 0-4.5 4.5V9H6.8A1.8 1.8 0 0 0 5 10.8v8.4A1.8 1.8 0 0 0 6.8 21h10.4a1.8 1.8 0 0 0 1.8-1.8v-8.4A1.8 1.8 0 0 0 17.2 9h-.7V6.5A4.5 4.5 0 0 0 12 2Zm0 2a2.5 2.5 0 0 1 2.5 2.5V9h-5V6.5A2.5 2.5 0 0 1 12 4Zm0 9.2a1.6 1.6 0 0 1 .8 3v1.3a.8.8 0 0 1-1.6 0v-1.3a1.6 1.6 0 0 1 .8-3Z",
  bolt: "M13.7 2 5.4 13.1a.7.7 0 0 0 .56 1.12h4.02l-1.5 7.5a.35.35 0 0 0 .62.28l8.4-11.2a.7.7 0 0 0-.56-1.12h-4.09l1.44-7.4A.35.35 0 0 0 13.7 2Z",
  shield:
    "M12 1.8 4.6 5.1v5.6c0 4.8 3.2 9.3 7.4 10.5 4.2-1.2 7.4-5.7 7.4-10.5V5.1L12 1.8Zm3.9 7-4.6 5.6a.9.9 0 0 1-1.34.06L8 12.5a.9.9 0 1 1 1.28-1.26l1.26 1.28 3.97-4.85a.9.9 0 1 1 1.39 1.14Z",
  card: "M3.5 6.6A2.1 2.1 0 0 1 5.6 4.5h12.8a2.1 2.1 0 0 1 2.1 2.1v.9H3.5v-.9Zm0 3.3h17v7.5a2.1 2.1 0 0 1-2.1 2.1H5.6a2.1 2.1 0 0 1-2.1-2.1V9.9Zm2.6 5.1a.9.9 0 0 0 0 1.8h3.2a.9.9 0 0 0 0-1.8H6.1Z",
};

const TRUST_PILLS = [
  { icon: "lock", label: "Secure Payment" },
  { icon: "bolt", label: "UPI Enabled" },
  { icon: "shield", label: "SSL Encrypted" },
  { icon: "card", label: "No Card Details" },
];

// Each brand's own lockup already contains its name, so the row carries no
// separate text label — a wordmark with the word repeated beside it is the
// giveaway of a page that assembled its trust marks by hand. The per-logo
// height is tuned rather than uniform: BHIM's mark includes a tagline line and
// Paytm's glyphs run tall, so equal box heights would NOT read as equal.
const UPI_APPS = [
  { name: "PhonePe", src: "/images/upi/phonepe.svg", height: 18 },
  { name: "Google Pay", src: "/images/upi/google-pay.svg", height: 18 },
  { name: "Paytm", src: "/images/upi/paytm.svg", height: 16 },
  { name: "BHIM", src: "/images/upi/bhim.svg", height: 20 },
];

const PaymentSection = () => {
  const { settings } = useContent();
  // Read from settings rather than hardcoded, so this page and the "Consult @
  // ₹49" buttons across the site can never quote two different prices.
  const price = Number(settings.consultPrice) || 49;
  const whatsappDigits = (settings.whatsapp || "").replace(/\D/g, "");

  // Set here rather than in PaymentApp because the price is only known once
  // settings have resolved — the amount belongs in the tab title too.
  useEffect(() => {
    document.title = `Pay ₹${price} | Devriz Healthcare`;
  }, [price]);

  return (
    <div className="pay-page">
      <header className="pay-header">
        <a href="/" className="pay-brand" aria-label="Devriz Healthcare home">
          <img src="/images/logo-r.webp" alt="Devriz Healthcare" />
        </a>
        <span className="pay-header-secure">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M12 1.5 4.5 4.8v5.5c0 4.7 3.2 9.1 7.5 10.2 4.3-1.1 7.5-5.5 7.5-10.2V4.8L12 1.5Zm0 2.2 5.5 2.4v4.2c0 3.7-2.3 7.1-5.5 8.1-3.2-1-5.5-4.4-5.5-8.1V6.1L12 3.7Z"
            />
            <path
              fill="currentColor"
              d="M12 7.6a2.4 2.4 0 0 0-1 4.6v1.9a1 1 0 0 0 2 0v-1.9a2.4 2.4 0 0 0-1-4.6Z"
            />
          </svg>
          Secure Payment
        </span>
      </header>

      {/* The amount rides along at the top of the screen the whole way down —
          the one number the visitor has to carry into their UPI app should
          never be scrolled off. */}
      <div className="pay-ticker">
        <span>Online Consultation</span>
        <b>₹{price}</b>
      </div>

      <main className="pay-shell">
        <div className="pay-card">
          <div className="pay-card-top">
            <p className="pay-eyebrow">Payment Gateway</p>
            <h1>Devriz Healthcare</h1>
            {/* No ₹ figure here on purpose — it would sit directly above the
                amount band and say the same thing twice. */}
            <p className="pay-card-sub">
              Scan the QR below with any UPI app to confirm your consultation.
            </p>
          </div>

          <ul className="pay-pills" aria-label="Payment safeguards">
            {TRUST_PILLS.map((pill) => (
              <li key={pill.label}>
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path fill="currentColor" d={PILL_ICONS[pill.icon]} />
                </svg>
                {pill.label}
              </li>
            ))}
          </ul>

          <section className="pay-qr" aria-label="UPI QR code">
            <div className="pay-qr-tile">
              <img
                src={QR_SRC}
                alt={`UPI payment QR code for ${PAYEE_NAME}`}
                width="549"
                height="549"
                decoding="async"
              />
            </div>
            <p className="pay-qr-cta">
              Scan &amp; pay <b>₹{price}</b>
            </p>
            <p className="pay-payee">{PAYEE_NAME}</p>
            <p className="pay-payee-note">
              Verified UPI merchant QR · this is the name your app will show
            </p>
            <p className="pay-apps-label">Pay using</p>
            <div className="pay-apps">
              {UPI_APPS.map((app) => (
                <span key={app.name}>
                  <img
                    src={app.src}
                    alt={app.name}
                    style={{ height: `${app.height}px` }}
                    decoding="async"
                  />
                </span>
              ))}
            </div>
            <a className="pay-save" href={QR_SRC} download="devriz-healthcare-upi-qr.png">
              Save QR to your phone
            </a>
            <p className="pay-save-note">
              On a phone? Save the QR, then choose “Scan from gallery” in your
              UPI app and pay ₹{price}.
            </p>
          </section>

          {/* Sits below the QR, not above it: the QR is what the visitor came
              for and it has to stay in the first screenful on a phone. Read as
              a summary line rather than a stacked block so it reinforces the
              figure without competing with the code above it. */}
          <section className="pay-amount" aria-label="Amount to pay">
            <div>
              <p className="pay-amount-label">Amount to pay</p>
              <p className="pay-amount-note">
                One-time consultation fee · nothing recurring
              </p>
            </div>
            <p className="pay-amount-value">
              <span className="pay-rupee" aria-hidden>
                ₹
              </span>
              <span className="sr-only">Rupees </span>
              {price}
            </p>
          </section>

          <section className="pay-steps" aria-label="How to pay">
            <h2>How to pay</h2>
            <ol>
              <li>
                <b>Open any UPI app</b> and scan the QR code above.
              </li>
              <li>
                <b>Enter ₹{price}</b> — a UPI merchant QR carries the payee, not
                the amount, so type it in yourself.
              </li>
              <li>
                <b>Confirm with your UPI PIN</b>, then send us the payment
                screenshot to activate your plan.
              </li>
            </ol>
          </section>

          <section className="pay-support" aria-label="After payment">
            <h2>Paid ₹{price}?</h2>
            <p>
              Share the payment screenshot with your consultant so we can
              confirm it and lock in your consultation slot.
            </p>
            <div className="pay-support-row">
              {whatsappDigits && (
                <a
                  href={`https://wa.me/${whatsappDigits}`}
                  target="_blank"
                  rel="noreferrer"
                  className="pay-support-btn is-primary"
                >
                  WhatsApp the screenshot
                </a>
              )}
              <a
                href={`mailto:${settings.email}?subject=${encodeURIComponent(
                  "Payment confirmation"
                )}`}
                className="pay-support-btn"
              >
                Email {settings.email}
              </a>
            </div>
          </section>

          <p className="pay-warning">
            <b>Devriz Healthcare will never ask for your UPI PIN, OTP, card
            number or CVV.</b>{" "}
            A UPI PIN is only ever needed inside your own payment app, and never
            to receive money.
          </p>
        </div>

        <footer className="pay-foot">
          <p>
            Payment is completed inside your own UPI app — no card or bank
            details are entered on this page.
          </p>
          <p>
            © {new Date().getFullYear()} Devriz Healthcare ·{" "}
            <a href="/privacy-policy">Privacy Policy</a> · <a href="/">Home</a>
          </p>
        </footer>
      </main>
    </div>
  );
};

export default PaymentSection;
