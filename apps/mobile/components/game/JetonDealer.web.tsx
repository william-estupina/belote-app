import type { PositionJoueur } from "@belote/shared-types";
import { memo, useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  ANIMATIONS,
  DECALAGE_NOM,
  POSITIONS_AVATAR,
  TAILLE_AVATAR,
} from "../../constants/layout";

const TAILLE_JETON = 36;
const OFFSET_Y = TAILLE_AVATAR / 2 + DECALAGE_NOM + 16;

interface PropsJetonDealer {
  positionDonneur: PositionJoueur;
  largeurEcran: number;
  hauteurEcran: number;
}

function calculerPosition(
  positionDonneur: PositionJoueur,
  largeurEcran: number,
  hauteurEcran: number,
) {
  const coord = POSITIONS_AVATAR[positionDonneur];
  return {
    left: coord.x * largeurEcran - TAILLE_JETON / 2,
    top: coord.y * hauteurEcran + OFFSET_Y,
  };
}

export const JetonDealer = memo(function JetonDealer({
  positionDonneur,
  largeurEcran,
  hauteurEcran,
}: PropsJetonDealer) {
  const pos = calculerPosition(positionDonneur, largeurEcran, hauteurEcran);
  const estPremierRendu = useRef(true);
  const animLeft = useSharedValue(pos.left);
  const animTop = useSharedValue(pos.top);

  useEffect(() => {
    if (estPremierRendu.current) {
      estPremierRendu.current = false;
      animLeft.value = pos.left;
      animTop.value = pos.top;
      return;
    }

    const config = {
      duration: ANIMATIONS.redistribution.dureeGlissementDealer,
      easing: Easing.inOut(Easing.ease),
    };

    animLeft.value = withTiming(pos.left, config);
    animTop.value = withTiming(pos.top, config);
  }, [animLeft, animTop, pos.left, pos.top]);

  const styleAnime = useAnimatedStyle(() => ({
    left: animLeft.value,
    top: animTop.value,
  }));

  return (
    <Animated.View testID="jeton-dealer" style={[styles.conteneur, styleAnime]}>
      <View style={styles.jeton}>
        <View style={styles.reflet} />
        <Text style={styles.texte}>D</Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  conteneur: {
    position: "absolute",
    width: TAILLE_JETON,
    height: TAILLE_JETON,
    zIndex: 13,
  },
  jeton: {
    width: TAILLE_JETON,
    height: TAILLE_JETON,
    borderRadius: TAILLE_JETON / 2,
    backgroundColor: "#b8860b",
    borderWidth: 2,
    borderColor: "#7a5a06",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  reflet: {
    position: "absolute",
    top: 5,
    left: 8,
    width: 14,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
    transform: [{ rotate: "-20deg" }],
  },
  texte: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
