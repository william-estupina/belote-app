import type { Carte } from "@belote/shared-types";
import { useEffect } from "react";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { RATIO_ASPECT_CARTE, RATIO_LARGEUR_CARTE } from "../../constants/layout";
import { CarteSkia } from "./Carte";

export interface PositionCarte {
  x: number;
  y: number;
  rotation: number;
  echelle: number;
}

interface PropsCarteAnimee {
  carte: Carte;
  depart: PositionCarte;
  arrivee: PositionCarte;
  faceVisible: boolean;
  duree: number;
  largeurEcran: number;
  hauteurEcran: number;
  onTerminee?: () => void;
}

/**
 * Carte qui vole entre deux positions avec Reanimated.
 * Utilisée par la couche d'animation pour la distribution,
 * le jeu de carte et le ramassage du pli.
 */
export function CarteAnimee({
  carte,
  depart,
  arrivee,
  faceVisible,
  duree,
  largeurEcran,
  hauteurEcran,
  onTerminee,
}: PropsCarteAnimee) {
  const progres = useSharedValue(0);

  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

  useEffect(() => {
    progres.value = withTiming(
      1,
      { duration: duree, easing: Easing.out(Easing.cubic) },
      (termine) => {
        "worklet";
        if (termine && onTerminee) {
          runOnJS(onTerminee)();
        }
      },
    );
  }, [progres, duree, onTerminee]);

  const styleAnime = useAnimatedStyle(() => {
    const t = progres.value;
    const x = depart.x + (arrivee.x - depart.x) * t;
    const y = depart.y + (arrivee.y - depart.y) * t;
    const rotation = depart.rotation + (arrivee.rotation - depart.rotation) * t;
    const echelle = depart.echelle + (arrivee.echelle - depart.echelle) * t;

    return {
      position: "absolute" as const,
      left: x * largeurEcran - largeurCarte / 2,
      top: y * hauteurEcran - hauteurCarte / 2,
      transform: [{ rotate: `${rotation}deg` }, { scale: echelle }],
      zIndex: 100,
    };
  });

  return (
    <Animated.View style={styleAnime}>
      <CarteSkia
        carte={carte}
        largeur={largeurCarte}
        hauteur={hauteurCarte}
        faceVisible={faceVisible}
      />
    </Animated.View>
  );
}
