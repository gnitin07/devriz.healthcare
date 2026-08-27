import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/**
 * `npm run dev` has no Express in front of it, so the two things the blog now
 * reads at runtime would 404 there: /api/posts.json, and /blog-images (uploads
 * live outside the repo in production). Serving both from the dev server keeps
 * developing the blog the same as running it.
 *
 * The admin panel itself is NOT served here — it writes files, so it needs the
 * real server. Run `npm run build && npm start` to work on /admin.
 */
const devBlogApi = () => ({
  name: "dev-blog-api",
  apply: "serve",
  async configureServer(server) {
    const { listFrom, IMAGES_DIR } = await import("./server/store.mjs");
    const { present } = await import("./server/prerender.mjs");
    const sirv = (await import("node:fs")).createReadStream;

    server.middlewares.use("/api/posts.json", (req, res) => {
      const posts = listFrom(path.join(ROOT, "content/blog"))
        .filter((p) => !p.draft)
        .map(present);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ posts }));
    });

    // The admin panel's own routes are Express's, and Express is not running
    // here. Without this, /admin loads a login box that cannot possibly work:
    // GET /api/admin/me falls through to the SPA fallback and answers 200 with
    // HTML, POST /api/admin/login 404s, and nothing on screen says why. Say why.
    server.middlewares.use("/api/admin", (req, res) => {
      const dev = true;
      res.setHeader("Content-Type", "application/json");
      // /me is what the panel calls on load, and it has to succeed for the
      // login screen to render the explanation rather than a generic failure.
      if (req.url === "/me" || req.url === "/me/") {
        res.end(JSON.stringify({ configured: false, signedIn: false, dev }));
        return;
      }
      res.statusCode = 503;
      res.end(
        JSON.stringify({
          dev,
          error:
            "The editor needs the real server. Stop this, then run: npm run build && npm start",
        })
      );
    });

    // public/blog-images is Vite's own; this adds the live content folder on
    // top so images uploaded through a local /admin session resolve too.
    server.middlewares.use("/blog-images", (req, res, next) => {
      const file = path.join(IMAGES_DIR, path.basename(req.url.split("?")[0]));
      if (!file.startsWith(IMAGES_DIR + path.sep)) return next();
      const stream = sirv(file);
      stream.on("error", next);
      stream.pipe(res);
    });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), devBlogApi()],
  build: {
    target: "esnext",
    rollupOptions: {
      // Two pages: the site, and the blog editor. Separate entries so none of
      // TipTap's editor code can end up in a bundle a visitor downloads.
      input: {
        main: path.resolve(ROOT, "index.html"),
        admin: path.resolve(ROOT, "admin/index.html"),
      },
      output: {
        manualChunks: {
          gsap: ["gsap", "@gsap/react"],
        },
      },
    },
  },
});
