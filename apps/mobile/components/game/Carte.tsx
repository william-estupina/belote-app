import type { Carte, Couleur } from "@belote/shared-types";
import {
  Canvas,
  Group,
  RoundedRect,
  Shadow,
  Text as SkiaText,
  useFont,
} from "@shopify/react-native-skia";
import { View } from "react-native";

// Dimensions par défaut d'une carte (proportionnelles, redimensionnables via props)
const LARGEUR_CARTE_DEFAUT = 70;
const HAUTEUR_CARTE_DEFAUT = 100;
const RAYON_COIN = 6;

// Couleurs des symboles
const COULEURS_SYMBOLES: Record<Couleur, string> = {
  coeur: "#cc0000",
  carreau: "#cc0000",
  pique: "#1a1a1a",
  trefle: "#1a1a1a",
};

// Symboles Unicode pour chaque couleur
const SYMBOLES: Record<Couleur, string> = {
  coeur: "\u2665",
  carreau: "\u2666",
  pique: "\u2660",
  trefle: "\u2663",
};

// Labels des rangs
const LABELS_RANGS: Record<string, string> = {
  as: "A",
  roi: "R",
  dame: "D",
  valet: "V",
  "10": "10",
  "9": "9",
  "8": "8",
  "7": "7",
};

interface PropsCarteSkia {
  carte: Carte;
  largeur?: number;
  hauteur?: number;
  faceVisible?: boolean;
}

export function CarteSkia({
  carte,
  largeur = LARGEUR_CARTE_DEFAUT,
  hauteur = HAUTEUR_CARTE_DEFAUT,
  faceVisible = true,
}: PropsCarteSkia) {
  const { rang, couleur } = carte;
  const police = useFont(null, largeur * 0.28);
  const policeSymbole = useFont(null, largeur * 0.4);

  const couleurSymbole = COULEURS_SYMBOLES[couleur];
  const symbole = SYMBOLES[couleur];
  const labelRang = LABELS_RANGS[rang] ?? rang;

  return (
    <View style={{ width: largeur, height: hauteur }}>
      <Canvas style={{ width: largeur, height: hauteur }}>
        <Group>
          {/* Fond de la carte */}
          <RoundedRect
            x={0}
            y={0}
            width={largeur}
            height={hauteur}
            r={RAYON_COIN}
            color={faceVisible ? "#f5f0e1" : "#2a5a8c"}
          />
          <Shadow dx={2} dy={2} blur={4} color="rgba(0,0,0,0.3)" />

          {/* Bordure */}
          <RoundedRect
            x={1}
            y={1}
            width={largeur - 2}
            height={hauteur - 2}
            r={RAYON_COIN}
            color={faceVisible ? "#c0b090" : "#1e4060"}
            style="stroke"
            strokeWidth={1}
          />

          {faceVisible && police && policeSymbole ? (
            <>
              {/* Rang en haut à gauche */}
              <SkiaText
                x={largeur * 0.08}
                y={largeur * 0.32}
                text={labelRang}
                font={police}
                color={couleurSymbole}
              />

              {/* Symbole central */}
              <SkiaText
                x={largeur * 0.3}
                y={hauteur * 0.6}
                text={symbole}
                font={policeSymbole}
                color={couleurSymbole}
              />

              {/* Rang en bas à droite (inversé visuellement par position) */}
              <SkiaText
                x={largeur * 0.62}
                y={hauteur - largeur * 0.08}
                text={labelRang}
                font={police}
                color={couleurSymbole}
              />
            </>
          ) : !faceVisible ? (
            <>
              {/* Motif du dos : bordure intérieure */}
              <RoundedRect
                x={largeur * 0.1}
                y={hauteur * 0.06}
                width={largeur * 0.8}
                height={hauteur * 0.88}
                r={RAYON_COIN - 2}
                color="#3a7abb"
                style="stroke"
                strokeWidth={2}
              />
            </>
          ) : null}
        </Group>
      </Canvas>
    </View>
  );
}
