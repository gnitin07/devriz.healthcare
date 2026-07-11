import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import LandingApp from "./LandingApp.jsx";

// The AI face-scan page is lazy-loaded so face-api + its model code land in a
// SEPARATE chunk — the main site and /consult never download any of it.
const FaceScanApp = lazy(() => import("./facescan/FaceScanApp.jsx"));

// Simple path-based switch (no router dependency).
// /consult → Meta-ads landing page; /ai-scan → AI face-scan; else → main site.
const path = window.location.pathname.replace(/\/+$/, "");

let root;
if (path === "/consult") {
  root = <LandingApp />;
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

createRoot(document.getElementById("root")).render(
  <StrictMode>{root}</StrictMode>
);
