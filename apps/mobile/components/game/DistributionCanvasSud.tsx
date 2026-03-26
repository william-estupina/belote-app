import { Atlas, Canvas, rect, useRSXformBuffer } from "@shopify/react-native-skia";
import { useMemo } from "react";
import type { SharedValue } from "react-native-reanimated";

import { RATIO_LARGEUR_CARTE } from "../../constants/layout";
import { interpolerBezierQuadratique } from "../../hooks/distributionAtlas";
import type { CarteAtlas } from "../../hooks/useAnimationsDistribution";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";

interface PropsDistributionCanvasSud {
  atlas: AtlasCartes;
  cartesAtlas: CarteAtlas[];
  progressions: SharedValue<number>[];
  donneesWorklet: SharedValue<number[]>;
  nbCartesActives: SharedValue<number>;
  largeurEcran: number;
  hauteurEcran: number;
}

const STRIDE = 10;

/**
 * Canvas Skia éphémère qui dessine les cartes sud en vol pendant la distribution.
 * Se démonte quand la distribution est terminée.
 */
export function DistributionCanvasSud({
  atlas,
  cartesAtlas,
  progressions,
  donneesWorklet,
  nbCartesActives,
  largeurEcran,
  hauteurEcran,
}: PropsDistributionCanvasSud) {
  const nbCartes = cartesAtlas.length;

  // Rectangles source dans la sprite sheet (un par carte)
  const sprites = useMemo(
    () =>
      cartesAtlas.map((ca) =>
        rect(ca.rectSource.x, ca.rectSource.y, ca.rectSource.width, ca.rectSource.height),
      ),
    [cartesAtlas],
  );

  // Dimensions de la carte à l'écran
  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);

  // Facteur d'échelle sprite sheet → écran
  const scaleBase = atlas.largeurCellule > 0 ? largeurCarte / atlas.largeurCellule : 1;
  const pivotX = atlas.largeurCellule / 2;
  // Pivot bas pour les cartes sud (ancrage pied de carte)
  const pivotY = atlas.hauteurCellule;

  // RSXform buffer — recalculé à chaque frame par Skia worklet
  const transforms = useRSXformBuffer(nbCartes, (val, i) => {
    "worklet";
    const donnees = donneesWorklet.value;
    const nbActives = nbCartesActives.value;

    if (i >= nbActives) {
      val.set(0, 0, -10000, -10000);
      return;
    }

    const t = progressions[i].value;
    if (t < 0 || t > 1) {
      val.set(0, 0, -10000, -10000);
      return;
    }

    const offset = i * STRIDE;
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

    const pos = interpolerBezierQuadratique(
      { x: departX, y: departY },
      { x: controleX, y: controleY },
      { x: arriveeX, y: arriveeY },
      t,
    );

    const rotation = rotDepart + (rotArrivee - rotDepart) * t;
    const echelle = echDepart + (echArrivee - echDepart) * t;

    const rotRad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rotRad) * echelle * scaleBase;
    const sin = Math.sin(rotRad) * echelle * scaleBase;

    const pixelX = pos.x * largeurEcran;
    const pixelY = pos.y * hauteurEcran;

    val.set(
      cos,
      sin,
      pixelX - cos * pivotX + sin * pivotY,
      pixelY - sin * pivotX - cos * pivotY,
    );
  });

  if (!atlas.image || nbCartes === 0) return null;

  return (
    <Canvas
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: largeurEcran,
        height: hauteurEcran,
        zIndex: 100,
      }}
      pointerEvents="none"
    >
      <Atlas image={atlas.image} sprites={sprites} transforms={transforms} />
    </Canvas>
  );
}
