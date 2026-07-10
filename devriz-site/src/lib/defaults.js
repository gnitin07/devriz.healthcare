/**
 * Fallback content — the site renders instantly with this, then swaps in
 * whatever exists in Sanity. Any section with no Sanity documents keeps
 * these defaults, so the page never looks empty.
 */
export const DEFAULTS = {
  settings: {
    consultPrice: 49,
    originalPrice: 499,
    bookingLink: "https://devrizhealthcare.com",
    whatsapp: "",
    email: "info@devrizhealthcare.com",
    address: "Plot No- 8, Shankar Vihar, Preet Vihar, New Delhi, Delhi, 110092",
    instagram:
      "https://www.instagram.com/devrizhealthcare",
    facebook: "https://www.facebook.com/OfficialDevrizHealthcare/",
    youtube: "https://www.youtube.com/@devrizhealthcare",
    linkedin: "https://www.linkedin.com/company/devriz-group/",
    whyDoctorImage: null, // Sanity image; falls back to the bundled photo
    stats: [
      "1M+ happy customers",
      "15+ years experience",
      "93% visible results",
      "4.8 ★ average rating",
    ],
  },

  heroBanners: [],

  whyBanners: [
    {
      title: "Correct concern identification",
      description:
        "Many skin and hair issues look similar but have different root causes. Expert diagnosis ensures the right approach from day one.",
    },
    {
      title: "Personalized guidance",
      description:
        "Every skin type is unique. Your concern, history and lifestyle need individual attention, not a one-size-fits-all solution.",
    },
    {
      title: "Avoid wrong product use",
      description:
        "Using the wrong products can worsen conditions. Consultation ensures you apply only what's right for your concern.",
    },
    {
      title: "Doctor-led support",
      description:
        "Our cosmetology experts have 15+ years of experience guiding thousands of patients to visible, lasting improvements.",
    },
  ],

  steps: [
    {
      title: "Consult",
      description:
        "Book a personal consultation at just ₹49. Share your skin, hair or body concern with our expert and get a proper diagnosis first.",
      accent: "#e8a33d",
    },
    {
      title: "Products as per need & budget",
      description:
        "No random shopping. You get a personalised routine with products matched to your concern, your skin/body/hair type and your budget.",
      accent: "#c07a2e",
    },
    {
      title: "Dispatched after final consultation",
      description:
        "Your plan is confirmed on a final consultation call and only then is your kit dispatched,so everything you receive is right for you.",
      accent: "#c96f4a",
    },
  ],

  doctors: [
    {
      name: "Dr. Amy Aliya",
      specialty: "Body & Wellness",
      experience: "15 yrs",
      clients: "9,600+",
      success: "96%",
      rating: "4.9",
      tint: "body",
      photo: null,
      localPhoto: "/images/doctor-amy-cut.png",
    },
    {
      name: "Dr. Seema Magar",
      specialty: "Skin & Acne",
      experience: "12 yrs",
      clients: "8,400+",
      success: "97%",
      rating: "4.9",
      tint: "skin",
      photo: null,
      localPhoto: "/images/doctor-seema.png",
    },
    {
      name: "Dr. Rachita Tangri",
      specialty: "Hair & Scalp",
      experience: "10 yrs",
      clients: "6,900+",
      success: "95%",
      rating: "4.8",
      tint: "hair",
      photo: null,
      localPhoto: "/images/doctor-rachita.png",
    },
  ],

  transformations: [
    {
      name: "Meera R.",
      concern: "Pigmentation",
      duration: "3 months",
      review:
        "My dark patches faded visibly and my tone finally looks even. The routine was simple and the doctor followed up every week.",
      rating: 5,
      resultImage: "/transformations/pigmentation.webp",
    },
    {
      name: "Ananya P.",
      concern: "Acne & glow",
      duration: "8 weeks",
      review:
        "First time someone diagnosed my skin before selling me anything. Active acne calmed down and my natural glow came back.",
      rating: 5,
      resultImage: "/transformations/acne-glow.webp",
    },
    {
      name: "Pooja S.",
      concern: "Dark circles",
      duration: "6 weeks",
      review:
        "My under-eye circles had bothered me for years. A targeted routine brightened the whole area and I look far less tired.",
      rating: 5,
      resultImage: "/transformations/undereye-dark-circles.webp",
    },
    {
      name: "Karan V.",
      concern: "Hair fall",
      duration: "12 weeks",
      review:
        "The consultation told me exactly what was triggering it. Hair fall dropped sharply and I could see new regrowth at the hairline.",
      rating: 5,
      resultImage: "/transformations/hair-fall.webp",
    },
    {
      name: "Nisha T.",
      concern: "Premature greying",
      duration: "10 weeks",
      review:
        "I was greying early and losing confidence. The right plan slowed it right down and my roots look healthier and darker.",
      rating: 4,
      resultImage: "/transformations/premature-greying.webp",
    },
    {
      name: "Arjun M.",
      concern: "Beard growth",
      duration: "9 weeks",
      review:
        "Patchy beard for years. With the doctor's routine the gaps filled in and it finally grows even and full.",
      rating: 5,
      resultImage: "/transformations/beard-growth.webp",
    },
    {
      name: "Rohit D.",
      concern: "Back & body acne",
      duration: "8 weeks",
      review:
        "Back acne was painful and stubborn. A proper plan cleared it up and the old marks faded steadily week by week.",
      rating: 5,
      resultImage: "/transformations/body-acne.webp",
    },
  ],

  faqs: [
    {
      question: "Why is the consultation just ₹49?",
      answer:
        "We are consultation-first, not product-first. ₹49 keeps expert guidance accessible so you diagnose before you spend anything on products.",
    },
    {
      question: "Is the guidance really personalised?",
      answer:
        "Yes. Your consultant reviews your concern, skin/hair type, lifestyle and budget before recommending anything — no generic routines.",
    },
    {
      question: "What concerns do you cover?",
      answer:
        "Skin (acne, pigmentation, dullness, ageing), hair (hair fall, dandruff, thinning) and body care concerns.",
    },
    {
      question: "What happens after I pay?",
      answer:
        "You share your details and concern, and our expert connects with you on WhatsApp for your consultation and personalised plan.",
    },
    {
      question: "Do I have to buy products?",
      answer:
        "No. The consultation stands on its own. Product recommendations are optional and matched to your budget if you want them.",
    },
  ],
};

/** Merge Sanity content over defaults; empty arrays fall back to defaults. */
export function mergeContent(remote) {
  if (!remote) return DEFAULTS;
  const merged = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    const val = remote[key];
    if (Array.isArray(DEFAULTS[key])) {
      if (Array.isArray(val) && val.length > 0) merged[key] = val;
    } else if (val && typeof val === "object") {
      merged[key] = { ...DEFAULTS[key], ...val };
    }
  }
  return merged;
}
