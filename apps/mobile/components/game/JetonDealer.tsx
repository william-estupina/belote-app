import type { PositionJoueur } from "@belote/shared-types";
import { memo, useEffect, useRef } from "react";
import { Platform, StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { DECALAGE_NOM, POSITIONS_AVATAR, TAILLE_AVATAR } from "../../constants/layout";

const estWeb = Platform.OS === "web";
const TAILLE_JETON = estWeb ? 28 : 24;
const TAILLE_TEXTE = estWeb ? 14 : 12;
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

    const config = { duration: 500, easing: Easing.inOut(Easing.ease) };
    animLeft.value = withTiming(pos.left, config);
    animTop.value = withTiming(pos.top, config);
  }, [pos.left, pos.top, animLeft, animTop]);

  const styleAnime = useAnimatedStyle(() => ({
    left: animLeft.value,
    top: animTop.value,
  }));

  return (
    <Animated.View testID="jeton-dealer" style={[styles.jeton, styleAnime]}>
      <Text style={styles.texte}>D</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  jeton: {
    position: "absolute",
    width: TAILLE_JETON,
    height: TAILLE_JETON,
    borderRadius: TAILLE_JETON / 2,
    backgroundColor: "#d4a017",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.22)",
    shadowColor: "rgba(0,0,0,0.3)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 13,
  },
  texte: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: TAILLE_TEXTE,
  },
});
