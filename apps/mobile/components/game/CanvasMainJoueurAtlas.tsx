import type { Carte } from "@belote/shared-types";
import {
  Atlas,
  Canvas,
  Group,
  rect,
  RoundedRect,
  Shadow,
  type SkRect,
  useRSXformBuffer,
} from "@shopify/react-native-skia";
import { useMemo } from "react";
import type { SharedValue } from "react-native-reanimated";

import type { AtlasCartes } from "../../hooks/useAtlasCartes";

const MAX_CARTES_MAIN = 8;
const RAYON_OVERLAY_GRISE = 6;

export interface CarteMainJoueurAtlas {
  carte: Carte;
  x: number;
  decalageY: number;
  angle: number;
  grisee: boolean;
  visible: boolean;
}

export interface ValeursAnimationMainJoueur {
  x: SharedValue<number>[];
  decalageY: SharedValue<number>[];
  angle: SharedValue<number>[];
  echelle: SharedValue<number>[];
}

interface PropsCanvasMainJoueurAtlas {
  atlas: AtlasCartes;
  cartes: CarteMainJoueurAtlas[];
  valeursAnimation: ValeursAnimationMainJoueur;
  largeurCarte: number;
  hauteurCarte: number;
  largeurEcran: number;
  hauteurEcran: number;
}

function convertirRectSource(source: ReturnType<AtlasCartes["rectSource"]>): SkRect {
  return rect(source.x, source.y, source.width, source.height);
}

export function CanvasMainJoueurAtlas({
  atlas,
  cartes,
  valeursAnimation,
  largeurCarte,
  hauteurCarte,
  largeurEcran,
  hauteurEcran,
}: PropsCanvasMainJoueurAtlas) {
  const echelleBase = atlas.largeurCellule > 0 ? largeurCarte / atlas.largeurCellule : 1;
  const pivotX = atlas.largeurCellule / 2;
  const pivotY = atlas.hauteurCellule / 2;
  const sprites = useMemo(
    () =>
      Array.from({ length: MAX_CARTES_MAIN }, (_, index) => {
        const carte = cartes[index]?.carte;
        return convertirRectSource(
          carte ? atlas.rectSource(carte.couleur, carte.rang) : atlas.rectDos(),
        );
      }),
    [atlas, cartes],
  );
  const transformations = useRSXformBuffer(MAX_CARTES_MAIN, (valeur, index) => {
    "worklet";
    const carte = cartes[index];

    if (!carte || !carte.visible) {
      valeur.set(0, 0, -10000, -10000);
      return;
    }

    const x = valeursAnimation.x[index].value;
    const decalageY = valeursAnimation.decalageY[index].value;
    const rotation = valeursAnimation.angle[index].value;
    const echelle = valeursAnimation.echelle[index].value;
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.cos(radians) * echelle * echelleBase;
    const sin = Math.sin(radians) * echelle * echelleBase;
    const pixelX = x + largeurCarte / 2;
    const pixelY = hauteurEcran - decalageY - hauteurCarte / 2 + hauteurCarte * 0.15;

    valeur.set(
      cos,
      sin,
      pixelX - cos * pivotX + sin * pivotY,
      pixelY - sin * pivotX - cos * pivotY,
    );
  });

  if (!atlas.image || cartes.length === 0) {
    return null;
  }

  return (
    <Canvas
      testID="canvas-main-joueur-atlas"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: largeurEcran,
        height: hauteurEcran,
        zIndex: 45,
      }}
      pointerEvents="none"
    >
      <Group>
        <Shadow dx={1} dy={2} blur={4} color="rgba(0, 0, 0, 0.35)" />
        <Atlas image={atlas.image} sprites={sprites} transforms={transformations} />
        {cartes.map((carte) =>
          carte.grisee && carte.visible ? (
            <RoundedRect
              key={`${carte.carte.couleur}-${carte.carte.rang}`}
              x={carte.x}
              y={hauteurEcran - carte.decalageY - hauteurCarte + hauteurCarte * 0.15}
              width={largeurCarte}
              height={hauteurCarte}
              r={RAYON_OVERLAY_GRISE}
              color="rgba(0, 0, 0, 0.45)"
            />
          ) : null,
        )}
      </Group>
    </Canvas>
  );
}
