import { createContext, useContext, useEffect, useState } from "react";
import { fetchContent } from "./sanity";
import { DEFAULTS, mergeContent } from "./defaults";
import { ScrollTrigger } from "gsap/all";

const ContentContext = createContext(DEFAULTS);

export const useContent = () => useContext(ContentContext);

export const ContentProvider = ({ children }) => {
  const [content, setContent] = useState(DEFAULTS);

  useEffect(() => {
    let alive = true;
    fetchContent()
      .then((remote) => {
        if (!alive) return;
        setContent(mergeContent(remote));
        // layout may have changed height — recalc pinned scroll positions
        requestAnimationFrame(() => ScrollTrigger.refresh());
      })
      .catch(() => {
        /* offline / CORS not set yet — defaults keep the site fully usable */
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <ContentContext.Provider value={content}>
      {children}
    </ContentContext.Provider>
  );
};
