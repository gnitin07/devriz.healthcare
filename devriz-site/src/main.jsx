import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
// NOTE: the /react entrypoints, not /next — this is a Vite SPA, and the /next
// builds expect Next.js's router to be present.
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "./index.css";
import App from "./App.jsx";
import LandingApp from "./LandingApp.jsx";
import PrivacyApp from "./PrivacyApp.jsx";

// The AI face-scan page is lazy-loaded so face-api + its model code land in a
// SEPARATE chunk — the main site and /consult never download any of it.
const FaceScanApp = lazy(() => import("./facescan/FaceScanApp.jsx"));

// Blog pages (Sanity-driven) are also a separate chunk — visitors who never
// open /blogs don't download the portable-text renderer.
const BlogApp = lazy(() => import("./blog/BlogApp.jsx"));

// Simple path-based switch (no router dependency).
// /consult → Meta-ads landing page; /ai-scan → AI face-scan; else → main site.
const path = window.location.pathname.replace(/\/+$/, "");

let root;
if (path === "/consult") {
  root = <LandingApp />;
} else if (path === "/privacy-policy") {
  root = <PrivacyApp />;
} else if (path === "/blogs" || path.startsWith("/blogs/")) {
  root = (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100dvh",
            background: "#fffdf0",
          }}
        />
      }
    >
      <BlogApp path={path} />
    </Suspense>
  );
} else if (path === "/ai-scan") {
  root = (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100dvh",
            display: "grid",
            placeItems: "center",
            background: "#fffdf0",
            color: "#46390f",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          Loading AI Skin Analysis…
        </div>
      }
    >
      <FaceScanApp />
    </Suspense>
  );
} else {
  root = <App />;
}

// Mounted here rather than inside App/LandingApp so every route — home,
// /consult, /blogs, /ai-scan, /privacy-policy — is measured from one place.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    {root}
    <Analytics />
    <SpeedInsights />
  </StrictMode>
);
