import type { Carte } from "@belote/shared-types";
import { useEffect, useRef } from "react";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { CarteDos, CarteFaceAtlas } from "./Carte";

interface PropsCarteRevelation {
  carte: Carte;
  departX: number;
  departY: number;
  arriveeX: number;
  arriveeY: number;
  largeurCarte: number;
  hauteurCarte: number;
  atlas: AtlasCartes;
  onTerminee: () => void;
  inverse?: boolean;
  dureeTotale?: number; // seulement utilisé en mode inverse
}

// Durées de référence des 3 phases (ms)
const DUREE_SOULEVEMENT = 200;
const DUREE_FLIP = 300;
const DUREE_PLACEMENT = 350;
const DUREE_TOTALE_REF = DUREE_SOULEVEMENT + DUREE_FLIP + DUREE_PLACEMENT;
// Soulevement vertical en pixels
const PX_SOULEVEMENT = 8;

export function CarteRevelation({
  carte,
  departX,
  departY,
  arriveeX,
  arriveeY,
  largeurCarte,
  hauteurCarte,
  atlas,
  onTerminee,
  inverse = false,
  dureeTotale,
}: PropsCarteRevelation) {
  // progres : 0 → 1 (soulevement) → 2 (flip) → 3 (placement)
  const progres = useSharedValue(0);
  const animationFrameRef = useRef<number | null>(null);

  const onTermineeRef = useRef(onTerminee);
  useEffect(() => {
    onTermineeRef.current = onTerminee;
  });

  // Durées effectives (ms) — en mode inverse avec dureeTotale fourni, on scale proportionnellement
  const dureeSoulevement =
    inverse && dureeTotale !== undefined
      ? Math.round((DUREE_SOULEVEMENT / DUREE_TOTALE_REF) * dureeTotale)
      : DUREE_SOULEVEMENT;
  const dureeFlip =
    inverse && dureeTotale !== undefined
      ? Math.round((DUREE_FLIP / DUREE_TOTALE_REF) * dureeTotale)
      : DUREE_FLIP;
  const dureePlacement =
    inverse && dureeTotale !== undefined
      ? dureeTotale - dureeSoulevement - dureeFlip
      : DUREE_PLACEMENT;

  useEffect(() => {
    progres.value = withSequence(
      withTiming(1, { duration: dureeSoulevement, easing: Easing.out(Easing.ease) }),
      withTiming(2, { duration: dureeFlip, easing: Easing.inOut(Easing.ease) }),
      withTiming(
        3,
        { duration: dureePlacement, easing: Easing.inOut(Easing.cubic) },
        (fini) => {
          "worklet";
          if (fini) {
            runOnJS(() => {
              animationFrameRef.current = requestAnimationFrame(() => {
                animationFrameRef.current = null;
                onTermineeRef.current();
              });
            })();
          }
        },
      ),
    );

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [progres, dureeSoulevement, dureeFlip, dureePlacement]);

  // Position et échelle du conteneur
  const styleConteneur = useAnimatedStyle(() => {
    const p = progres.value;

    const x = inverse
      ? interpolate(p, [0, 1, 2, 3], [arriveeX, departX, departX, departX])
      : interpolate(p, [0, 1, 2, 3], [departX, departX, departX, arriveeX]);

    const y = inverse
      ? interpolate(
          p,
          [0, 1, 2, 3],
          [arriveeY, arriveeY - PX_SOULEVEMENT, arriveeY - PX_SOULEVEMENT, departY],
        )
      : interpolate(
          p,
          [0, 1, 2, 3],
          [departY, departY - PX_SOULEVEMENT, departY - PX_SOULEVEMENT, arriveeY],
        );

    const echelle = inverse
      ? interpolate(p, [0, 1, 2, 3], [1.0, 1.0, 1.0, 0.85])
      : interpolate(p, [0, 1, 2, 3], [0.85, 1.0, 1.0, 1.0]);

    const rotation = interpolate(p, [0, 1, 2, 3], [0, -5, -5, 0]);

    return {
      position: "absolute" as const,
      left: x - largeurCarte / 2,
      top: y - hauteurCarte / 2,
      transform: [{ rotate: `${rotation}deg` }, { scale: echelle }],
      zIndex: 100,
      shadowColor: "#000",
      shadowOffset: { width: 1, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 3,
      elevation: 4,
    };
  });

  // Dos
  const styleDos = useAnimatedStyle(() => {
    const p = progres.value;
    const rotY = inverse
      ? interpolate(p, [1, 1.5, 2], [-90, -90, 0], "clamp")
      : interpolate(p, [1, 1.5, 2], [0, 90, 90], "clamp");
    const opacity = inverse
      ? interpolate(p, [1, 1.5, 1.6, 2], [0, 0, 1, 1], "clamp")
      : interpolate(p, [0, 1, 1.4, 1.5], [1, 1, 1, 0], "clamp");
    return {
      position: "absolute" as const,
      width: largeurCarte,
      height: hauteurCarte,
      backfaceVisibility: "hidden" as const,
      opacity,
      transform: [{ perspective: 800 }, { rotateY: `${rotY}deg` }],
    };
  });

  // Face
  const styleFace = useAnimatedStyle(() => {
    const p = progres.value;
    const rotY = inverse
      ? interpolate(p, [1, 1.5, 2], [0, 90, 90], "clamp")
      : interpolate(p, [1, 1.5, 2], [-90, -90, 0], "clamp");
    const opacity = inverse
      ? interpolate(p, [0, 1, 1.4, 1.5], [1, 1, 1, 0], "clamp")
      : interpolate(p, [1, 1.5, 1.6, 2], [0, 0, 1, 1], "clamp");
    return {
      position: "absolute" as const,
      width: largeurCarte,
      height: hauteurCarte,
      backfaceVisibility: "hidden" as const,
      opacity,
      transform: [{ perspective: 800 }, { rotateY: `${rotY}deg` }],
    };
  });

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
