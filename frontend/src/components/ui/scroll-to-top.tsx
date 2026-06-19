import { useEffect } from "react";

interface ScrollToTopProps {
  watch: any;
}

export default function ScrollToTop({ watch }: ScrollToTopProps) {
  useEffect(() => {
    window.scrollTo(0, 0);

    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto" 
      });
    }
  }, [watch]);

  return null;
}
