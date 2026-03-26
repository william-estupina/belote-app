import type { Carte } from "@belote/shared-types";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { ANIMATIONS_CARTE_RETOURNEE } from "../../constants/animations-visuelles";
import {
  ANIMATIONS,
  RATIO_ASPECT_CARTE,
  RATIO_LARGEUR_CARTE,
} from "../../constants/layout";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { CarteDos, CarteFaceAtlas } from "./Carte";

interface PropsReserveCentrale {
  afficherPaquet: boolean;
  cartesPaquetVisibles: number;
  carteRetournee: Carte | null;
  largeurEcran: number;
  hauteurEcran: number;
  atlas: AtlasCartes;
}

export function ReserveCentrale({
  afficherPaquet,
  cartesPaquetVisibles,
  carteRetournee,
  largeurEcran,
  hauteurEcran,
  atlas,
}: PropsReserveCentrale) {
  const afficherCarteRetournee = carteRetournee !== null;

  if (!afficherPaquet && !afficherCarteRetournee) {
    return null;
  }

  const largeurCarte = largeurEcran * RATIO_LARGEUR_CARTE * 0.85;
  const hauteurCarte = largeurCarte * RATIO_ASPECT_CARTE;
  const espacement = afficherCarteRetournee ? 6 : 0;
  const largeurTotale = largeurCarte * (afficherCarteRetournee ? 2 : 1) + espacement;
  const nbCouches = Math.min(5, Math.ceil(Math.max(cartesPaquetVisibles, 1) / 6));

  const progressionFlip = useSharedValue(afficherCarteRetournee ? 0 : 1);

  useEffect(() => {
    if (!afficherCarteRetournee) {
      progressionFlip.value = 1;
      return;
    }

    progressionFlip.value = 0;
    progressionFlip.value = withDelay(
      ANIMATIONS_CARTE_RETOURNEE.delaiFlip,
      withTiming(1, {
        duration: ANIMATIONS_CARTE_RETOURNEE.dureeFlip,
        easing: Easing.inOut(Easing.ease),
      }),
    );
  }, [afficherCarteRetournee, progressionFlip, carteRetournee]);

  const styleDosCarteRetournee = useAnimatedStyle(() => {
    const rotationY = interpolate(progressionFlip.value, [0, 0.5, 1], [0, 90, 90]);
    return {
      transform: [{ perspective: 800 }, { rotateY: `${rotationY}deg` }],
      opacity: progressionFlip.value < 0.5 ? 1 : 0,
      backfaceVisibility: "hidden" as const,
    };
  });

  const styleFaceCarteRetournee = useAnimatedStyle(() => {
    const rotationY = interpolate(progressionFlip.value, [0, 0.5, 1], [-90, -90, 0]);
    return {
      transform: [{ perspective: 800 }, { rotateY: `${rotationY}deg` }],
      opacity: progressionFlip.value >= 0.5 ? 1 : 0,
      backfaceVisibility: "hidden" as const,
    };
  });

  return (
    <View
      testID="reserve-centrale"
      style={[
        styles.conteneur,
        {
          left: largeurEcran * 0.5 - largeurTotale / 2,
          top: hauteurEcran * ANIMATIONS.distribution.originY - hauteurCarte / 2,
          width: largeurTotale,
          height: hauteurCarte,
        },
      ]}
      pointerEvents="none"
    >
      {afficherPaquet && (
        <View testID="reserve-paquet" style={styles.paquet}>
          {Array.from({ length: nbCouches }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.carteEmpilee,
                {
                  left: index * 0.5,
                  top: -index,
                },
              ]}
            >
              <CarteDos largeur={largeurCarte} hauteur={hauteurCarte} />
            </View>
          ))}
        </View>
      )}

      {afficherCarteRetournee && carteRetournee && (
        <View
          testID="reserve-carte-retournee"
          style={[
            styles.carteRetournee,
            {
              marginLeft: espacement,
              width: largeurCarte,
              height: hauteurCarte,
            },
          ]}
        >
          <Animated.View style={[styles.faceCarteRetournee, styleDosCarteRetournee]}>
            <CarteDos largeur={largeurCarte} hauteur={hauteurCarte} />
          </Animated.View>
          <Animated.View style={[styles.faceCarteRetournee, styleFaceCarteRetournee]}>
            <CarteFaceAtlas
              atlas={atlas}
              carte={carteRetournee}
              largeur={largeurCarte}
              hauteur={hauteurCarte}
            />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    zIndex: 30,
  },
  paquet: {
    position: "relative",
  },
  carteEmpilee: {
    position: "absolute",
  },
  carteRetournee: {
    position: "relative",
  },
  faceCarteRetournee: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
