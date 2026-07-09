# Devriz Healthcare — Website + Sanity CMS

Awwwards-style animated site (GSAP scroll animations, like the Spylt reference) for
**devrizhealthcare.com**, with all content editable in Sanity.

```
devriz healthcare/
├── devriz-site/   ← the website  (Vite + React + Tailwind 4 + GSAP + Sanity client)
└── studio-dh/     ← Sanity Studio (your content dashboard, project zuekl44i)
```

---

## 1. Run locally

```powershell
# the website
cd devriz-site
npm run dev          # → http://localhost:5173

# the content studio (separate terminal)
cd studio-dh
npx sanity login     # one time — pick Google/GitHub/email, same account as sanity.io
npm run dev          # → http://localhost:3333
```

---

## 2. One-time Sanity setup (IMPORTANT — do this first)

The site reads content directly from Sanity's CDN in the browser, so your
website's addresses must be whitelisted:

1. Go to <https://sanity.io/manage> → project **zuekl44i** → **API** → **CORS origins**
2. Add these origins (Allow credentials NOT needed):
   - `http://localhost:5173` (local dev)
   - `http://localhost:3333` (studio, usually already there)
   - your production URL once deployed, e.g. `https://devriz-site.vercel.app` and `https://devrizhealthcare.com`

Until you do this, the site still works — it shows its built-in default content.

---

## 3. How to use Sanity (uploading content)

Open the studio (`npm run dev` in `studio-dh`, or your deployed studio URL).
You'll see these content types in the left sidebar:

| Type | What it controls |
|---|---|
| **Site Settings** | ₹49 / ₹499 prices, booking link, WhatsApp, email, address, socials, trust stats, and the doctor photo that moves with scroll in the "Why consultation" section. **Create exactly ONE.** |
| **Hero Banners** | The full-screen hero carousel. |
| **"Why consultation" Cards** | The 4 trust cards (title + description) that slide in as you scroll. |
| **Process Steps** | The 3 cards (Consult → Products → Dispatch). |
| **Doctors** | Your team — photo, role, experience badges. |
| **Transformations** | The horizontal-scroll section. Upload a **testimonial video** (mp4) OR before/after photos per entry — videos play automatically while the section is on screen. |
| **FAQs** | The FAQ accordion. |

### Hero slider — adding your banner background photos

The hero has 4 animated slides (Skin, Hair, Body, Free AI) with headline + button
over a dark charcoal background. To put your own photo behind the text, either:

**Option A — quickest (local files):** drop 4 images into `devriz-site/public/images/`
named exactly:
- `hero-bg-skin.jpg`
- `hero-bg-hair.jpg`
- `hero-bg-body.jpg`
- `hero-bg-ai.jpg`

They appear behind the text automatically (dark scrim keeps the text readable).
Use wide, dark-background portraits (~1920×900). No code change needed.

**Option B — Sanity (recommended long-term):** create Hero Slider documents (below).
Each Sanity slide replaces the built-in ones entirely and supports desktop + mobile
images plus the overlay text.

### Hero banners — desktop vs mobile images (your question)

Each **Hero Banner** document has **two separate image fields**:

- **Desktop image** — the wide one (recommended ~1920×900 px)
- **Mobile image** — the tall/short one (recommended ~900×1200 px)

Upload both. Phones automatically get the mobile image; laptops get the desktop
one. If you skip the mobile image, the desktop image is reused and auto-cropped —
drag the **hotspot** (crop tool on the image) to tell it which part matters.
Set **Order** (1, 2, 3…) to control the carousel sequence.

Images are served by Sanity's global image CDN — automatically converted to
WebP/AVIF and resized per device, so uploads can be big; visitors always get
small fast files.

### Publishing

After editing any document press **Publish** (bottom right). The site picks it
up on the next page load (it caches content for 5 minutes per visitor, so give
it a few minutes or hard-refresh).

---

## 4. Deploy (fastest path)

### Website → Vercel (free, global CDN)

```powershell
cd devriz-site
npm i -g vercel
vercel           # first time: log in, accept defaults (it auto-detects Vite)
vercel --prod
```

Then add the printed URL to Sanity CORS origins (step 2). Later you can attach
your real domain in the Vercel dashboard.

(Netlify or Cloudflare Pages work identically — build command `npm run build`,
output folder `dist`.)

### Studio → free Sanity hosting

```powershell
cd studio-dh
npx sanity deploy   # pick a hostname, e.g. devriz → https://devriz.sanity.studio
```

Now you can edit content from any device at that URL.

---

## 5. Why it's fast

- Static Vite build — no server, served entirely from CDN edge.
- First load ≈ 160 KB gzipped; content swaps in from Sanity's cached CDN
  (`useCdn: true`) with a 5-minute sessionStorage cache on top.
- The 3D doctor (compressed from 15 MB → 0.6 MB) and three.js load lazily,
  only when that section scrolls near — they never block the first paint.
- Immutable cache headers for models/images/assets via `vercel.json`.
- Built-in fallback content: if Sanity is unreachable, the site still renders
  fully and instantly.
