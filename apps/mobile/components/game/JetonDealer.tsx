import type { PositionJoueur } from "@belote/shared-types";
import {
  Blur,
  Canvas,
  Circle,
  Group,
  Path,
  RadialGradient,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import { memo, useEffect, useMemo, useRef } from "react";
import { Platform, StyleSheet, Text } from "react-native";
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

const estWeb = Platform.OS === "web";
const TAILLE_JETON = estWeb ? 36 : 32;
const TAILLE_TEXTE = estWeb ? 16 : 14;
// Marge pour que l'ombre et le blur ne soient pas clippés
const MARGE_OMBRE = 8;
const TAILLE_CANVAS = TAILLE_JETON + MARGE_OMBRE * 2;
const CENTRE = TAILLE_CANVAS / 2;
const RAYON = TAILLE_JETON / 2;
const OFFSET_Y = TAILLE_AVATAR / 2 + DECALAGE_NOM + 16;

// Nombre d'encoches sur le pourtour du jeton
const NB_ENCOCHES = 8;
const LARGEUR_ENCOCHE = 4;
const HAUTEUR_ENCOCHE = 2;

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
    left: coord.x * largeurEcran - TAILLE_CANVAS / 2,
    top: coord.y * hauteurEcran + OFFSET_Y - MARGE_OMBRE,
  };
}

function creerArcReflet(): string {
  const path = Skia.Path.Make();
  path.addArc(
    {
      x: CENTRE - RAYON + 3,
      y: CENTRE - RAYON + 3,
      width: (RAYON - 3) * 2,
      height: (RAYON - 3) * 2,
    },
    200,
    140,
  );
  return path.toSVGString();
}

function creerEncoches(): Array<{ x: number; y: number; rotation: number }> {
  const encoches: Array<{ x: number; y: number; rotation: number }> = [];
  for (let i = 0; i < NB_ENCOCHES; i++) {
    const angle = (i * 2 * Math.PI) / NB_ENCOCHES;
    encoches.push({
      x: CENTRE + Math.cos(angle) * (RAYON - 1),
      y: CENTRE + Math.sin(angle) * (RAYON - 1),
      rotation: angle,
    });
  }
  return encoches;
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

  const arcReflet = useMemo(() => creerArcReflet(), []);
  const encoches = useMemo(() => creerEncoches(), []);

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
  }, [pos.left, pos.top, animLeft, animTop]);

  const styleAnime = useAnimatedStyle(() => ({
    left: animLeft.value,
    top: animTop.value,
  }));

  return (
    <Animated.View testID="jeton-dealer" style={[styles.conteneur, styleAnime]}>
      <Canvas style={styles.canvas} pointerEvents="none">
        {/* Ombre au sol */}
        <Circle cx={CENTRE} cy={CENTRE + 2} r={RAYON} color="rgba(0,0,0,0.35)">
          <Blur blur={6} />
        </Circle>

        {/* Corps du jeton avec dégradé radial */}
        <Circle cx={CENTRE} cy={CENTRE} r={RAYON}>
          <RadialGradient
            c={vec(CENTRE - 2, CENTRE - 3)}
            r={RAYON}
            colors={["#f0c040", "#b8860b", "#9a7209"]}
            positions={[0, 0.7, 1]}
          />
        </Circle>

        {/* Anneau extérieur */}
        <Circle
          cx={CENTRE}
          cy={CENTRE}
          r={RAYON - 1}
          style="stroke"
          strokeWidth={1.5}
          color="#7a5a06"
        />

        {/* Reflet lumineux (arc supérieur) */}
        <Path
          path={arcReflet}
          style="stroke"
          strokeWidth={1.5}
          color="rgba(255,255,255,0.35)"
          strokeCap="round"
        />

        {/* Encoches décoratives */}
        <Group>
          {encoches.map((encoche, i) => {
            const encochePath = Skia.Path.Make();
            const demiLargeur = LARGEUR_ENCOCHE / 2;
            const demiHauteur = HAUTEUR_ENCOCHE / 2;
            const cos = Math.cos(encoche.rotation);
            const sin = Math.sin(encoche.rotation);
            // Rectangle orienté le long du rayon
            const dx1 = -demiLargeur * sin;
            const dy1 = demiLargeur * cos;
            const dx2 = demiHauteur * cos;
            const dy2 = demiHauteur * sin;
            encochePath.moveTo(encoche.x + dx1 - dx2, encoche.y + dy1 - dy2);
            encochePath.lineTo(encoche.x + dx1 + dx2, encoche.y + dy1 + dy2);
            encochePath.lineTo(encoche.x - dx1 + dx2, encoche.y - dy1 + dy2);
            encochePath.lineTo(encoche.x - dx1 - dx2, encoche.y - dy1 - dy2);
            encochePath.close();
            return <Path key={i} path={encochePath} color="rgba(255,255,255,0.3)" />;
          })}
        </Group>
      </Canvas>
      <Text style={styles.texte}>D</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  conteneur: {
    position: "absolute",
    width: TAILLE_CANVAS,
    height: TAILLE_CANVAS,
    zIndex: 13,
  },
  canvas: {
    width: TAILLE_CANVAS,
    height: TAILLE_CANVAS,
  },
  texte: {
    position: "absolute",
    top: MARGE_OMBRE,
    left: MARGE_OMBRE,
    width: TAILLE_JETON,
    height: TAILLE_JETON,
    textAlign: "center",
    lineHeight: TAILLE_JETON,
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: TAILLE_TEXTE,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
