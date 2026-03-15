import { useCallback, useRef } from "react";

import { ANIMATIONS } from "../constants/layout";

/**
 * Hook pour simuler un délai réaliste quand un bot joue.
 * Le délai est aléatoire entre min et max (500-1000ms par défaut).
 */
export function useDelaiBot() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const attendreDelaiBot = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const { min, max } = ANIMATIONS.delaiBot;
      const delai = Math.round(min + Math.random() * (max - min));

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        resolve();
      }, delai);
    });
  }, []);

  const annulerDelai = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { attendreDelaiBot, annulerDelai };
}
