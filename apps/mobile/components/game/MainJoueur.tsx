import type { Carte } from "@belote/shared-types";
import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  ANIMATIONS,
  POSITIONS_MAINS,
  RATIO_ASPECT_CARTE,
  RATIO_LARGEUR_CARTE,
} from "../../constants/layout";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { CarteFaceAtlas } from "./Carte";
import {
  calculerDispositionMainJoueur,
  type ModeDispositionMainJoueur,
} from "./mainJoueurDisposition";

/** Position proportionnelle (0–1) d'une carte sur l'écran */
export interface PositionProportionnelle {
  x: number;
  y: number;
}

interface PropsMainJoueur {
  cartes: Carte[];
  largeurEcran: number;
  hauteurEcran: number;
  cartesJouables?: Carte[];
  interactionActive?: boolean;
  animerNouvellesCartes?: boolean;
  modeDisposition?: ModeDispositionMainJoueur;
  nbCartesDisposition?: number;
  atlas: AtlasCartes;
  onCarteJouee?: (carte: Carte, position: PositionProportionnelle) => void;
}

/** Vérifie si une carte est dans la liste des cartes jouables */
function estJouable(carte: Carte, cartesJouables?: Carte[]): boolean {
  if (!cartesJouables) return true;
  return cartesJouables.some((c) => c.rang === carte.rang && c.couleur === carte.couleur);
}

const EASING_REORG = Easing.inOut(Easing.cubic);

// --- Sous-composant animé pour une carte dans l'éventail ---

interface PropsCarteEventail {
  carte: Carte;
  x: number;
  decalageY: number;
  angle: number;
  largeurCarte: number;
  hauteurCarte: number;
  largeurEcran: number;
  hauteurConteneur: number;
  jouable: boolean;
  grisee: boolean;
  interactionActive: boolean;
  animerEntree: boolean;
  atlas: AtlasCartes;
  xProp: number;
  yProp: number;
  zIndex: number;
  onCarteJouee?: (carte: Carte, position: PositionProportionnelle) => void;
}

function CarteEventailAnimee({
  carte,
  x,
  decalageY,
  angle,
  largeurCarte,
  hauteurCarte,
  largeurEcran,
  hauteurConteneur,
  jouable,
  grisee,
  interactionActive,
  animerEntree,
  atlas,
  xProp,
  yProp,
  zIndex,
  onCarteJouee,
}: PropsCarteEventail) {
  const estPremierRendu = useRef(true);
  const estInteractive = interactionActive && jouable && !!onCarteJouee;

  // Position d'entrée : centre de la main (là où les cartes animées atterrissent)
  const centreMainX = largeurEcran * POSITIONS_MAINS.sud.x - largeurCarte / 2;
  const centreMainBottom = 0;

  const animX = useSharedValue(x);
  const animBottom = useSharedValue(decalageY);
  const animAngle = useSharedValue(angle);
  const animOpacite = useSharedValue(1);

  useEffect(() => {
    if (estPremierRendu.current) {
      estPremierRendu.current = false;
      if (!animerEntree) {
        animX.value = x;
        animBottom.value = decalageY;
        animAngle.value = angle;
        animOpacite.value = 1;
        return;
      }

      // Animer l'entrée depuis le centre de la main vers la position en éventail
      animX.value = centreMainX;
      animBottom.value = centreMainBottom;
      animAngle.value = 0;
      animOpacite.value = 0;

      const config = {
        duration: ANIMATIONS.distribution.dureeReorganisationMain,
        easing: EASING_REORG,
      };
      animX.value = withTiming(x, config);
      animBottom.value = withTiming(decalageY, config);
      animAngle.value = withTiming(angle, config);
      animOpacite.value = withTiming(1, { duration: 100 });
      return;
    }
    const config = {
      duration: ANIMATIONS.distribution.dureeReorganisationMain,
      easing: EASING_REORG,
    };
    animX.value = withTiming(x, config);
    animBottom.value = withTiming(decalageY, config);
    animAngle.value = withTiming(angle, config);
  }, [
    x,
    decalageY,
    angle,
    animerEntree,
    animX,
    animBottom,
    animAngle,
    animOpacite,
    centreMainX,
  ]);

  const styleAnime = useAnimatedStyle(() => ({
    position: "absolute" as const,
    left: animX.value,
    bottom: animBottom.value,
    opacity: animOpacite.value,
    transformOrigin: `${largeurCarte / 2}px ${hauteurCarte}px`,
    transform: [{ rotate: `${animAngle.value}deg` }],
    zIndex,
  }));

  return (
    <Animated.View style={styleAnime}>
      <Pressable
        disabled={!estInteractive}
        onPress={() => onCarteJouee?.(carte, { x: xProp, y: yProp })}
        style={({ pressed }) => ({
          transform: pressed && estInteractive ? [{ translateY: -8 }] : [],
        })}
      >
        <CarteFaceAtlas
          atlas={atlas}
          carte={carte}
          largeur={largeurCarte}
          hauteur={hauteurCarte}
        />
      </Pressable>
    </Animated.View>
  );
}

// --- Composant principal ---

export function MainJoueur({
  cartes,
  largeurEcran,
  hauteurEcran,
  cartesJouables,
  interactionActive = false,
  animerNouvellesCartes = true,
  modeDisposition = "eventail",
  nbCartesDisposition,
  atlas,
  onCarteJouee,
}: PropsMainJoueur) {
  const nbCartes = cartes.length;
  if (nbCartes === 0) return null;
  const nbCartesPourDisposition = Math.max(nbCartes, nbCartesDisposition ?? nbCartes);

  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

  const disposition = calculerDispositionMainJoueur({
    mode: modeDisposition,
    nbCartes: nbCartesPourDisposition,
    largeurEcran,
    hauteurEcran,
    largeurCarte,
    hauteurCarte,
  });

  return (
    <View
      style={{
        position: "absolute",
        bottom: -hauteurCarte * 0.15,
        left: 0,
        right: 0,
        height: disposition.hauteurConteneur,
        overflow: "visible",
      }}
    >
      {cartes.map((carte, index) => {
        const carteDisposition = disposition.cartes[index];
        const x = carteDisposition.x;
        const angle = carteDisposition.angle;
        const decalageY = carteDisposition.decalageY;

        const jouable = estJouable(carte, cartesJouables);
        const grisee = interactionActive && !jouable;

        // Position proportionnelle du centre de la carte sur l'écran
        const xProp = (x + largeurCarte / 2) / largeurEcran;
        // Le conteneur a bottom: -hauteurCarte * 0.15, la carte a bottom: decalageY dans le conteneur
        const yProp =
          1 - (decalageY + hauteurCarte / 2 - hauteurCarte * 0.15) / hauteurEcran;

        return (
          <CarteEventailAnimee
            key={`${carte.couleur}-${carte.rang}`}
            carte={carte}
            x={x}
            decalageY={decalageY}
            angle={angle}
            largeurCarte={largeurCarte}
            hauteurCarte={hauteurCarte}
            largeurEcran={largeurEcran}
            hauteurConteneur={disposition.hauteurConteneur}
            jouable={jouable}
            grisee={grisee}
            interactionActive={interactionActive}
            animerEntree={animerNouvellesCartes}
            atlas={atlas}
            xProp={xProp}
            yProp={yProp}
            zIndex={index}
            onCarteJouee={onCarteJouee}
          />
        );
      })}
    </View>
  );
}
