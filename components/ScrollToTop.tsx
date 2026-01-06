
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use window.scrollTo for global scrolling, which is more reliable than
    // scrolling a specific main element.
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
