import { Atlas, Canvas, rect, useRSXformBuffer } from "@shopify/react-native-skia";
import { useEffect, useMemo } from "react";
import type { SharedValue } from "react-native-reanimated";

import { RATIO_LARGEUR_CARTE } from "../../constants/layout";
import { interpolerBezierQuadratique } from "../../hooks/distributionAtlas";
import { calculerVersoSource } from "../../hooks/distributionAtlas";
import {
  calculerCiblesEventailAdversaire,
  ECHELLE_MAIN_ADVERSE,
} from "../../hooks/distributionLayoutAtlas";
import type { CarteAtlas } from "../../hooks/useAnimationsDistribution";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";

interface PropsCanvasAdversaires {
  atlas: AtlasCartes;
  largeurEcran: number;
  hauteurEcran: number;
  nbCartesAdversaires: { nord: number; est: number; ouest: number };
  cartesAtlasAdversaires: CarteAtlas[];
  progressions: SharedValue<number>[];
  donneesWorklet: SharedValue<number[]>;
  nbCartesActives: SharedValue<number>;
  distributionEnCours: boolean;
}

const STRIDE = 10;
const MAX_ADVERSAIRES = 24; // 8 par adversaire max

export function CanvasAdversaires({
  atlas,
  largeurEcran,
  hauteurEcran,
  nbCartesAdversaires,
  cartesAtlasAdversaires,
  progressions,
  donneesWorklet,
  nbCartesActives,
  distributionEnCours,
}: PropsCanvasAdversaires) {
  const nbSprites = Math.max(cartesAtlasAdversaires.length, MAX_ADVERSAIRES);

  // Source rects — all back-of-card (verso)
  const sprites = useMemo(() => {
    if (atlas.largeurCellule === 0) return [];
    const verso = calculerVersoSource(atlas.largeurCellule, atlas.hauteurCellule);
    return Array.from({ length: nbSprites }, () =>
      rect(verso.x, verso.y, verso.width, verso.height),
    );
  }, [atlas.largeurCellule, atlas.hauteurCellule, nbSprites]);

  // Card dimensions
  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const scaleBase = atlas.largeurCellule > 0 ? largeurCarte / atlas.largeurCellule : 1;
  const pivotX = atlas.largeurCellule / 2;
  const pivotY = atlas.hauteurCellule / 2;

  // Recalculate fan positions when nbCartesAdversaires changes (not during distribution)
  useEffect(() => {
    if (distributionEnCours) return;

    const { nord, ouest, est } = nbCartesAdversaires;
    const total = nord + ouest + est;

    if (total === 0) {
      nbCartesActives.value = 0;
      return;
    }

    const donnees = new Array(MAX_ADVERSAIRES * STRIDE).fill(0);
    let index = 0;

    const positions: Array<{ position: "nord" | "ouest" | "est"; nb: number }> = [
      { position: "nord", nb: nord },
      { position: "ouest", nb: ouest },
      { position: "est", nb: est },
    ];

    for (const { position, nb } of positions) {
      if (nb === 0) continue;
      const cibles = calculerCiblesEventailAdversaire(
        position,
        0,
        nb,
        nb,
        largeurEcran,
        hauteurEcran,
      );
      for (const cible of cibles) {
        const offset = index * STRIDE;
        // depart = arrivee (no interpolation)
        donnees[offset] = cible.arrivee.x;
        donnees[offset + 1] = cible.arrivee.y;
        donnees[offset + 2] = cible.arrivee.x; // controle = arrivee
        donnees[offset + 3] = cible.arrivee.y;
        donnees[offset + 4] = cible.arrivee.x;
        donnees[offset + 5] = cible.arrivee.y;
        donnees[offset + 6] = cible.rotationArrivee; // rotDepart
        donnees[offset + 7] = cible.rotationArrivee; // rotArrivee
        donnees[offset + 8] = ECHELLE_MAIN_ADVERSE; // echDepart
        donnees[offset + 9] = ECHELLE_MAIN_ADVERSE; // echArrivee
        progressions[index].value = 1;
        index++;
      }
    }

    // Park remaining sprites off-screen
    for (let i = index; i < MAX_ADVERSAIRES; i++) {
      progressions[i].value = -1;
    }

    donneesWorklet.value = donnees;
    nbCartesActives.value = index;
  }, [
    nbCartesAdversaires,
    distributionEnCours,
    largeurEcran,
    hauteurEcran,
    progressions,
    donneesWorklet,
    nbCartesActives,
  ]);

  // RSXform buffer — recalculated each frame by Skia worklet
  const transforms = useRSXformBuffer(nbSprites, (val, i) => {
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

  if (!atlas.image || sprites.length === 0) return null;

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
      <Atlas image={atlas.image} sprites={sprites} transforms={transforms} />
    </Canvas>
  );
}
