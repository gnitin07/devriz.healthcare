import { useContent } from "../lib/ContentContext";

const CONCERNS = ["Pigmentation", "Skin", "Hair", "Body"];

const FooterSection = () => {
  const { settings } = useContent();

  const socials = [
    { label: "Fb", href: settings.facebook },
    { label: "Ig", href: settings.instagram },
    { label: "Yt", href: settings.youtube },
    { label: "In", href: settings.linkedin },
  ].filter((s) => s.href);

  return (
    <footer className="footer-section">
      <h2 className="footer-big md:pt-20 pt-14 md:pb-16 pb-10">Devriz</h2>

      <div className="footer-grid">
        <div>
          <img
            src="/images/logo.png"
            alt="Devriz Healthcare"
            className="h-11 w-auto mb-5 brightness-0 invert opacity-90"
          />
          <p>
            Consultation-first skin, hair &amp; body care. Diagnosis before
            products, always.
          </p>
          <div className="flex gap-3 mt-5">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="social-btn"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4>Quick links</h4>
          <a href="#home">Home</a>
          <a href="#why">About</a>
          <a href="#doctors">Doctors</a>
          <a href="#process">Concern</a>
        </div>

        <div>
          <h4>Concerns</h4>
          {CONCERNS.map((c) => (
            <a key={c} href={settings.bookingLink} target="_blank" rel="noreferrer">
              {c}
            </a>
          ))}
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

      <div className="copyright-box">
        <p>© {new Date().getFullYear()} Devriz Healthcare. All rights reserved.</p>
        <p>Privacy Policy · Terms &amp; Conditions</p>
      </div>
    </footer>
  );
};

export default FooterSection;
