import type { Carte, Couleur } from "@belote/shared-types";
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
 * Carte rendue en React Native pur (View + Text)
 */
export function CarteSkia({
  carte,
  largeur = LARGEUR_CARTE_DEFAUT,
  hauteur = HAUTEUR_CARTE_DEFAUT,
  faceVisible = true,
}: PropsCarteSkia) {
  if (!faceVisible) {
    return <CarteDos largeur={largeur} hauteur={hauteur} />;
  }

  return <CarteFace carte={carte} largeur={largeur} hauteur={hauteur} />;
}

// --- Dos de carte ---

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

// --- Face de carte (React Native pur) ---

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
  const couleurSymbole = COULEURS_SYMBOLES[couleur];
  const symbole = SYMBOLES[couleur];
  const labelRang = LABELS_RANGS[rang] ?? rang;
  const tailleRang = largeur * 0.28;
  const tailleSymbole = largeur * 0.4;

  return (
    <View
      style={[
        faceStyles.carte,
        {
          width: largeur,
          height: hauteur,
          borderRadius: RAYON_COIN,
        },
      ]}
    >
      {/* Rang en haut à gauche */}
      <Text
        style={[
          faceStyles.rangHaut,
          { fontSize: tailleRang, lineHeight: tailleRang * 1.1, color: couleurSymbole },
        ]}
      >
        {labelRang}
      </Text>

      {/* Symbole central */}
      <Text
        style={[
          faceStyles.symboleCentre,
          {
            fontSize: tailleSymbole,
            lineHeight: tailleSymbole * 1.1,
            color: couleurSymbole,
          },
        ]}
      >
        {symbole}
      </Text>

      {/* Rang en bas à droite (retourné) */}
      <Text
        style={[
          faceStyles.rangBas,
          { fontSize: tailleRang, lineHeight: tailleRang * 1.1, color: couleurSymbole },
        ]}
      >
        {labelRang}
      </Text>
    </View>
  );
}

const faceStyles = StyleSheet.create({
  carte: {
    backgroundColor: "#f5f0e1",
    borderWidth: 1,
    borderColor: "#c0b090",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  rangHaut: {
    position: "absolute",
    top: "5%",
    left: "8%",
    fontWeight: "bold",
  },
  symboleCentre: {
    position: "absolute",
    top: "35%",
    alignSelf: "center",
  },
  rangBas: {
    position: "absolute",
    bottom: "5%",
    right: "8%",
    fontWeight: "bold",
    transform: [{ rotate: "180deg" }],
  },
});

/**
 * Composant simple pour afficher le symbole d'une couleur.
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
