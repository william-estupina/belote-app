import type { Couleur, Rang } from "@belote/shared-types";
import { useImage } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { Platform } from "react-native";

import {
  calculerRectoSource,
  calculerVersoSource,
  type RectSource,
  SPRITE_COLONNES,
  SPRITE_LIGNES,
} from "./distributionAtlas";
import { resoudreSourceAssetAtlas } from "./sourceAssetAtlas";

// Sur web, Metro/Expo peut retourner un module ES (`default`) ou un objet asset (`uri`).

const SPRITE_SHEET_RAW = require("../assets/sprites/sprite-sheet.png");
export const SPRITE_SHEET_SOURCE = resoudreSourceAssetAtlas({
  os: Platform.OS,
  source: SPRITE_SHEET_RAW,
});

export interface AtlasCartes {
  image: ReturnType<typeof useImage>;
  largeurCellule: number;
  hauteurCellule: number;
  rectSource: (couleur: Couleur, rang: Rang) => RectSource;
  rectDos: () => RectSource;
}

/**
 * Hook qui charge le sprite sheet et expose les fonctions de mapping atlas.
 * Les dimensions des cellules sont calculees dynamiquement depuis l'image chargee.
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
