import { memo } from "react";
import type { SharedValue } from "react-native-reanimated";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { RATIO_ASPECT_CARTE, RATIO_LARGEUR_CARTE } from "../../constants/layout";
import { interpolerBezierQuadratique } from "../../hooks/distributionAtlas";
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
    const echelle = echDepart + (echArrivee - echDepart) * t;

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
    nbCartesAdversaires: _nbCartesAdversaires,
    cartesAtlasAdversaires,
    progressions,
    donneesWorklet,
    nbCartesActives,
    distributionEnCours: _distributionEnCours,
  }: PropsCanvasAdversaires) {
    const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
    const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

    if (cartesAtlasAdversaires.length === 0) {
      return null;
    }

    return (
      <>
        {cartesAtlasAdversaires.map((carteAtlas, index) => (
          <CarteAdverseAnimee
            key={`${carteAtlas.joueur}-${index}`}
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
    next.distributionEnCours &&
    prev.distributionEnCours &&
    prev.largeurEcran === next.largeurEcran &&
    prev.hauteurEcran === next.hauteurEcran &&
    prev.cartesAtlasAdversaires === next.cartesAtlasAdversaires &&
    prev.progressions === next.progressions &&
    prev.donneesWorklet === next.donneesWorklet &&
    prev.nbCartesActives === next.nbCartesActives,
);
