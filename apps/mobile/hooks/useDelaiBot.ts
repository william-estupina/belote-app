import { useCallback, useRef } from "react";

import { ANIMATIONS } from "../constants/layout";

interface OptionsDelai {
  min?: number;
  max?: number;
}

/**
 * Hook pour simuler un délai réaliste quand un bot joue.
 * Le délai est aléatoire entre min et max (500-1000ms par défaut).
 * Accepte des options pour personnaliser le délai (ex: enchères plus lentes).
 */
export function useDelaiBot() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const attendreDelaiBot = useCallback((options?: OptionsDelai): Promise<void> => {
    return new Promise((resolve) => {
      const min = options?.min ?? ANIMATIONS.delaiBot.min;
      const max = options?.max ?? ANIMATIONS.delaiBot.max;
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
