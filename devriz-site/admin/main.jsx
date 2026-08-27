import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// The site's own stylesheet, imported deliberately. The editor renders article
// text in the real .blog-body rules and the preview iframe reuses whatever
// stylesheets this page has loaded, so both are the published styles rather
// than a copy of them that can drift. admin.css then dresses the panel around
// it and undoes the page-level body rules the site sets for visitors.
import "../src/index.css";
import "./admin.css";

import App from "./App.jsx";

createRoot(document.getElementById("admin-root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
