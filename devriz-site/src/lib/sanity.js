import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

export const client = createClient({
  projectId: "zuekl44i",
  dataset: "production",
  apiVersion: "2025-01-01",
  useCdn: true, // apicdn.sanity.io — globally cached, fast
});

const builder = imageUrlBuilder(client);

/** urlFor(image).width(1600).auto('format').url() */
export const urlFor = (source) => builder.image(source);

/** One query for everything the page needs — a single cached round-trip. */
export const CONTENT_QUERY = /* groq */ `{
  "settings": *[_type == "siteSettings"][0],
  "heroBanners": *[_type == "heroBanner"] | order(order asc),
  "whyBanners": *[_type == "whyBanner"] | order(order asc),
  "steps": *[_type == "processStep"] | order(order asc),
  "doctors": *[_type == "doctor"] | order(order asc),
  "transformations": *[_type == "transformation"] | order(order asc){
    ...,
    "videoUrl": video.asset->url
  },
  "faqs": *[_type == "faq"] | order(order asc)
}`;

const CACHE_KEY = "dh-content-v1";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchContent() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { at, data } = JSON.parse(cached);
      if (Date.now() - at < CACHE_TTL) return data;
    }
  } catch {
    /* storage unavailable — fall through to network */
  }

  const data = await client.fetch(CONTENT_QUERY);
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* ignore quota errors */
  }
  return data;
}
