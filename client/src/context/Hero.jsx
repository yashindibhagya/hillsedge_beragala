import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Lets a page say "I open with a full-bleed image", so the header knows to
 * sit transparent over it until the visitor scrolls. Pages without one get a
 * solid header from the first frame, rather than white text on white.
 */
const HeroContext = createContext({ setHero: () => {} });

export function HeroProvider({ children }) {
  const [hero, setHero] = useState(false);
  return <HeroContext.Provider value={{ hero, setHero }}>{children}</HeroContext.Provider>;
}

export const useHeroState = () => useContext(HeroContext).hero;

/** Call from a page's hero component. */
export function useDeclareHero() {
  const { setHero } = useContext(HeroContext);
  useEffect(() => {
    setHero(true);
    return () => setHero(false);
  }, [setHero]);
}
