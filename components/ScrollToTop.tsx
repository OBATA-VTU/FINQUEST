import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // The main scrollable container has the ID 'main-content'.
    // We need to scroll this element, not the window, because of the overflow-hidden layout.
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.scrollTo(0, 0);
    } else {
      // Fallback to window scroll if the element isn't found (e.g., on pages without the main Layout)
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}