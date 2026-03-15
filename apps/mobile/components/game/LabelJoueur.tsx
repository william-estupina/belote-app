import type { PositionJoueur } from "@belote/shared-types";
import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";

import { COULEURS } from "../../constants/theme";

interface PropsLabelJoueur {
  position: PositionJoueur;
  largeurEcran: number;
  hauteurEcran: number;
  /** Si true, affiche une bulle "..." indiquant que c'est le tour de ce joueur */
  estActif?: boolean;
}

// Positions des bulles pour chaque joueur
const COORDS: Record<
  PositionJoueur,
  { x: number; y: number; align: "center" | "left" | "right" }
> = {
  sud: { x: 0.5, y: 0.78, align: "center" },
  nord: { x: 0.5, y: 0.15, align: "center" },
  ouest: { x: 0.08, y: 0.55, align: "left" },
  est: { x: 0.92, y: 0.55, align: "right" },
};

const estWeb = Platform.OS === "web";

export function LabelJoueur({
  position,
  largeurEcran,
  hauteurEcran,
  estActif = false,
}: PropsLabelJoueur) {
  const coord = COORDS[position];
  const opacitePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (estActif) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacitePulse, {
            toValue: 0.3,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacitePulse, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    } else {
      opacitePulse.setValue(1);
    }
  }, [estActif, opacitePulse]);

  // N'afficher que pour les bots (pas le joueur humain sud)
  if (!estActif || position === "sud") return null;

  const alignStyle =
    coord.align === "center"
      ? { left: coord.x * largeurEcran, transform: [{ translateX: -16 }] }
      : coord.align === "left"
        ? { left: coord.x * largeurEcran }
        : { right: (1 - coord.x) * largeurEcran };

  return (
    <View
      style={[styles.conteneur, { top: coord.y * hauteurEcran }, alignStyle]}
      pointerEvents="none"
    >
      <Animated.View style={[styles.bulle, { opacity: opacitePulse }]}>
        <Text style={styles.points}>...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    position: "absolute",
    zIndex: 11,
  },
  bulle: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: estWeb ? 10 : 8,
    paddingVertical: estWeb ? 2 : 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  points: {
    color: COULEURS.texteSecondaire,
    fontSize: estWeb ? 16 : 14,
    fontWeight: "bold",
    letterSpacing: 2,
  },
});
