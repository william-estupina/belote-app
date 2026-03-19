import type { Carte } from "@belote/shared-types";
import { useEffect } from "react";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ANIMATIONS, RATIO_ASPECT_CARTE, RATIO_LARGEUR_CARTE } from "../../constants/layout";
import {
  calculerPointArc,
  interpolerBezierQuadratique,
} from "../../hooks/distributionAtlas";
import { CarteDos, CarteFace, CarteSkia } from "./Carte";

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
  /** rotateY départ en degrés (0 = dos, 180 = face). Absent = pas de flip. */
  flipDe?: number;
  /** rotateY arrivée en degrés */
  flipVers?: number;
  /** Profil d'easing. Défaut: 'out-cubic' */
  easing?: "out-cubic" | "inout-cubic";
}

const EASINGS = {
  "out-cubic": Easing.out(Easing.cubic),
  "inout-cubic": Easing.inOut(Easing.cubic),
};

/**
 * Carte qui vole entre deux positions avec Reanimated.
 * Supporte optionnellement un flip 3D (rotateY) via deux couches
 * dos/face avec backfaceVisibility: 'hidden'.
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
  flipDe,
  flipVers,
  easing = "out-cubic",
}: PropsCarteAnimee) {
  const progres = useSharedValue(0);
  const aFlip = flipDe !== undefined && flipVers !== undefined;

  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);
  const pointControle = calculerPointArc(
    { x: depart.x, y: depart.y },
    { x: arrivee.x, y: arrivee.y },
    ANIMATIONS.distribution.arcDistribution.decalagePerpendiculaire,
  );

  useEffect(() => {
    progres.value = withTiming(
      1,
      { duration: duree, easing: EASINGS[easing] },
      (termine) => {
        "worklet";
        if (termine && onTerminee) {
          runOnJS(onTerminee)();
        }
      },
    );
  }, [progres, duree, onTerminee, easing]);

  // Style du conteneur (position + rotation Z + scale)
  const styleConteneur = useAnimatedStyle(() => {
    const t = progres.value;
    const position = interpolerBezierQuadratique(
      { x: depart.x, y: depart.y },
      pointControle,
      { x: arrivee.x, y: arrivee.y },
      t,
    );
    const rotation = depart.rotation + (arrivee.rotation - depart.rotation) * t;
    const echelle = depart.echelle + (arrivee.echelle - depart.echelle) * t;

    return {
      position: "absolute" as const,
      left: position.x * largeurEcran - largeurCarte / 2,
      top: position.y * hauteurEcran - hauteurCarte / 2,
      transform: [{ rotate: `${rotation}deg` }, { scale: echelle }],
      zIndex: 100,
    };
  });

  // Sans flip → rendu simple (comportement existant)
  if (!aFlip) {
    return (
      <Animated.View style={styleConteneur}>
        <CarteSkia
          carte={carte}
          largeur={largeurCarte}
          hauteur={hauteurCarte}
          faceVisible={faceVisible}
        />
      </Animated.View>
    );
  }

  // Avec flip → deux couches superposées avec backfaceVisibility
  const flipDeVal = flipDe!;
  const flipVersVal = flipVers!;

  // Style de la couche dos (rotateY de flipDe à flipVers)
  const styleDos = useAnimatedStyle(() => {
    const t = progres.value;
    const rotY = flipDeVal + (flipVersVal - flipDeVal) * t;
    return {
      position: "absolute" as const,
      width: largeurCarte,
      height: hauteurCarte,
      backfaceVisibility: "hidden" as const,
      transform: [{ perspective: 800 }, { rotateY: `${rotY}deg` }],
    };
  });

  // Style de la couche face (décalée de 180° par rapport au dos)
  const styleFace = useAnimatedStyle(() => {
    const t = progres.value;
    const rotY = flipDeVal + (flipVersVal - flipDeVal) * t;
    return {
      position: "absolute" as const,
      width: largeurCarte,
      height: hauteurCarte,
      backfaceVisibility: "hidden" as const,
      transform: [{ perspective: 800 }, { rotateY: `${rotY + 180}deg` }],
    };
  });

  return (
    <Animated.View style={styleConteneur}>
      <Animated.View style={styleDos}>
        <CarteDos largeur={largeurCarte} hauteur={hauteurCarte} />
      </Animated.View>
      <Animated.View style={styleFace}>
        <CarteFace carte={carte} largeur={largeurCarte} hauteur={hauteurCarte} />
      </Animated.View>
    </Animated.View>
  );
}
