import {
  Atlas,
  Canvas,
  Group,
  Shadow,
  type SkRect,
  useRSXformBuffer,
} from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";

import {
  MAX_SLOTS_ATLAS,
  SLOTS_MAIN,
  STRIDE_UNIFIE,
} from "../../constants/canvas-unifie";
import { RATIO_LARGEUR_CARTE } from "../../constants/layout";
import { interpolerBezierQuadratique } from "../../hooks/distributionAtlas";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import type { ValeursAnimationMainJoueur } from "../../hooks/useBufferCanvasUnifie";

interface PropsCanvasCartesUnifie {
  atlas: AtlasCartes;
  progressions: SharedValue<number>[];
  donneesWorklet: SharedValue<number[]>;
  sprites: SkRect[];
  colors: Float32Array[];
  largeurEcran: number;
  hauteurEcran: number;
  /** SharedValues individuelles pour la main joueur (slots 28-35) */
  valeursMain: ValeursAnimationMainJoueur;
  /** Nombre de cartes visibles dans la main joueur */
  nbCartesMain: number;
  /** Largeur d'une carte à l'écran (pixels) */
  largeurCarte: number;
  /** Hauteur d'une carte à l'écran (pixels) */
  hauteurCarte: number;
}

/**
 * Canvas Skia unifié permanent — dessine toutes les cartes du jeu.
 * 44 slots Atlas + rendu flip 2D optionnel par-dessus.
 * Toujours monté, les cartes inactives sont parquées off-screen.
 */
export function CanvasCartesUnifie({
  atlas,
  progressions,
  donneesWorklet,
  sprites,
  colors,
  largeurEcran,
  hauteurEcran,
  valeursMain,
  nbCartesMain,
  largeurCarte,
  hauteurCarte,
}: PropsCanvasCartesUnifie) {
  const echelleBase = atlas.largeurCellule > 0 ? largeurCarte / atlas.largeurCellule : 1;
  const pivotX = atlas.largeurCellule / 2;
  const pivotY = atlas.hauteurCellule / 2;

  // Facteur d'échelle base pour les groupes qui utilisent le buffer Bézier (coord normalisées)
  const largeurCarteBase = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const scaleBaseBezier =
    atlas.largeurCellule > 0 ? largeurCarteBase / atlas.largeurCellule : 1;

  const transforms = useRSXformBuffer(MAX_SLOTS_ATLAS, (val, i) => {
    "worklet";

    // --- Groupe MAIN_JOUEUR (slots 28-35) : SharedValues individuelles ---
    if (i >= SLOTS_MAIN.debut && i <= SLOTS_MAIN.fin) {
      const indexMain = i - SLOTS_MAIN.debut;

      // Vérifier si la carte est visible (x > -1000 = visible)
      const x = valeursMain.x[indexMain].value;
      if (x < -1000) {
        val.set(0, 0, -10000, -10000);
        return;
      }

      const decalageY = valeursMain.decalageY[indexMain].value;
      const rotation = valeursMain.angle[indexMain].value;
      const echelle = valeursMain.echelle[indexMain].value;

      const radians = (rotation * Math.PI) / 180;
      const cos = Math.cos(radians) * echelle * echelleBase;
      const sin = Math.sin(radians) * echelle * echelleBase;
      // Position : x est en pixels absolus, decalageY depuis le bas
      const pixelX = x + largeurCarte / 2;
      const pixelY = hauteurEcran - decalageY - hauteurCarte / 2 + hauteurCarte * 0.15;

      val.set(
        cos,
        sin,
        pixelX - cos * pivotX + sin * pivotY,
        pixelY - sin * pivotX - cos * pivotY,
      );
      return;
    }

    // --- Tous les autres groupes : interpolation Bézier depuis le buffer ---
    const t = progressions[i].value;
    if (t < 0 || t > 1) {
      val.set(0, 0, -10000, -10000);
      return;
    }

    const donnees = donneesWorklet.value;
    const offset = i * STRIDE_UNIFIE;
    const departX = donnees[offset];
    const departY = donnees[offset + 1];
    const controleX = donnees[offset + 2];
    const controleY = donnees[offset + 3];
    const arriveeX = donnees[offset + 4];
    const arriveeY = donnees[offset + 5];
    const rotDepart = donnees[offset + 6];
    const rotArrivee = donnees[offset + 7];
    const echDepart = donnees[offset + 8];
    const echArrivee = donnees[offset + 9];

    const pos = interpolerBezierQuadratique(
      { x: departX, y: departY },
      { x: controleX, y: controleY },
      { x: arriveeX, y: arriveeY },
      t,
    );

    const rotation = rotDepart + (rotArrivee - rotDepart) * t;
    const echelle = echDepart + (echArrivee - echDepart) * t;

    const rotRad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rotRad) * echelle * scaleBaseBezier;
    const sin = Math.sin(rotRad) * echelle * scaleBaseBezier;

    const pixelX = pos.x * largeurEcran;
    const pixelY = pos.y * hauteurEcran;

    val.set(
      cos,
      sin,
      pixelX - cos * pivotX + sin * pivotY,
      pixelY - sin * pivotX - cos * pivotY,
    );
  });

  if (!atlas.image || sprites.length === 0) return null;

  return (
    <Canvas
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: largeurEcran,
        height: hauteurEcran,
        zIndex: 40,
      }}
      pointerEvents="none"
    >
      <Group>
        <Shadow dx={1} dy={2} blur={4} color="rgba(0, 0, 0, 0.35)" />
        <Atlas
          image={atlas.image}
          sprites={sprites}
          transforms={transforms}
          colors={colors}
        />
      </Group>
    </Canvas>
  );
}
