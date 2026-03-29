import type { Carte } from "@belote/shared-types";
import { useEffect } from "react";
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
  departX: number; // pixels — centre du paquet
  departY: number; // pixels — centre du paquet
  arriveeX: number; // pixels — centre zone carte retournée
  arriveeY: number; // pixels — centre zone carte retournée
  largeurCarte: number;
  hauteurCarte: number;
  atlas: AtlasCartes;
  onTerminee: () => void;
}

// Durées des 3 phases (ms)
const DUREE_SOULEVEMENT = 200;
const DUREE_FLIP = 300;
const DUREE_PLACEMENT = 350;
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
}: PropsCarteRevelation) {
  // progres : 0 → 1 (soulevement) → 2 (flip) → 3 (placement)
  const progres = useSharedValue(0);

  useEffect(() => {
    progres.value = withSequence(
      withTiming(1, { duration: DUREE_SOULEVEMENT, easing: Easing.out(Easing.ease) }),
      withTiming(2, { duration: DUREE_FLIP, easing: Easing.inOut(Easing.ease) }),
      withTiming(
        3,
        { duration: DUREE_PLACEMENT, easing: Easing.inOut(Easing.cubic) },
        (fini) => {
          "worklet";
          if (fini) runOnJS(onTerminee)();
        },
      ),
    );
  }, [progres, onTerminee]);

  // Position et échelle du conteneur
  const styleConteneur = useAnimatedStyle(() => {
    const p = progres.value;

    // Phase 1 (0→1) : soulevement depuis departX/Y vers position soulevée
    // Phase 2 (1→2) : flip sur place (position soulevée fixe)
    // Phase 3 (2→3) : glissement vers arriveeX/Y
    const x = interpolate(p, [0, 1, 2, 3], [departX, departX, departX, arriveeX]);
    // Y soulevé = departY - PX_SOULEVEMENT
    const y = interpolate(
      p,
      [0, 1, 2, 3],
      [departY, departY - PX_SOULEVEMENT, departY - PX_SOULEVEMENT, arriveeY],
    );
    const echelle = interpolate(p, [0, 1, 2, 3], [0.85, 1.0, 1.0, 1.0]);
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

  // Dos : visible de 0° à 90° (phase 0→1.5), puis caché
  const styleDos = useAnimatedStyle(() => {
    const p = progres.value;
    // flip démarre à phase=1, finit à phase=2
    // rotY : 0° à phase=1, 90° à phase=1.5
    const rotY = interpolate(p, [1, 1.5, 2], [0, 90, 90], "clamp");
    return {
      position: "absolute" as const,
      width: largeurCarte,
      height: hauteurCarte,
      backfaceVisibility: "hidden" as const,
      transform: [{ perspective: 800 }, { rotateY: `${rotY}deg` }],
    };
  });

  // Face : cachée jusqu'à 90°, puis visible de 90° à 0° (phase 1.5→2)
  const styleFace = useAnimatedStyle(() => {
    const p = progres.value;
    // Face démarre à -90° (soit 270°), finit à 0°
    const rotY = interpolate(p, [1, 1.5, 2], [-90, -90, 0], "clamp");
    return {
      position: "absolute" as const,
      width: largeurCarte,
      height: hauteurCarte,
      backfaceVisibility: "hidden" as const,
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
