import type { Carte, Couleur } from "@belote/shared-types";
import { StyleSheet, Text, View } from "react-native";

import type { AtlasCartes } from "../../hooks/useAtlasCartes";

const RAYON_COIN = 6;

const COULEURS_SYMBOLES: Record<Couleur, string> = {
  coeur: "#c41e3a",
  carreau: "#c41e3a",
  pique: "#1b1b2f",
  trefle: "#1b1b2f",
};

const SYMBOLES: Record<Couleur, string> = {
  coeur: "\u2665",
  carreau: "\u2666",
  pique: "\u2660",
  trefle: "\u2663",
};

const RANGS_AFFICHES: Record<Carte["rang"], string> = {
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  valet: "V",
  dame: "D",
  roi: "R",
  as: "A",
};

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

export function CarteDosAtlas({
  largeur,
  hauteur,
}: {
  atlas: AtlasCartes;
  largeur: number;
  hauteur: number;
}) {
  return <CarteDos largeur={largeur} hauteur={hauteur} />;
}

export function CarteFaceAtlas({
  carte,
  largeur,
  hauteur,
  grisee = false,
}: {
  atlas: AtlasCartes;
  carte: Carte;
  largeur: number;
  hauteur: number;
  grisee?: boolean;
}) {
  const couleur = COULEURS_SYMBOLES[carte.couleur];
  const symbole = SYMBOLES[carte.couleur];
  const rang = RANGS_AFFICHES[carte.rang];

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
      <View style={faceStyles.coinHaut}>
        <Text style={[faceStyles.rang, { color: couleur }]}>{rang}</Text>
        <Text style={[faceStyles.symboleCoin, { color: couleur }]}>{symbole}</Text>
      </View>

      <View style={faceStyles.centre}>
        <Text style={[faceStyles.symboleCentre, { color: couleur }]}>{symbole}</Text>
      </View>

      <View style={faceStyles.coinBas}>
        <Text style={[faceStyles.rang, { color: couleur }]}>{rang}</Text>
        <Text style={[faceStyles.symboleCoin, { color: couleur }]}>{symbole}</Text>
      </View>

      {grisee ? (
        <View style={[faceStyles.overlayGris, { borderRadius: RAYON_COIN }]} />
      ) : null}
    </View>
  );
}

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

const faceStyles = StyleSheet.create({
  carte: {
    backgroundColor: "#f6f0e4",
    borderWidth: 1.5,
    borderColor: "#d9c9a4",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  coinHaut: {
    position: "absolute",
    top: 8,
    left: 8,
    alignItems: "center",
  },
  coinBas: {
    position: "absolute",
    right: 8,
    bottom: 8,
    alignItems: "center",
    transform: [{ rotate: "180deg" }],
  },
  rang: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
  symboleCoin: {
    fontSize: 16,
    lineHeight: 16,
  },
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  symboleCentre: {
    fontSize: 42,
    opacity: 0.85,
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
