import type { Carte } from "@belote/shared-types";
import { useEffect, useRef } from "react";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import {
  ANIMATIONS,
  RATIO_ASPECT_CARTE,
  RATIO_LARGEUR_CARTE,
} from "../../constants/layout";
import {
  calculerPointArc,
  interpolerBezierQuadratique,
} from "../../hooks/distributionAtlas";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { CarteDos, CarteFaceAtlas } from "./Carte";

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
  estEnPause?: boolean;
  estVisible?: boolean;
  delai?: number;
  duree: number;
  largeurEcran: number;
  hauteurEcran: number;
  atlas: AtlasCartes;
  onPretAffichage?: () => void;
  onTerminee?: () => void;
  flipDe?: number;
  flipVers?: number;
  easing?: "out-cubic" | "inout-cubic" | "out-back-soft";
  segment?: number;
}

const EASINGS = {
  "out-cubic": Easing.out(Easing.cubic),
  "inout-cubic": Easing.inOut(Easing.cubic),
  "out-back-soft": Easing.out(Easing.back(0.85)),
};

export function CarteAnimee({
  carte,
  depart,
  arrivee,
  faceVisible,
  estEnPause = false,
  estVisible = true,
  delai = 0,
  duree,
  largeurEcran,
  hauteurEcran,
  atlas,
  onPretAffichage,
  onTerminee,
  flipDe,
  flipVers,
  easing = "out-cubic",
  segment = 0,
}: PropsCarteAnimee) {
  const progres = useSharedValue(0);
  const aFlip = flipDe !== undefined && flipVers !== undefined;
  const animationFrameFinRef = useRef<number | null>(null);
  const animationFramePretRef = useRef<number | null>(null);
  const timeoutFinRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTermineeRef = useRef(onTerminee);
  const onPretAffichageRef = useRef(onPretAffichage);
  const aSignalePretRef = useRef(false);
  onTermineeRef.current = onTerminee;
  onPretAffichageRef.current = onPretAffichage;

  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);
  const pointControle = calculerPointArc(
    { x: depart.x, y: depart.y },
    { x: arrivee.x, y: arrivee.y },
    ANIMATIONS.distribution.arcDistribution.decalagePerpendiculaire,
  );
  const flipDeVal = flipDe ?? 0;
  const flipVersVal = flipVers ?? 0;

  useEffect(() => {
    return () => {
      if (animationFrameFinRef.current !== null) {
        globalThis.cancelAnimationFrame?.(animationFrameFinRef.current);
        animationFrameFinRef.current = null;
      }

      if (animationFramePretRef.current !== null) {
        globalThis.cancelAnimationFrame?.(animationFramePretRef.current);
        animationFramePretRef.current = null;
      }

      if (timeoutFinRef.current !== null) {
        clearTimeout(timeoutFinRef.current);
        timeoutFinRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (estEnPause) {
      progres.value = 0;
      return;
    }

    const planifierFinAnimation = () => {
      const cb = onTermineeRef.current;
      if (!cb) return;

      if (typeof globalThis.requestAnimationFrame === "function") {
        animationFrameFinRef.current = globalThis.requestAnimationFrame(() => {
          animationFrameFinRef.current = null;
          cb();
        });
        return;
      }

      timeoutFinRef.current = setTimeout(() => {
        timeoutFinRef.current = null;
        cb();
      }, 0);
    };

    progres.value = 0;
    progres.value = withDelay(
      delai,
      withTiming(1, { duration: duree, easing: EASINGS[easing] }, (termine) => {
        "worklet";
        if (termine) {
          runOnJS(planifierFinAnimation)();
        }
      }),
    );
  }, [progres, delai, duree, easing, estEnPause, segment]);

  useEffect(() => {
    if (!estEnPause || aSignalePretRef.current) {
      return;
    }

    const notifierPret = () => {
      aSignalePretRef.current = true;
      onPretAffichageRef.current?.();
    };

    if (typeof globalThis.requestAnimationFrame === "function") {
      animationFramePretRef.current = globalThis.requestAnimationFrame(() => {
        animationFramePretRef.current = null;
        notifierPret();
      });
      return;
    }

    timeoutFinRef.current = setTimeout(() => {
      timeoutFinRef.current = null;
      notifierPret();
    }, 0);
  }, [estEnPause]);

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
      opacity: estVisible ? 1 : 0,
      transform: [{ rotate: `${rotation}deg` }, { scale: echelle }],
      zIndex: 100,
      shadowColor: "#000",
      shadowOffset: { width: 1, height: 2 },
      shadowOpacity: estEnPause ? 0 : 0.4,
      shadowRadius: estEnPause ? 0 : 3,
      elevation: estEnPause ? 0 : 4,
    };
  });

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

  if (!aFlip) {
    return (
      <Animated.View style={styleConteneur}>
        {faceVisible ? (
          <CarteFaceAtlas
            atlas={atlas}
            carte={carte}
            largeur={largeurCarte}
            hauteur={hauteurCarte}
          />
        ) : (
          <CarteDos largeur={largeurCarte} hauteur={hauteurCarte} />
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={styleConteneur}>
      <Animated.View style={styleDos}>
        <CarteDos largeur={largeurCarte} hauteur={hauteurCarte} />
      </Animated.View>
      <Animated.View style={styleFace}>
        <CarteFaceAtlas
          atlas={atlas}
          carte={carte}
          largeur={largeurCarte}
          hauteur={hauteurCarte}
        />
      </Animated.View>
    </Animated.View>
  );
}
