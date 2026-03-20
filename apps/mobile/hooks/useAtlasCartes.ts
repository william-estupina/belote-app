import type { Couleur, Rang } from "@belote/shared-types";
import { useImage } from "@shopify/react-native-skia";
import { useMemo } from "react";

import {
  calculerRectoSource,
  calculerVersoSource,
  type RectSource,
  SPRITE_COLONNES,
  SPRITE_LIGNES,
} from "./distributionAtlas";

const SPRITE_SHEET_SOURCE = require("../assets/sprites/sprite-sheet.png");

export interface AtlasCartes {
  image: ReturnType<typeof useImage>;
  largeurCellule: number;
  hauteurCellule: number;
  rectSource: (couleur: Couleur, rang: Rang) => RectSource;
  rectDos: () => RectSource;
}

/**
 * Hook qui charge le sprite sheet et expose les fonctions de mapping atlas.
 * Les dimensions des cellules sont calculées dynamiquement depuis l'image chargée.
 */
export function useAtlasCartes(): AtlasCartes {
  const image = useImage(SPRITE_SHEET_SOURCE);

  const largeurCellule = image ? image.width() / SPRITE_COLONNES : 0;
  const hauteurCellule = image ? image.height() / SPRITE_LIGNES : 0;

  const rectSource = useMemo(
    () => (couleur: Couleur, rang: Rang) =>
      calculerRectoSource(largeurCellule, hauteurCellule, couleur, rang),
    [largeurCellule, hauteurCellule],
  );

  const rectDos = useMemo(
    () => () => calculerVersoSource(largeurCellule, hauteurCellule),
    [largeurCellule, hauteurCellule],
  );

  return { image, largeurCellule, hauteurCellule, rectSource, rectDos };
}
