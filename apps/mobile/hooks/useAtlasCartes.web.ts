import type { Couleur, Rang } from "@belote/shared-types";

import {
  calculerRectoSource,
  calculerVersoSource,
  type RectSource,
} from "./distributionAtlas";
import { resoudreSourceAssetAtlas } from "./sourceAssetAtlas";

const LARGEUR_CELLULE_WEB = 167;
const HAUTEUR_CELLULE_WEB = 243;
const SPRITE_SHEET_RAW = require("../assets/sprites/sprite-sheet.png");

export const SPRITE_SHEET_SOURCE = resoudreSourceAssetAtlas({
  os: "web",
  source: SPRITE_SHEET_RAW,
});

export interface AtlasCartes {
  image: null;
  largeurCellule: number;
  hauteurCellule: number;
  rectSource: (couleur: Couleur, rang: Rang) => RectSource;
  rectDos: () => RectSource;
}

export function useAtlasCartes(): AtlasCartes {
  return {
    image: null,
    largeurCellule: LARGEUR_CELLULE_WEB,
    hauteurCellule: HAUTEUR_CELLULE_WEB,
    rectSource: (couleur: Couleur, rang: Rang) =>
      calculerRectoSource(LARGEUR_CELLULE_WEB, HAUTEUR_CELLULE_WEB, couleur, rang),
    rectDos: () => calculerVersoSource(LARGEUR_CELLULE_WEB, HAUTEUR_CELLULE_WEB),
  };
}
