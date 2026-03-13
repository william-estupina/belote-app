import type { Carte, Couleur } from "@belote/shared-types";
import {
  Canvas,
  Group,
  RoundedRect,
  Shadow,
  Text as SkiaText,
  useFont,
} from "@shopify/react-native-skia";
import { StyleSheet, Text, View } from "react-native";

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

/**
 * Carte face visible — rendue avec Skia (texte + symboles)
 */
export function CarteSkia({
  carte,
  largeur = LARGEUR_CARTE_DEFAUT,
  hauteur = HAUTEUR_CARTE_DEFAUT,
  faceVisible = true,
}: PropsCarteSkia) {
  // Dos de carte : View RN simple (pas de Canvas WebGL = pas de limite de contextes)
  if (!faceVisible) {
    return <CarteDos largeur={largeur} hauteur={hauteur} />;
  }

  return <CarteFace carte={carte} largeur={largeur} hauteur={hauteur} />;
}

// --- Dos de carte (View RN classique) ---

function CarteDos({ largeur, hauteur }: { largeur: number; hauteur: number }) {
  return (
    <View
      style={[
        dosStyles.carte,
        {
          width: largeur,
          height: hauteur,
          borderRadius: RAYON_COIN,
        },
      ]}
    >
      <View
        style={[
          dosStyles.motifInterieur,
          {
            borderRadius: RAYON_COIN - 2,
          },
        ]}
      />
    </View>
  );
}

const dosStyles = StyleSheet.create({
  carte: {
    backgroundColor: "#2a5a8c",
    borderWidth: 1,
    borderColor: "#1e4060",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    justifyContent: "center",
    alignItems: "center",
    padding: "10%",
  },
  motifInterieur: {
    width: "80%",
    height: "88%",
    borderWidth: 2,
    borderColor: "#3a7abb",
  },
});

// --- Face de carte (Skia Canvas) ---

function CarteFace({
  carte,
  largeur,
  hauteur,
}: {
  carte: Carte;
  largeur: number;
  hauteur: number;
}) {
  const { rang, couleur } = carte;
  const police = useFont(null, largeur * 0.28);
  const policeSymbole = useFont(null, largeur * 0.4);

  const couleurSymbole = COULEURS_SYMBOLES[couleur];
  const symbole = SYMBOLES[couleur];
  const labelRang = LABELS_RANGS[rang] ?? rang;

  const margeOmbre = 8;

  return (
    <View style={{ width: largeur, height: hauteur, overflow: "visible" }}>
      <Canvas style={{ width: largeur + margeOmbre, height: hauteur + margeOmbre }}>
        <Group>
          <RoundedRect
            x={0}
            y={0}
            width={largeur}
            height={hauteur}
            r={RAYON_COIN}
            color="#f5f0e1"
          />
          <Shadow dx={2} dy={2} blur={4} color="rgba(0,0,0,0.3)" />

          <RoundedRect
            x={1}
            y={1}
            width={largeur - 2}
            height={hauteur - 2}
            r={RAYON_COIN}
            color="#c0b090"
            style="stroke"
            strokeWidth={1}
          />

          {police && policeSymbole ? (
            <>
              <SkiaText
                x={largeur * 0.08}
                y={largeur * 0.32}
                text={labelRang}
                font={police}
                color={couleurSymbole}
              />
              <SkiaText
                x={largeur * 0.3}
                y={hauteur * 0.6}
                text={symbole}
                font={policeSymbole}
                color={couleurSymbole}
              />
              <SkiaText
                x={largeur * 0.62}
                y={hauteur - largeur * 0.08}
                text={labelRang}
                font={police}
                color={couleurSymbole}
              />
            </>
          ) : null}
        </Group>
      </Canvas>
    </View>
  );
}

/**
 * Composant simple (pas Skia) pour afficher le symbole d'une couleur.
 * Utilisé par IndicateurAtout et d'autres UI non-jeu.
 */
export function SymboleCouleur({
  couleur,
  taille = 24,
}: {
  couleur: Couleur;
  taille?: number;
}) {
  return (
    <Text style={{ fontSize: taille, color: COULEURS_SYMBOLES[couleur] }}>
      {SYMBOLES[couleur]}
    </Text>
  );
}
