import { memo, useEffect } from "react";
import type { SharedValue } from "react-native-reanimated";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { ADVERSAIRE, RATIO_ASPECT_CARTE } from "../../constants/layout";
import { interpolerBezierQuadratique } from "../../hooks/distributionAtlas";
import {
  calculerCiblesEventailAdversaire,
  ECHELLE_MAIN_ADVERSE,
} from "../../hooks/distributionLayoutAtlas";
import type { CarteAtlas } from "../../hooks/useAnimationsDistribution";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { CarteDos } from "./Carte";

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

interface PropsCarteAdverseAnimee {
  index: number;
  largeurCarte: number;
  hauteurCarte: number;
  largeurEcran: number;
  hauteurEcran: number;
  progressions: SharedValue<number>[];
  donneesWorklet: SharedValue<number[]>;
  nbCartesActives: SharedValue<number>;
}

const STRIDE = 10;
const MAX_ADVERSAIRES = 24;

function CarteAdverseAnimee({
  index,
  largeurCarte,
  hauteurCarte,
  largeurEcran,
  hauteurEcran,
  progressions,
  donneesWorklet,
  nbCartesActives,
}: PropsCarteAdverseAnimee) {
  const styleCarte = useAnimatedStyle(() => {
    const donnees = donneesWorklet.value;
    const nbActives = nbCartesActives.value;

    if (index >= nbActives) {
      return {
        position: "absolute" as const,
        left: -10000,
        top: -10000,
        width: largeurCarte,
        height: hauteurCarte,
        opacity: 0,
      };
    }

    const t = progressions[index].value;
    if (t < 0 || t > 1) {
      return {
        position: "absolute" as const,
        left: -10000,
        top: -10000,
        width: largeurCarte,
        height: hauteurCarte,
        opacity: 0,
      };
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
    const echelleBrute = echDepart + (echArrivee - echDepart) * t;
    const echelle =
      ECHELLE_MAIN_ADVERSE > 0 ? echelleBrute / ECHELLE_MAIN_ADVERSE : echelleBrute;

    return {
      position: "absolute" as const,
      left: position.x * largeurEcran - largeurCarte / 2,
      top: position.y * hauteurEcran - hauteurCarte / 2,
      width: largeurCarte,
      height: hauteurCarte,
      opacity: 1,
      transform: [{ rotate: `${rotation}deg` }, { scale: echelle }],
      zIndex: index + 1,
    };
  });

  return (
    <Animated.View
      testID={`carte-adversaire-${index}`}
      style={styleCarte}
      pointerEvents="none"
    >
      <CarteDos largeur={largeurCarte} hauteur={hauteurCarte} />
    </Animated.View>
  );
}

export const CanvasAdversaires = memo(
  function CanvasAdversaires({
    atlas: _atlas,
    largeurEcran,
    hauteurEcran,
    nbCartesAdversaires,
    cartesAtlasAdversaires,
    progressions,
    donneesWorklet,
    nbCartesActives,
    distributionEnCours,
  }: PropsCanvasAdversaires) {
    const largeurCarte = Math.round(largeurEcran * ADVERSAIRE.ratioLargeurCarte);
    const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);
    const totalCartesVisibles =
      nbCartesAdversaires.nord + nbCartesAdversaires.est + nbCartesAdversaires.ouest;

    useEffect(() => {
      if (distributionEnCours) {
        return;
      }

      if (totalCartesVisibles === 0) {
        nbCartesActives.value = 0;
        return;
      }

      const donnees = new Array(MAX_ADVERSAIRES * STRIDE).fill(0);
      let index = 0;
      const positions: Array<{ position: "nord" | "ouest" | "est"; nb: number }> = [
        { position: "nord", nb: nbCartesAdversaires.nord },
        { position: "ouest", nb: nbCartesAdversaires.ouest },
        { position: "est", nb: nbCartesAdversaires.est },
      ];

      for (const { position, nb } of positions) {
        if (nb === 0) {
          continue;
        }

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
          donnees[offset] = cible.arrivee.x;
          donnees[offset + 1] = cible.arrivee.y;
          donnees[offset + 2] = cible.arrivee.x;
          donnees[offset + 3] = cible.arrivee.y;
          donnees[offset + 4] = cible.arrivee.x;
          donnees[offset + 5] = cible.arrivee.y;
          donnees[offset + 6] = cible.rotationArrivee;
          donnees[offset + 7] = cible.rotationArrivee;
          donnees[offset + 8] = ECHELLE_MAIN_ADVERSE;
          donnees[offset + 9] = ECHELLE_MAIN_ADVERSE;
          progressions[index].value = 1;
          index += 1;
        }
      }

      for (let i = index; i < MAX_ADVERSAIRES; i += 1) {
        progressions[i].value = -1;
      }

      donneesWorklet.value = donnees;
      nbCartesActives.value = index;
    }, [
      distributionEnCours,
      totalCartesVisibles,
      nbCartesAdversaires,
      largeurEcran,
      hauteurEcran,
      progressions,
      donneesWorklet,
      nbCartesActives,
    ]);

    if (
      !distributionEnCours &&
      totalCartesVisibles === 0 &&
      cartesAtlasAdversaires.length === 0
    ) {
      return null;
    }

    return (
      <>
        {Array.from({ length: MAX_ADVERSAIRES }, (_, index) => (
          <CarteAdverseAnimee
            key={index}
            index={index}
            largeurCarte={largeurCarte}
            hauteurCarte={hauteurCarte}
            largeurEcran={largeurEcran}
            hauteurEcran={hauteurEcran}
            progressions={progressions}
            donneesWorklet={donneesWorklet}
            nbCartesActives={nbCartesActives}
          />
        ))}
      </>
    );
  },
  (prev, next) =>
    prev.largeurEcran === next.largeurEcran &&
    prev.hauteurEcran === next.hauteurEcran &&
    prev.distributionEnCours === next.distributionEnCours &&
    prev.nbCartesAdversaires.nord === next.nbCartesAdversaires.nord &&
    prev.nbCartesAdversaires.est === next.nbCartesAdversaires.est &&
    prev.nbCartesAdversaires.ouest === next.nbCartesAdversaires.ouest &&
    prev.cartesAtlasAdversaires === next.cartesAtlasAdversaires &&
    prev.progressions === next.progressions &&
    prev.donneesWorklet === next.donneesWorklet &&
    prev.nbCartesActives === next.nbCartesActives,
);
