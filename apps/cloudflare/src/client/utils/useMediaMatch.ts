import { useEffect, useState } from "react";

export default function useMediaMatch(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    mediaQueryList.onchange = listener;
    return () => {
      mediaQueryList.onchange = null;
    };
  }, [query]);
  return matches;
}
