import {
  Atlas,
  Canvas,
  Group,
  rect,
  Shadow,
  useRSXformBuffer,
} from "@shopify/react-native-skia";
import { useEffect, useMemo, useState } from "react";
import type { SharedValue } from "react-native-reanimated";

import { RATIO_LARGEUR_CARTE } from "../../constants/layout";
import { interpolerBezierQuadratique } from "../../hooks/distributionAtlas";
import {
  calculerCiblesEventailAdversaire,
  ECHELLE_MAIN_ADVERSE,
} from "../../hooks/distributionLayoutAtlas";
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

const STRIDE = 10;
const MAX_CARTES = 32;
const OFFSET_ADVERSAIRES = 8;

export function CanvasCartesUnifie({
  atlas,
  cartesAtlas,
  progressions,
  donneesWorklet,
  nbCartesActives,
  largeurEcran,
  hauteurEcran,
  nbCartesAdversaires,
  distributionEnCours = false,
}: PropsCanvasCartesUnifie) {
  const [cartesAtlasRendu, setCartesAtlasRendu] = useState(cartesAtlas);

  useEffect(() => {
    setCartesAtlasRendu(cartesAtlas);
  }, [cartesAtlas]);

  useEffect(() => {
    if (distributionEnCours || !nbCartesAdversaires || !atlas.image) {
      return;
    }

    const { nord, est, ouest } = nbCartesAdversaires;
    const total = nord + est + ouest;
    if (total === 0) {
      nbCartesActives.value = 0;
      return;
    }

    const prochainesCartes = [...cartesAtlas];
    const prochainesDonnees = [...donneesWorklet.value];
    let slot = OFFSET_ADVERSAIRES;

    for (let indexSud = 0; indexSud < OFFSET_ADVERSAIRES; indexSud += 1) {
      progressions[indexSud].value = -1;
    }

    for (const entree of [
      { position: "nord", nb: nord },
      { position: "ouest", nb: ouest },
      { position: "est", nb: est },
    ] as const) {
      if (entree.nb === 0) continue;

      const cibles = calculerCiblesEventailAdversaire(
        entree.position,
        0,
        entree.nb,
        entree.nb,
        largeurEcran,
        hauteurEcran,
      );

      for (const cible of cibles) {
        const carteAtlas = {
          ...prochainesCartes[slot],
          joueur: entree.position,
          depart: cible.arrivee,
          arrivee: cible.arrivee,
          controle: cible.arrivee,
          rotationDepart: cible.rotationArrivee,
          rotationArrivee: cible.rotationArrivee,
          echelleDepart: ECHELLE_MAIN_ADVERSE,
          echelleArrivee: ECHELLE_MAIN_ADVERSE,
          rectSource: atlas.rectDos(),
        } satisfies CarteAtlas;

        prochainesCartes[slot] = carteAtlas;

        const offset = slot * STRIDE;
        prochainesDonnees[offset] = carteAtlas.depart.x;
        prochainesDonnees[offset + 1] = carteAtlas.depart.y;
        prochainesDonnees[offset + 2] = carteAtlas.controle.x;
        prochainesDonnees[offset + 3] = carteAtlas.controle.y;
        prochainesDonnees[offset + 4] = carteAtlas.arrivee.x;
        prochainesDonnees[offset + 5] = carteAtlas.arrivee.y;
        prochainesDonnees[offset + 6] = carteAtlas.rotationDepart;
        prochainesDonnees[offset + 7] = carteAtlas.rotationArrivee;
        prochainesDonnees[offset + 8] = carteAtlas.echelleDepart;
        prochainesDonnees[offset + 9] = carteAtlas.echelleArrivee;
        progressions[slot].value = 1;
        slot += 1;
      }
    }

    for (let index = slot; index < MAX_CARTES; index += 1) {
      progressions[index].value = -1;
    }

    donneesWorklet.value = prochainesDonnees;
    nbCartesActives.value = slot;
    setCartesAtlasRendu(prochainesCartes);
  }, [
    atlas,
    cartesAtlas,
    distributionEnCours,
    donneesWorklet,
    hauteurEcran,
    largeurEcran,
    nbCartesActives,
    nbCartesAdversaires,
    progressions,
  ]);

  const sprites = useMemo(() => {
    if (cartesAtlasRendu.length === 0) return [];

    return cartesAtlasRendu.map((carteAtlas) =>
      rect(
        carteAtlas.rectSource.x,
        carteAtlas.rectSource.y,
        carteAtlas.rectSource.width,
        carteAtlas.rectSource.height,
      ),
    );
  }, [cartesAtlasRendu]);

  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const scaleBase = atlas.largeurCellule > 0 ? largeurCarte / atlas.largeurCellule : 1;
  const pivotX = atlas.largeurCellule / 2;
  const pivotY = atlas.hauteurCellule / 2;

  const transforms = useRSXformBuffer(MAX_CARTES, (val, index) => {
    "worklet";
    const donnees = donneesWorklet.value;
    const nbActives = nbCartesActives.value;

    if (index >= nbActives) {
      val.set(0, 0, -10000, -10000);
      return;
    }

    const progression = progressions[index].value;
    if (progression < 0 || progression > 1) {
      val.set(0, 0, -10000, -10000);
      return;
    }

    const offset = index * STRIDE;
    const departX = donnees[offset];
    const departY = donnees[offset + 1];
    const controleX = donnees[offset + 2];
    const controleY = donnees[offset + 3];
    const arriveeX = donnees[offset + 4];
    const arriveeY = donnees[offset + 5];
    const rotationDepart = donnees[offset + 6];
    const rotationArrivee = donnees[offset + 7];
    const echelleDepart = donnees[offset + 8];
    const echelleArrivee = donnees[offset + 9];

    const position = interpolerBezierQuadratique(
      { x: departX, y: departY },
      { x: controleX, y: controleY },
      { x: arriveeX, y: arriveeY },
      progression,
    );
    const rotation = rotationDepart + (rotationArrivee - rotationDepart) * progression;
    const echelle = echelleDepart + (echelleArrivee - echelleDepart) * progression;
    const rotationRad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rotationRad) * echelle * scaleBase;
    const sin = Math.sin(rotationRad) * echelle * scaleBase;
    const pixelX = position.x * largeurEcran;
    const pixelY = position.y * hauteurEcran;

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
        zIndex: 100,
      }}
      pointerEvents="none"
    >
      <Group>
        <Shadow dx={1} dy={2} blur={4} color="rgba(0, 0, 0, 0.35)" />
        <Atlas image={atlas.image} sprites={sprites} transforms={transforms} />
      </Group>
    </Canvas>
  );
}
