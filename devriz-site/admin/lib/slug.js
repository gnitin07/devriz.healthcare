/**
 * Mirror of slugify() in server/store.mjs. The server is authoritative — it is
 * what names the file — but the address shown under the title field has to
 * match what the server will produce, or the writer sets an address and gets a
 * different one.
 *
 * Keep the two in step.
 */
export const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/**
 * The same tidy-up, minus the trailing-hyphen trim.
 *
 * slugify() strips hyphens off the end, which is correct for a finished slug
 * and unusable while someone is still typing one: the moment they type the "-"
 * in "acne-guide" it is deleted again, so a hyphen can never be entered at all.
 * This runs on each keystroke, and the strict version runs on blur and on save.
 */
export const slugifyLive = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
