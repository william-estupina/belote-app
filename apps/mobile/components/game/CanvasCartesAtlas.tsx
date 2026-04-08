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
import { type StyleProp, StyleSheet, type ViewStyle } from "react-native";

import type { AtlasCartes } from "../../hooks/useAtlasCartes";

const RAYON_OVERLAY_GRISE = 6;

export interface CarteCanvasAtlas {
  id: string;
  type: "recto" | "dos";
  carte?: Carte;
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  rotation?: number;
  echelle?: number;
  grisee?: boolean;
  visible?: boolean;
  zIndex?: number;
}

interface PropsCanvasCartesAtlas {
  atlas: AtlasCartes;
  cartes: CarteCanvasAtlas[];
  largeur: number;
  hauteur: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function convertirRectSource(source: ReturnType<AtlasCartes["rectSource"]>): SkRect {
  return rect(source.x, source.y, source.width, source.height);
}

function comparerCartes(a: CarteCanvasAtlas, b: CarteCanvasAtlas) {
  return (a.zIndex ?? 0) - (b.zIndex ?? 0);
}

export function CanvasCartesAtlas({
  atlas,
  cartes,
  largeur,
  hauteur,
  style,
  testID = "canvas-cartes-atlas",
}: PropsCanvasCartesAtlas) {
  const styleCanvas = StyleSheet.flatten([{ width: largeur, height: hauteur }, style]);
  const cartesTriees = useMemo(
    () => cartes.filter((carte) => carte.visible !== false).sort(comparerCartes),
    [cartes],
  );
  const sprites = useMemo(
    () =>
      cartesTriees.map((carteAtlas) => {
        if (carteAtlas.type === "dos" || !carteAtlas.carte) {
          return convertirRectSource(atlas.rectDos());
        }

        return convertirRectSource(
          atlas.rectSource(carteAtlas.carte.couleur, carteAtlas.carte.rang),
        );
      }),
    [atlas, cartesTriees],
  );
  const transformations = useRSXformBuffer(cartesTriees.length, (valeur, index) => {
    "worklet";
    const carteAtlas = cartesTriees[index];

    if (!carteAtlas || atlas.largeurCellule === 0 || atlas.hauteurCellule === 0) {
      valeur.set(0, 0, -10000, -10000);
      return;
    }

    const rotation = carteAtlas.rotation ?? 0;
    const echelle =
      (carteAtlas.echelle ?? 1) *
      Math.min(
        carteAtlas.largeur / atlas.largeurCellule,
        carteAtlas.hauteur / atlas.hauteurCellule,
      );
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.cos(radians) * echelle;
    const sin = Math.sin(radians) * echelle;
    const pivotX = atlas.largeurCellule / 2;
    const pivotY = atlas.hauteurCellule / 2;
    const pixelX = carteAtlas.x + carteAtlas.largeur / 2;
    const pixelY = carteAtlas.y + carteAtlas.hauteur / 2;

    valeur.set(
      cos,
      sin,
      pixelX - cos * pivotX + sin * pivotY,
      pixelY - sin * pivotX - cos * pivotY,
    );
  });

  if (!atlas.image || cartesTriees.length === 0) {
    return null;
  }

  return (
    <Canvas testID={testID} style={styleCanvas} pointerEvents="none">
      <Group>
        <Shadow dx={1} dy={2} blur={4} color="rgba(0, 0, 0, 0.35)" />
        <Atlas image={atlas.image} sprites={sprites} transforms={transformations} />
        {cartesTriees.map((carte) =>
          carte.grisee ? (
            <RoundedRect
              key={carte.id}
              x={carte.x}
              y={carte.y}
              width={carte.largeur}
              height={carte.hauteur}
              r={RAYON_OVERLAY_GRISE}
              color="rgba(0, 0, 0, 0.45)"
            />
          ) : null,
        )}
      </Group>
    </Canvas>
  );
}
