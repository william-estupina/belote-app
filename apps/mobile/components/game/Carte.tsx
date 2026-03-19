import type { Carte, Couleur, Rang } from "@belote/shared-types";
import { Image, type ImageSourcePropType, StyleSheet, Text, View } from "react-native";

// Dimensions par défaut d'une carte (proportionnelles, redimensionnables via props)
const LARGEUR_CARTE_DEFAUT = 70;
const HAUTEUR_CARTE_DEFAUT = 100;
const RAYON_COIN = 6;

// Couleurs des symboles (utilisé par SymboleCouleur)
const COULEURS_SYMBOLES: Record<Couleur, string> = {
  coeur: "#c41e3a",
  carreau: "#c41e3a",
  pique: "#1b1b2f",
  trefle: "#1b1b2f",
};

// Symboles Unicode pour chaque couleur (utilisé par SymboleCouleur)
const SYMBOLES: Record<Couleur, string> = {
  coeur: "\u2665",
  carreau: "\u2666",
  pique: "\u2660",
  trefle: "\u2663",
};

// Images PNG pour toutes les cartes (domaine public, source: vector-playing-cards)

const IMAGES_CARTES: Record<Rang, Record<Couleur, ImageSourcePropType>> = {
  "7": {
    pique: require("../../assets/cartes/7_of_spades.png"),
    coeur: require("../../assets/cartes/7_of_hearts.png"),
    carreau: require("../../assets/cartes/7_of_diamonds.png"),
    trefle: require("../../assets/cartes/7_of_clubs.png"),
  },
  "8": {
    pique: require("../../assets/cartes/8_of_spades.png"),
    coeur: require("../../assets/cartes/8_of_hearts.png"),
    carreau: require("../../assets/cartes/8_of_diamonds.png"),
    trefle: require("../../assets/cartes/8_of_clubs.png"),
  },
  "9": {
    pique: require("../../assets/cartes/9_of_spades.png"),
    coeur: require("../../assets/cartes/9_of_hearts.png"),
    carreau: require("../../assets/cartes/9_of_diamonds.png"),
    trefle: require("../../assets/cartes/9_of_clubs.png"),
  },
  "10": {
    pique: require("../../assets/cartes/10_of_spades.png"),
    coeur: require("../../assets/cartes/10_of_hearts.png"),
    carreau: require("../../assets/cartes/10_of_diamonds.png"),
    trefle: require("../../assets/cartes/10_of_clubs.png"),
  },
  valet: {
    pique: require("../../assets/cartes/jack_of_spades.png"),
    coeur: require("../../assets/cartes/jack_of_hearts.png"),
    carreau: require("../../assets/cartes/jack_of_diamonds.png"),
    trefle: require("../../assets/cartes/jack_of_clubs.png"),
  },
  dame: {
    pique: require("../../assets/cartes/queen_of_spades.png"),
    coeur: require("../../assets/cartes/queen_of_hearts.png"),
    carreau: require("../../assets/cartes/queen_of_diamonds.png"),
    trefle: require("../../assets/cartes/queen_of_clubs.png"),
  },
  roi: {
    pique: require("../../assets/cartes/king_of_spades.png"),
    coeur: require("../../assets/cartes/king_of_hearts.png"),
    carreau: require("../../assets/cartes/king_of_diamonds.png"),
    trefle: require("../../assets/cartes/king_of_clubs.png"),
  },
  as: {
    pique: require("../../assets/cartes/ace_of_spades.png"),
    coeur: require("../../assets/cartes/ace_of_hearts.png"),
    carreau: require("../../assets/cartes/ace_of_diamonds.png"),
    trefle: require("../../assets/cartes/ace_of_clubs.png"),
  },
};

interface PropsCarteSkia {
  carte: Carte;
  largeur?: number;
  hauteur?: number;
  faceVisible?: boolean;
  grisee?: boolean;
}

/**
 * Carte rendue avec images PNG (faces) et React Native Views (dos)
 */
export function CarteSkia({
  carte,
  largeur = LARGEUR_CARTE_DEFAUT,
  hauteur = HAUTEUR_CARTE_DEFAUT,
  faceVisible = true,
  grisee = false,
}: PropsCarteSkia) {
  if (!faceVisible) {
    return <CarteDos largeur={largeur} hauteur={hauteur} />;
  }

  return <CarteFace carte={carte} largeur={largeur} hauteur={hauteur} grisee={grisee} />;
}

// --- Dos de carte ---

export function CarteDos({ largeur, hauteur }: { largeur: number; hauteur: number }) {
  const marge = largeur * 0.08;
  const tailleMotif = largeur * 0.12;

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
          dosStyles.cadreExterieur,
          {
            borderRadius: RAYON_COIN - 1,
            margin: marge * 0.5,
          },
        ]}
      >
        <View
          style={[
            dosStyles.motifInterieur,
            {
              borderRadius: RAYON_COIN - 2,
              margin: marge * 0.4,
            },
          ]}
        >
          <View style={dosStyles.grilleMotif}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Text
                key={i}
                style={[
                  dosStyles.motifLosange,
                  { fontSize: tailleMotif, lineHeight: tailleMotif * 1.2 },
                ]}
              >
                {"\u2666"}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const dosStyles = StyleSheet.create({
  carte: {
    backgroundColor: "#9b2020",
    borderWidth: 2.5,
    borderColor: "#c8a84e",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
    overflow: "hidden",
  },
  cadreExterieur: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#dbb855",
  },
  motifInterieur: {
    flex: 1,
    backgroundColor: "#6a1010",
    borderWidth: 1,
    borderColor: "#dbb855",
    overflow: "hidden",
  },
  grilleMotif: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    alignContent: "center",
    padding: "4%",
  },
  motifLosange: {
    color: "#c04040",
    textAlign: "center",
    width: "33%",
  },
});

// --- Face de carte (image PNG) ---

export function CarteFace({
  carte,
  largeur,
  hauteur,
  grisee = false,
}: {
  carte: Carte;
  largeur: number;
  hauteur: number;
  grisee?: boolean;
}) {
  const imageCarte = IMAGES_CARTES[carte.rang][carte.couleur];
  const marge = Math.round(largeur * 0.03);
  const largeurImage = largeur - marge * 2;
  const hauteurImage = hauteur - marge * 2;
  const rayonImage = Math.max(RAYON_COIN - marge, 2);

  return (
    <View
      style={[
        faceStyles.conteneur,
        {
          width: largeur,
          height: hauteur,
          borderRadius: RAYON_COIN,
          padding: marge,
        },
      ]}
    >
      <Image
        source={imageCarte}
        style={{
          width: largeurImage,
          height: hauteurImage,
          borderRadius: rayonImage,
        }}
        resizeMode="cover"
      />
      {grisee && <View style={[faceStyles.overlayGris, { borderRadius: RAYON_COIN }]} />}
    </View>
  );
}

const faceStyles = StyleSheet.create({
  conteneur: {
    overflow: "hidden",
    backgroundColor: "#f0e8d4",
    borderWidth: 1.5,
    borderColor: "#b8a88a",
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
  },
  overlayGris: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
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
