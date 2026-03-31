import type { SharedValue } from "react-native-reanimated";

import type { CarteAtlas } from "../../hooks/useAnimationsDistribution";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";

interface PropsCanvasCartesUnifie {
  atlas: AtlasCartes;
  cartesAtlas: CarteAtlas[];
  progressions: SharedValue<number>[];
  donneesWorklet: SharedValue<number[]>;
  nbCartesActives: SharedValue<number>;
  largeurEcran: number;
  hauteurEcran: number;
  nbCartesAdversaires?: { nord: number; est: number; ouest: number };
  distributionEnCours?: boolean;
}

export function CanvasCartesUnifie(_: PropsCanvasCartesUnifie) {
  return null;
}
