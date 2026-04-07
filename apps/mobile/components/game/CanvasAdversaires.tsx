import {
  Atlas,
  Canvas,
  Group,
  rect,
  Shadow,
  type SkRect,
  useRSXformBuffer,
} from "@shopify/react-native-skia";
import { memo, useMemo } from "react";
import type { SharedValue } from "react-native-reanimated";

import { RATIO_LARGEUR_CARTE } from "../../constants/layout";
import { interpolerBezierQuadratique } from "../../hooks/distributionAtlas";
import type { CarteAtlas } from "../../hooks/useAnimationsDistribution";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";

interface PropsCanvasAdversaires {
  atlas: AtlasCartes;
  largeurEcran: number;
  hauteurEcran: number;
  cartesAtlasAdversaires: CarteAtlas[];
  progressions: SharedValue<number>[];
  donneesWorklet: SharedValue<number[]>;
  nbCartesActives: SharedValue<number>;
  distributionEnCours: boolean;
}

const STRIDE = 10;
const MAX_ADVERSAIRES = 24;

function convertirRectSource(source: CarteAtlas["rectSource"]): SkRect {
  return rect(source.x, source.y, source.width, source.height);
}

export const CanvasAdversaires = memo(
  function CanvasAdversaires({
    atlas,
    largeurEcran,
    hauteurEcran,
    cartesAtlasAdversaires,
    progressions,
    donneesWorklet,
    nbCartesActives,
    distributionEnCours,
  }: PropsCanvasAdversaires) {
    const largeurCarteBase = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
    const echelleBase =
      atlas.largeurCellule > 0 ? largeurCarteBase / atlas.largeurCellule : 1;
    const pivotX = atlas.largeurCellule / 2;
    const pivotY = atlas.hauteurCellule / 2;
    const sprites = useMemo(() => {
      const dos = atlas.rectDos();

      return Array.from({ length: MAX_ADVERSAIRES }, (_, index) =>
        convertirRectSource(cartesAtlasAdversaires[index]?.rectSource ?? dos),
      );
    }, [atlas, cartesAtlasAdversaires]);

    const transformations = useRSXformBuffer(MAX_ADVERSAIRES, (valeur, index) => {
      "worklet";
      const donnees = donneesWorklet.value;
      const nbActives = nbCartesActives.value;

      if (index >= nbActives) {
        valeur.set(0, 0, -10000, -10000);
        return;
      }

      const t = progressions[index].value;
      if (t < 0 || t > 1) {
        valeur.set(0, 0, -10000, -10000);
        return;
      }

      const offset = index * STRIDE;
      const departX = donnees[offset];
      const departY = donnees[offset + 1];
      const controleX = donnees[offset + 2];
      const controleY = donnees[offset + 3];
      const arriveeX = donnees[offset + 4];
      const arriveeY = donnees[offset + 5];
      const rotDepart = donnees[offset + 6];
      const rotArrivee = donnees[offset + 7];
      const echDepart = donnees[offset + 8];
      const echArrivee = donnees[offset + 9];

      const position = interpolerBezierQuadratique(
        { x: departX, y: departY },
        { x: controleX, y: controleY },
        { x: arriveeX, y: arriveeY },
        t,
      );
      const rotation = rotDepart + (rotArrivee - rotDepart) * t;
      const echelle = echDepart + (echArrivee - echDepart) * t;
      const radians = (rotation * Math.PI) / 180;
      const cos = Math.cos(radians) * echelle * echelleBase;
      const sin = Math.sin(radians) * echelle * echelleBase;
      const pixelX = position.x * largeurEcran;
      const pixelY = position.y * hauteurEcran;

      valeur.set(
        cos,
        sin,
        pixelX - cos * pivotX + sin * pivotY,
        pixelY - sin * pivotX - cos * pivotY,
      );
    });

    if (!distributionEnCours) {
      return null;
    }

    return (
      <Canvas
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: largeurEcran,
          height: hauteurEcran,
          zIndex: 10,
        }}
        pointerEvents="none"
      >
        <Group>
          <Shadow dx={1} dy={2} blur={4} color="rgba(0, 0, 0, 0.35)" />
          {atlas.image && (
            <Atlas image={atlas.image} sprites={sprites} transforms={transformations} />
          )}
        </Group>
      </Canvas>
    );
  },
  (prev, next) =>
    prev.largeurEcran === next.largeurEcran &&
    prev.hauteurEcran === next.hauteurEcran &&
    prev.distributionEnCours === next.distributionEnCours &&
    prev.cartesAtlasAdversaires === next.cartesAtlasAdversaires &&
    prev.progressions === next.progressions &&
    prev.donneesWorklet === next.donneesWorklet &&
    prev.nbCartesActives === next.nbCartesActives,
);
