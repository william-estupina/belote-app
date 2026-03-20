import { useCallback, useEffect, useRef, useState } from "react";

import { prechargerImagesCartes } from "../components/game/cartesAssets";

interface OptionsUsePrechargementCartes {
  precharger?: () => Promise<void>;
}

export interface EtatPrechargementCartes {
  cartesPretes: boolean;
  attendreCartesPretes: () => Promise<void>;
}

export function usePrechargementCartes({
  precharger = prechargerImagesCartes,
}: OptionsUsePrechargementCartes = {}): EtatPrechargementCartes {
  const [cartesPretes, setCartesPretes] = useState(false);
  const promessePrechargementRef = useRef<Promise<void> | null>(null);

  const lancerPrechargement = useCallback(() => {
    if (!promessePrechargementRef.current) {
      promessePrechargementRef.current = precharger()
        .catch(() => undefined)
        .then(() => {
          setCartesPretes(true);
        });
    }

    return promessePrechargementRef.current;
  }, [precharger]);

  useEffect(() => {
    void lancerPrechargement();
  }, [lancerPrechargement]);

  const attendreCartesPretes = useCallback(async () => {
    await lancerPrechargement();
  }, [lancerPrechargement]);

  return {
    cartesPretes,
    attendreCartesPretes,
  };
}
