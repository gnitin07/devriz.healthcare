import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useContent } from "../lib/ContentContext";
import { urlFor } from "../lib/sanity";

// only z-order is done in CSS; rotation + offset are set by GSAP (below) so the
// scroll-rise transform and the fan rotation live in one place and never fight.
// mobile: z rises with index so each stacked card lays OVER the previous one;
// desktop (md): centre card sits forward for the fan.
const FANZ = ["z-[1]", "z-[2] md:z-[3]", "z-[3] md:z-[2]"];

const DoctorsSection = () => {
  const { doctors } = useContent();

  useGSAP(
    () => {
      const cards = gsap.utils.toArray(".doctor-card");
      const mm = gsap.matchMedia();

      // desktop: a fanned row that rises together from below and settles
      mm.add("(min-width: 768px)", () => {
        const rot = [-7, 0, 7];
        const yoff = [26, -14, 26];
        cards.forEach((c, i) =>
          gsap.set(c, {
            rotation: rot[i] ?? 0,
            y: yoff[i] ?? 0,
            transformOrigin: "bottom center",
          })
        );
        gsap.from(cards, {
          yPercent: 110,
          opacity: 0,
          stagger: 0.16,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".doctors-section",
            start: "top 82%",
            end: "top 34%",
            scrub: 1,
          },
        });
      });

      // mobile: cards are stacked — each eases gently up as it enters view,
      // so nothing travels far enough to be clipped (smooth, no cut)
      mm.add("(max-width: 767px)", () => {
        const rot = [-2, 2, -2];
        cards.forEach((c, i) =>
          gsap.set(c, { rotation: rot[i] ?? 0, y: 0, transformOrigin: "bottom center" })
        );
        cards.forEach((card) => {
          gsap.from(card, {
            yPercent: 22,
            opacity: 0,
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              start: "top 92%",
              end: "top 62%",
              scrub: 1,
            },
          });
        });
      });

      gsap.from(".doctors-heading", {
        yPercent: 60,
        opacity: 0,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".doctors-section",
          start: "top 90%",
          end: "top 55%",
          scrub: 1,
        },
      });
    },
    { dependencies: [doctors], revertOnUpdate: true }
  );

  return (
    <section id="doctors" className="doctors-section">
      <div className="mx-auto max-w-7xl md:px-8 px-5">
        <div className="doctors-heading text-center md:mb-16 mb-10">
          <p className="section-eyebrow text-teal">Real doctors, real guidance</p>
          <h2 className="general-title text-teal-dark leading-none mt-4">
            Meet our
            <br />
            experts
          </h2>
        </div>

        <div className="doctors-deck">
          {doctors.map((doc, i) => {
            const photo = doc.photo
              ? urlFor(doc.photo).width(700).auto("format").quality(80).url()
              : doc.localPhoto;
            const specialty = doc.specialty || doc.role;
            const clients = doc.clients || (doc.stats && doc.stats[0]);
            const success = doc.success || (doc.stats && doc.stats[1]);
            const tint = doc.tint || ["skin", "hair", "body"][i % 3];

            return (
              <article
                key={doc._id || i}
                className={`doctor-card tint-${tint} ${FANZ[i % FANZ.length]}`}
              >
                <div className="dc-photo">
                  {specialty && <span className="dc-tag">{specialty}</span>}
                  {doc.rating && (
                    <span className="dc-rating">★ {doc.rating}</span>
                  )}
                  {photo ? (
                    <img className="dc-cut" src={photo} alt={doc.name} loading="lazy" />
                  ) : (
                    <div className="dc-cut flex-center">
                      <span className="font-bold text-6xl text-teal opacity-30">
                        {doc.name?.split(" ").map((w) => w[0]).join("")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="dc-foot">
                  <h3>{doc.name}</h3>
                  <span className="dc-role">
                    {specialty}
                    {doc.experience ? ` · ${doc.experience}` : ""}
                  </span>
                  <div className="dc-stats">
                    {clients && (
                      <div className="dc-stat">
                        <strong>{clients}</strong>
                        <small>clients catered</small>
                      </div>
                    )}
                    {success && (
                      <div className="dc-stat">
                        <strong>{success}</strong>
                        <small>success rate</small>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DoctorsSection;
