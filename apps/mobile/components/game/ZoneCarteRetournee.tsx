// Affiche le paquet (dos) et la carte retournee au centre du plateau pendant les encheres
// Animation flip : la carte retournee demarre dos visible et se retourne face visible
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

interface PropsZoneCarteRetournee {
  carte: Carte;
  largeurEcran: number;
  hauteurEcran: number;
  atlas: AtlasCartes;
}

export function ZoneCarteRetournee({
  carte,
  largeurEcran,
  hauteurEcran,
  atlas,
}: PropsZoneCarteRetournee) {
  // Carte plus petite que l'ancienne version
  const largeurCarte = largeurEcran * RATIO_LARGEUR_CARTE * 0.85;
  const hauteurCarte = largeurCarte * RATIO_ASPECT_CARTE;
  const espacement = 6;

  // Largeur totale : paquet + espacement + carte retournee
  const largeurTotale = largeurCarte * 2 + espacement;

  // Animation flip : 0 = dos visible, 1 = face visible
  const progressionFlip = useSharedValue(0);

  useEffect(() => {
    progressionFlip.value = 0;
    progressionFlip.value = withDelay(
      ANIMATIONS_CARTE_RETOURNEE.delaiFlip,
      withTiming(1, {
        duration: ANIMATIONS_CARTE_RETOURNEE.dureeFlip,
        easing: Easing.inOut(Easing.ease),
      }),
    );
  }, [progressionFlip]);

  // Style dos : visible de 0 degres a 90 degres, puis masque
  const styleDos = useAnimatedStyle(() => {
    const rotationY = interpolate(progressionFlip.value, [0, 0.5, 1], [0, 90, 90]);
    return {
      transform: [{ perspective: 800 }, { rotateY: `${rotationY}deg` }],
      opacity: progressionFlip.value < 0.5 ? 1 : 0,
      backfaceVisibility: "hidden" as const,
    };
  });

  // Style face : masquee de -90 degres a 0 degre, apparait a partir de 0.5
  const styleFace = useAnimatedStyle(() => {
    const rotationY = interpolate(progressionFlip.value, [0, 0.5, 1], [-90, -90, 0]);
    return {
      transform: [{ perspective: 800 }, { rotateY: `${rotationY}deg` }],
      opacity: progressionFlip.value >= 0.5 ? 1 : 0,
      backfaceVisibility: "hidden" as const,
    };
  });

  return (
    <View
      style={[
        styles.conteneur,
        {
          left: largeurEcran * 0.5 - largeurTotale / 2,
          top: hauteurEcran * ANIMATIONS.distribution.originY - hauteurCarte / 2,
        },
      ]}
    >
      {/* Paquet (dos de carte) avec leger effet d'empilement */}
      <View style={styles.paquet}>
        {/* Cartes empilees pour donner l'illusion d'epaisseur */}
        <View style={[styles.carteEmpilee, { top: -2, left: -1 }]}>
          <CarteDos largeur={largeurCarte} hauteur={hauteurCarte} />
        </View>
        <View style={[styles.carteEmpilee, { top: -1, left: 0 }]}>
          <CarteDos largeur={largeurCarte} hauteur={hauteurCarte} />
        </View>
        <CarteDos largeur={largeurCarte} hauteur={hauteurCarte} />
      </View>

      {/* Carte retournee avec animation flip */}
      <View
        style={[
          styles.carteFlipConteneur,
          { marginLeft: espacement, width: largeurCarte, height: hauteurCarte },
        ]}
      >
        {/* Dos (visible au debut, disparait a 50%) */}
        <Animated.View style={[styles.carteFlipFace, styleDos]}>
          <CarteDos largeur={largeurCarte} hauteur={hauteurCarte} />
        </Animated.View>
        {/* Face (apparait a 50%, finit a 0 degre rotation) */}
        <Animated.View style={[styles.carteFlipFace, styleFace]}>
          <CarteFaceAtlas
            atlas={atlas}
            carte={carte}
            largeur={largeurCarte}
            hauteur={hauteurCarte}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    zIndex: 15,
  },
  paquet: {
    position: "relative",
  },
  carteEmpilee: {
    position: "absolute",
  },
  carteFlipConteneur: {
    position: "relative",
  },
  carteFlipFace: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
