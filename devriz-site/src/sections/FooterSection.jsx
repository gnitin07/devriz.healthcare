import { useContent } from "../lib/ContentContext";

const ICONS = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.13 1.38C1.35 2.68.94 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.66 1.34 1.07 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.66-.67 1.07-1.34 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.38-2.13-.67-.66-1.34-1.07-2.13-1.38-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0z" />
      <path d="M12 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zM12 16a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" />
      <circle cx="18.41" cy="5.59" r="1.44" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.75C24 .78 23.2 0 22.22 0z" />
    </svg>
  ),
};

const FooterSection = () => {
  const { settings } = useContent();

  const socials = [
    {
      key: "instagram",
      label: "Instagram",
      href: settings.instagram,
      bg: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
    },
    { key: "facebook", label: "Facebook", href: settings.facebook, bg: "#1877F2" },
    { key: "youtube", label: "YouTube", href: settings.youtube, bg: "#FF0000" },
    { key: "linkedin", label: "LinkedIn", href: settings.linkedin, bg: "#0A66C2" },
  ].filter((s) => s.href);

  return (
    <footer className="footer-section">
      <h2 className="footer-big md:pt-20 pt-14 md:pb-16 pb-10"></h2>

      <div className="footer-grid">
        <div className="md:col-span-2">
          <img
            src="/images/logo-r.png"
            alt="Devriz Healthcare"
            className="h-11 w-auto mb-5 brightness-0 invert opacity-90"
          />
          <p>
            Consultation-first skin, hair &amp; body care. Diagnosis before
            products, always.
          </p>
        </div>

        <div>
          <h4>Quick links</h4>
          <a href="#home">Home</a>
          <a href="#why">About</a>
          <a href="#doctors">Doctors</a>
          <a href="#process">Process</a>
        </div>

        <div>
          <h4>Contact</h4>
          <p>{settings.address}</p>
          <a href={`mailto:${settings.email}`}>{settings.email}</a>
          {settings.whatsapp && (
            <a
              href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp us
            </a>
          )}
        </div>
      </div>

      <div className="footer-socials">
        <span className="footer-socials-label">Follow us</span>
        <div className="footer-socials-row">
          {socials.map((s) => (
            <a
              key={s.key}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              className="social-btn"
              style={{ background: s.bg }}
              aria-label={s.label}
              title={s.label}
            >
              {ICONS[s.key]}
            </a>
          ))}
        </div>
      </div>

      <div className="copyright-box">
        <p>© {new Date().getFullYear()} Devriz Healthcare. All rights reserved.</p>
        <p>Privacy Policy · Terms &amp; Conditions</p>
      </div>
    </footer>
  );
};

export default FooterSection;
