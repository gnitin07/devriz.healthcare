import { useEffect, useState } from "react";
import { useBooking } from "../lib/BookingContext";
import {
  CONCERNS,
  DURATIONS,
  CONSULT_AMOUNT,
  RAZORPAY_KEY_ID,
  loadRazorpay,
  makeTicketId,
  submitBooking,
  whatsappUrl,
  WHATSAPP_NUMBER,
} from "../lib/booking";

const STEPS = ["Concern", "Issue", "Duration", "Details"];

const ConsultModal = () => {
  const { open, closeBooking } = useBooking();

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState(null);
  const [issues, setIssues] = useState([]);
  const [specific, setSpecific] = useState("");
  const [duration, setDuration] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  // lock body scroll while open, reset state when closed
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      const t = setTimeout(reset, 300);
      return () => clearTimeout(t);
    }
    return () => {
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function reset() {
    setStep(0);
    setCategory(null);
    setIssues([]);
    setSpecific("");
    setDuration("");
    setFullName("");
    setMobile("");
    setCity("");
    setPreferredTime("");
    setPaying(false);
    setError("");
    setDone(null);
  }

  if (!open) return null;

  const activeConcern = CONCERNS.find((c) => c.key === category);

  const toggleIssue = (i) =>
    setIssues((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const canNext =
    (step === 0 && !!category) ||
    (step === 1 && (issues.length > 0 || specific.trim().length > 0)) ||
    (step === 2 && !!duration) ||
    step === 3;

  const handlePay = async () => {
    setError("");
    if (!fullName.trim()) return setError("Please enter your name.");
    if (!/^[6-9]\d{9}$/.test(mobile.trim()))
      return setError("Enter a valid 10-digit mobile number.");

    setPaying(true);
    const ok = await loadRazorpay();
    if (!ok) {
      setPaying(false);
      return setError("Couldn't load the payment window. Check your connection.");
    }
    if (!RAZORPAY_KEY_ID) {
      setPaying(false);
      return setError("Payment is not configured yet.");
    }

    const ticketId = makeTicketId();
    const issueStr = [...issues, specific.trim()].filter(Boolean).join(", ");

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: CONSULT_AMOUNT * 100,
      currency: "INR",
      name: "Devriz Healthcare",
      description: `Consultation – ${category}`,
      image: "/images/logo.png",
      prefill: { name: fullName.trim(), contact: mobile.trim() },
      notes: { ticketId, category, concern: issueStr },
      theme: { color: "#0e3b3a" },
      handler: async (resp) => {
        await submitBooking({
          ticketId,
          category,
          concern: issueStr,
          duration,
          fullName: fullName.trim(),
          mobile: mobile.trim(),
          age: "",
          city: city.trim(),
          gender: "",
          preferredTime,
          notes: specific.trim(),
          paymentId: resp.razorpay_payment_id,
          sourcePage: window.location.href,
        });
        const paymentId = resp.razorpay_payment_id;
        setDone({ ticketId, category, issueStr, paymentId });
        if (WHATSAPP_NUMBER) {
          setTimeout(() => {
            window.location.href = whatsappUrl(
              ticketId,
              category,
              issueStr,
              paymentId
            );
          }, 1600);
        }
      },
      modal: { ondismiss: () => setPaying(false) },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", () => {
      setPaying(false);
      setError("Payment failed or was cancelled. Please try again.");
    });
    rzp.open();
  };

  return (
    <div className="consult-overlay" onClick={closeBooking}>
      <div className="consult-modal" onClick={(e) => e.stopPropagation()}>
        <button className="consult-close" onClick={closeBooking} aria-label="Close">
          ×
        </button>

        {done ? (
          <div className="consult-done" key="done">
            <div className="done-check">✓</div>
            <h3>Payment successful!</h3>
            <p>
              Booking ID <strong>{done.ticketId}</strong>. Our expert will reach
              out on WhatsApp shortly for your {done.category.toLowerCase()}{" "}
              consultation.
            </p>
            {WHATSAPP_NUMBER ? (
              <>
                <p className="done-redirect">Opening WhatsApp…</p>
                <a
                  className="consult-primary"
                  href={whatsappUrl(
                    done.ticketId,
                    done.category,
                    done.issueStr,
                    done.paymentId
                  )}
                >
                  Continue on WhatsApp
                </a>
              </>
            ) : (
              <button className="consult-primary" onClick={closeBooking}>
                Done
              </button>
            )}
          </div>
        ) : (
          <>
            {/* header + progress */}
            <div className="consult-head">
              <p className="consult-eyebrow">Book your ₹{CONSULT_AMOUNT} consultation</p>
              <div className="consult-steps">
                {STEPS.map((s, i) => (
                  <span
                    key={s}
                    className={`cs-dot ${i === step ? "active" : ""} ${
                      i < step ? "done" : ""
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="consult-body" key={step}>
              {/* STEP 0 — concern */}
              {step === 0 && (
                <>
                  <h3>What can we help you with?</h3>
                  <div className="concern-grid">
                    {CONCERNS.map((c) => (
                      <button
                        key={c.key}
                        className={`concern-card ${
                          category === c.key ? "sel" : ""
                        }`}
                        onClick={() => {
                          setCategory(c.key);
                          setIssues([]);
                          setStep(1);
                        }}
                      >
                        <span className="concern-emoji">{c.emoji}</span>
                        <strong>{c.key}</strong>
                        <small>{c.desc}</small>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* STEP 1 — issue */}
              {step === 1 && (
                <>
                  <h3>Which {category?.toLowerCase()} issue is bothering you?</h3>
                  <div className="chip-wrap">
                    {activeConcern?.issues.map((i) => (
                      <button
                        key={i}
                        className={`chip ${issues.includes(i) ? "sel" : ""}`}
                        onClick={() => toggleIssue(i)}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                  <label className="consult-label">
                    Tell us more (optional)
                    <textarea
                      value={specific}
                      onChange={(e) => setSpecific(e.target.value)}
                      placeholder="Tell us your issue in your own words…"
                      rows={3}
                    />
                  </label>
                </>
              )}

              {/* STEP 2 — duration */}
              {step === 2 && (
                <>
                  <h3>How long have you had this?</h3>
                  <div className="chip-wrap chip-wrap--col">
                    {DURATIONS.map((d) => (
                      <button
                        key={d}
                        className={`chip chip--wide ${
                          duration === d ? "sel" : ""
                        }`}
                        onClick={() => {
                          setDuration(d);
                          setStep(3);
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* STEP 3 — details + pay */}
              {step === 3 && (
                <>
                  <h3>Almost there — your details</h3>
                  <div className="field-grid">
                    <label className="consult-label">
                      Full name*
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your name"
                      />
                    </label>
                    <label className="consult-label">
                      Mobile number*
                      <input
                        value={mobile}
                        onChange={(e) =>
                          setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                        }
                        inputMode="numeric"
                        placeholder="10-digit number"
                      />
                    </label>
                    <label className="consult-label">
                      City
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Your city"
                      />
                    </label>
                  </div>
                  {error && <p className="consult-error">{error}</p>}
                </>
              )}
            </div>

            {/* footer */}
            <div className="consult-foot">
              {step > 0 ? (
                <button className="consult-ghost" onClick={back} disabled={paying}>
                  ← Back
                </button>
              ) : (
                <span />
              )}

              {step < 3 ? (
                <button
                  className="consult-primary"
                  onClick={next}
                  disabled={!canNext}
                >
                  Continue →
                </button>
              ) : (
                <button
                  className="consult-primary"
                  onClick={handlePay}
                  disabled={paying}
                >
                  {paying ? "Opening payment…" : `Pay ₹${CONSULT_AMOUNT} & book →`}
                </button>
              )}
            </div>

            <p className="consult-secure">🔒 Secure payment via Razorpay</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ConsultModal;
