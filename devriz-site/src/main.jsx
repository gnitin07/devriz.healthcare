import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import LandingApp from "./LandingApp.jsx";

// Simple path-based switch (no router dependency).
// /consult (and /consult/) serves the Meta-ads landing page; everything else
// serves the main site.
const path = window.location.pathname.replace(/\/+$/, "");
const Root = path === "/consult" ? LandingApp : App;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
