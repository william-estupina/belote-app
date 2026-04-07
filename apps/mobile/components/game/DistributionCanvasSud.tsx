import { memo } from "react";
import type { SharedValue } from "react-native-reanimated";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { RATIO_ASPECT_CARTE, RATIO_LARGEUR_CARTE } from "../../constants/layout";
import { interpolerBezierQuadratique } from "../../hooks/distributionAtlas";
import type { CarteAtlas } from "../../hooks/useAnimationsDistribution";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { CarteFaceAtlas } from "./Carte";

const STRIDE = 10;

interface PropsCarteSudAnimee {
  index: number;
  carteAtlas: CarteAtlas;
  progression: SharedValue<number>;
  donneesWorklet: SharedValue<number[]>;
  nbCartesActives: SharedValue<number>;
  zIndexSv: SharedValue<number>;
  largeurCarte: number;
  hauteurCarte: number;
  largeurEcran: number;
  hauteurEcran: number;
  atlas: AtlasCartes;
}

function CarteSudAnimee({
  index,
  carteAtlas,
  progression,
  donneesWorklet,
  nbCartesActives,
  zIndexSv,
  largeurCarte,
  hauteurCarte,
  largeurEcran,
  hauteurEcran,
  atlas,
}: PropsCarteSudAnimee) {
  const style = useAnimatedStyle(() => {
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

    const t = progression.value;
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

    const donnees = donneesWorklet.value;
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

    const pos = interpolerBezierQuadratique(
      { x: departX, y: departY },
      { x: controleX, y: controleY },
      { x: arriveeX, y: arriveeY },
      t,
    );

    const rotation = rotDepart + (rotArrivee - rotDepart) * t;
    const echelle = echDepart + (echArrivee - echDepart) * t;

    return {
      position: "absolute" as const,
      left: pos.x * largeurEcran - largeurCarte / 2,
      top: pos.y * hauteurEcran - hauteurCarte,
      width: largeurCarte,
      height: hauteurCarte,
      opacity: 1,
      transformOrigin: `${largeurCarte / 2}px ${hauteurCarte}px`,
      transform: [{ rotate: `${rotation}deg` }, { scale: echelle }],
      zIndex: 100 + zIndexSv.value,
    };
  });

  return (
    <Animated.View style={style} pointerEvents="none">
      <CarteFaceAtlas
        atlas={atlas}
        carte={carteAtlas.carte}
        largeur={largeurCarte}
        hauteur={hauteurCarte}
      />
    </Animated.View>
  );
}

const CarteSudAnimeeMemo = memo(CarteSudAnimee);

interface PropsDistributionCanvasSud {
  atlas: AtlasCartes;
  cartesAtlas: CarteAtlas[];
  progressions: SharedValue<number>[];
  donneesWorklet: SharedValue<number[]>;
  nbCartesActives: SharedValue<number>;
  zIndexes: SharedValue<number>[];
  largeurEcran: number;
  hauteurEcran: number;
}

/**
 * Composant éphémère qui dessine les cartes sud en vol pendant la distribution.
 * Se démonte quand la distribution est terminée.
 */
export function DistributionCanvasSud({
  atlas,
  cartesAtlas,
  progressions,
  donneesWorklet,
  nbCartesActives,
  zIndexes,
  largeurEcran,
  hauteurEcran,
}: PropsDistributionCanvasSud) {
  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

  if (cartesAtlas.length === 0) return null;

  return (
    <>
      {cartesAtlas.map((carteAtlas, i) => (
        <CarteSudAnimeeMemo
          key={i}
          index={i}
          carteAtlas={carteAtlas}
          progression={progressions[i]}
          donneesWorklet={donneesWorklet}
          nbCartesActives={nbCartesActives}
          zIndexSv={zIndexes[i]}
          largeurCarte={largeurCarte}
          hauteurCarte={hauteurCarte}
          largeurEcran={largeurEcran}
          hauteurEcran={hauteurEcran}
          atlas={atlas}
        />
      ))}
    </>
  );
}
