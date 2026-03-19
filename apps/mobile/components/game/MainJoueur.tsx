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
  EVENTAIL,
  POSITIONS_MAINS,
  RATIO_ASPECT_CARTE,
  RATIO_LARGEUR_CARTE,
} from "../../constants/layout";
import { CarteSkia } from "./Carte";

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
  onCarteJouee?: (carte: Carte, position: PositionProportionnelle) => void;
}

/** Vérifie si une carte est dans la liste des cartes jouables */
function estJouable(carte: Carte, cartesJouables?: Carte[]): boolean {
  if (!cartesJouables) return true;
  return cartesJouables.some((c) => c.rang === carte.rang && c.couleur === carte.couleur);
}

const DUREE_ANIMATION_REORG = 350;
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
  xProp,
  yProp,
  zIndex,
  onCarteJouee,
}: PropsCarteEventail) {
  const estPremierRendu = useRef(true);

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
      // Animer l'entrée depuis le centre de la main vers la position en éventail
      animX.value = centreMainX;
      animBottom.value = centreMainBottom;
      animAngle.value = 0;
      animOpacite.value = 0;

      const config = { duration: DUREE_ANIMATION_REORG, easing: EASING_REORG };
      animX.value = withTiming(x, config);
      animBottom.value = withTiming(decalageY, config);
      animAngle.value = withTiming(angle, config);
      animOpacite.value = withTiming(1, { duration: 100 });
      return;
    }
    const config = { duration: DUREE_ANIMATION_REORG, easing: EASING_REORG };
    animX.value = withTiming(x, config);
    animBottom.value = withTiming(decalageY, config);
    animAngle.value = withTiming(angle, config);
  }, [x, decalageY, angle, animX, animBottom, animAngle, animOpacite, centreMainX]);

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
      {interactionActive && jouable && onCarteJouee ? (
        <Pressable
          onPress={() => onCarteJouee(carte, { x: xProp, y: yProp })}
          style={({ pressed }) => ({
            transform: pressed ? [{ translateY: -8 }] : [],
          })}
        >
          <CarteSkia
            carte={carte}
            largeur={largeurCarte}
            hauteur={hauteurCarte}
            faceVisible
          />
        </Pressable>
      ) : (
        <CarteSkia
          carte={carte}
          largeur={largeurCarte}
          hauteur={hauteurCarte}
          faceVisible
          grisee={grisee}
        />
      )}
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
  onCarteJouee,
}: PropsMainJoueur) {
  const nbCartes = cartes.length;
  if (nbCartes === 0) return null;

  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

  // Éventail : chaque carte tourne autour de sa base (bas-centre)
  const angleTotal = EVENTAIL.angleTotal;
  const arcMax = hauteurEcran * EVENTAIL.decalageArc;

  // Espacement horizontal
  const espacement = largeurCarte * (1 - EVENTAIL.chevauchement);
  const largeurMain = espacement * (nbCartes - 1) + largeurCarte;
  const xDepart = (largeurEcran - largeurMain) / 2;

  // Hauteur du conteneur : carte + arc + marge pour rotation
  const hauteurConteneur = hauteurCarte + arcMax + largeurCarte * 0.2;

  return (
    <View
      style={{
        position: "absolute",
        bottom: -hauteurCarte * 0.15,
        left: 0,
        right: 0,
        height: hauteurConteneur,
        overflow: "visible",
      }}
    >
      {cartes.map((carte, index) => {
        // Progression normalisée de -1 (gauche) à +1 (droite)
        const t = nbCartes > 1 ? (index / (nbCartes - 1)) * 2 - 1 : 0;

        // Angle de rotation : linéaire de -angleTotal/2 à +angleTotal/2
        const angle = (t * angleTotal) / 2;

        // Arc parabolique : les cartes du centre montent, celles des bords descendent
        const decalageY = arcMax * (1 - t * t);

        const x = xDepart + espacement * index;

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
            hauteurConteneur={hauteurConteneur}
            jouable={jouable}
            grisee={grisee}
            interactionActive={interactionActive}
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
