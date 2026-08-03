import { ContentProvider } from "../lib/ContentContext";
import { HeaderThemeProvider } from "../lib/HeaderTheme";
import { BookingProvider } from "../lib/BookingContext";
import ConsultModal from "../components/ConsultModal";
import NavBar from "../components/NavBar";
import FooterSection from "../sections/FooterSection";
import BlogListSection from "./BlogListSection";
import BlogPostSection from "./BlogPostSection";

/**
 * /blogs and /blogs/<slug> — same shell as the home page (NavBar + Footer +
 * booking modal) so the ₹49 CTA keeps working from articles. Content comes
 * from Sanity `post` documents; only published ones ever appear.
 */
const BlogApp = ({ path }) => {
  const slug = path.replace(/^\/blogs\/?/, "").replace(/\/+$/, "");

  return (
    <ContentProvider>
      <HeaderThemeProvider>
        <BookingProvider>
          <main>
            <NavBar />
            {slug ? <BlogPostSection slug={slug} /> : <BlogListSection />}
            <FooterSection />
          </main>
          <ConsultModal />
        </BookingProvider>
      </HeaderThemeProvider>
    </ContentProvider>
  );
};

export default BlogApp;
